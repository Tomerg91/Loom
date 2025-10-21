import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { fileUploadRateLimit } from '@/lib/security/file-rate-limit';
import { fileService } from '@/lib/services/file-service';
import { createClient } from '@/lib/supabase/server';


// Validation schema for chunked upload initialization
const chunkedUploadInitSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().min(1),
  fileType: z.string().min(1),
  totalChunks: z.number().int().min(1),
  chunkSize: z.number().int().min(1024).max(5 * 1024 * 1024), // 1KB to 5MB chunks
  directory: z.enum(['avatars', 'documents', 'uploads', 'sessions']).default('uploads'),
  sessionId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  category: z.enum(['preparation', 'notes', 'recording', 'resource', 'personal', 'avatar', 'document']).default('document'),
});

// Validation schema for chunk upload
const chunkUploadSchema = z.object({
  uploadId: z.string().uuid(),
  chunkIndex: z.number().int().min(0),
  chunkHash: z.string().optional(), // For integrity verification
});

// In-memory store for chunked uploads (in production, use Redis or database)
const chunkedUploads = new Map<string, {
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  chunkSize: number;
  directory: string;
  sessionId?: string;
  description?: string;
  tags?: string[];
  category: string;
  receivedChunks: Set<number>;
  chunks: Map<number, Buffer>;
  createdAt: Date;
  lastActivity: Date;
}>();

// Clean up expired chunked uploads (run periodically)
setInterval(() => {
  const now = new Date();
  const expiryTime = 2 * 60 * 60 * 1000; // 2 hours

  for (const [uploadId, upload] of chunkedUploads.entries()) {
    if (now.getTime() - upload.lastActivity.getTime() > expiryTime) {
      chunkedUploads.delete(uploadId);
    }
  }
}, 15 * 60 * 1000); // Clean up every 15 minutes

/**
 * POST /api/files/upload/chunked - Initialize chunked upload or upload chunk
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await fileUploadRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'chunk';

    if (action === 'init') {
      return handleChunkedUploadInit(request, user.id);
    } else if (action === 'chunk') {
      return handleChunkUpload(request, user.id);
    } else if (action === 'complete') {
      return handleChunkedUploadComplete(request, user.id);
    } else if (action === 'abort') {
      return handleChunkedUploadAbort(request, user.id);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use init, chunk, complete, or abort' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Chunked upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Initialize chunked upload session
 */
async function handleChunkedUploadInit(request: NextRequest, userId: string) {
  const body = await request.json();
  const validatedData = chunkedUploadInitSchema.parse(body);

  // Validate file type and size
  const validation = fileService.validateFile(
    { 
      name: validatedData.fileName, 
      size: validatedData.fileSize, 
      type: validatedData.fileType 
    } as File,
    {
      maxSize: 500 * 1024 * 1024, // 500MB for chunked uploads
      allowedTypes: ['image/*', 'video/*', 'audio/*', 'application/*', 'text/*']
    }
  );

  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  // Check session permissions if sessionId provided
  if (validatedData.sessionId) {
    const supabase = await createClient();
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('coach_id, client_id')
      .eq('id', validatedData.sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.coach_id !== userId && session.client_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to upload files to this session' },
        { status: 403 }
      );
    }
  }

  // Create upload session
  const uploadId = uuidv4();
  const now = new Date();

  chunkedUploads.set(uploadId, {
    userId,
    fileName: validatedData.fileName,
    fileSize: validatedData.fileSize,
    fileType: validatedData.fileType,
    totalChunks: validatedData.totalChunks,
    chunkSize: validatedData.chunkSize,
    directory: validatedData.directory,
    sessionId: validatedData.sessionId,
    description: validatedData.description,
    tags: validatedData.tags,
    category: validatedData.category,
    receivedChunks: new Set(),
    chunks: new Map(),
    createdAt: now,
    lastActivity: now,
  });

  return NextResponse.json({
    uploadId,
    chunkSize: validatedData.chunkSize,
    totalChunks: validatedData.totalChunks,
    message: 'Chunked upload initialized successfully'
  });
}

/**
 * Upload a file chunk
 */
async function handleChunkUpload(request: NextRequest, userId: string) {
  const formData = await request.formData();
  const chunk = formData.get('chunk') as File;
  const metadata = formData.get('metadata') as string;

  if (!chunk || !metadata) {
    return NextResponse.json(
      { error: 'Missing chunk or metadata' },
      { status: 400 }
    );
  }

  let parsedMetadata;
  try {
    parsedMetadata = JSON.parse(metadata);
  } catch {
    return NextResponse.json(
      { error: 'Invalid metadata JSON' },
      { status: 400 }
    );
  }

  const validatedMetadata = chunkUploadSchema.parse(parsedMetadata);
  
  // Get upload session
  const uploadSession = chunkedUploads.get(validatedMetadata.uploadId);
  if (!uploadSession) {
    return NextResponse.json(
      { error: 'Upload session not found or expired' },
      { status: 404 }
    );
  }

  // Verify ownership
  if (uploadSession.userId !== userId) {
    return NextResponse.json(
      { error: 'Unauthorized access to upload session' },
      { status: 403 }
    );
  }

  // Validate chunk index
  if (validatedMetadata.chunkIndex >= uploadSession.totalChunks) {
    return NextResponse.json(
      { error: 'Invalid chunk index' },
      { status: 400 }
    );
  }

  // Convert chunk to buffer
  const chunkBuffer = Buffer.from(await chunk.arrayBuffer());

  // Store chunk
  uploadSession.chunks.set(validatedMetadata.chunkIndex, chunkBuffer);
  uploadSession.receivedChunks.add(validatedMetadata.chunkIndex);
  uploadSession.lastActivity = new Date();

  const progress = Math.round((uploadSession.receivedChunks.size / uploadSession.totalChunks) * 100);

  return NextResponse.json({
    chunkIndex: validatedMetadata.chunkIndex,
    received: true,
    progress,
    totalChunks: uploadSession.totalChunks,
    receivedChunks: uploadSession.receivedChunks.size,
    message: `Chunk ${validatedMetadata.chunkIndex + 1}/${uploadSession.totalChunks} received`
  });
}

/**
 * Complete chunked upload by assembling chunks
 */
async function handleChunkedUploadComplete(request: NextRequest, userId: string) {
  const body = await request.json();
  const { uploadId } = body;

  if (!uploadId) {
    return NextResponse.json(
      { error: 'Upload ID is required' },
      { status: 400 }
    );
  }

  // Get upload session
  const uploadSession = chunkedUploads.get(uploadId);
  if (!uploadSession) {
    return NextResponse.json(
      { error: 'Upload session not found or expired' },
      { status: 404 }
    );
  }

  // Verify ownership
  if (uploadSession.userId !== userId) {
    return NextResponse.json(
      { error: 'Unauthorized access to upload session' },
      { status: 403 }
    );
  }

  // Verify all chunks received
  if (uploadSession.receivedChunks.size !== uploadSession.totalChunks) {
    return NextResponse.json(
      { error: `Missing chunks. Received ${uploadSession.receivedChunks.size}/${uploadSession.totalChunks}` },
      { status: 400 }
    );
  }

  try {
    // Assemble file from chunks
    const fileBuffers: Buffer[] = [];
    for (let i = 0; i < uploadSession.totalChunks; i++) {
      const chunkBuffer = uploadSession.chunks.get(i);
      if (!chunkBuffer) {
        return NextResponse.json(
          { error: `Missing chunk ${i}` },
          { status: 400 }
        );
      }
      fileBuffers.push(chunkBuffer);
    }

    const completeFile = Buffer.concat(fileBuffers);

    // Verify file size
    if (completeFile.length !== uploadSession.fileSize) {
      return NextResponse.json(
        { error: 'File size mismatch after assembly' },
        { status: 400 }
      );
    }

    // Create File object for upload
    const file = new File([completeFile], uploadSession.fileName, {
      type: uploadSession.fileType
    });

    // Upload assembled file to storage
    const uploadResult = await fileService.uploadFile(file, {
      directory: uploadSession.directory,
      userId: uploadSession.userId,
    });

    if (!uploadResult.success) {
      return NextResponse.json(
        { 
          error: uploadResult.error,
          retryable: uploadResult.retryable 
        },
        { status: 500 }
      );
    }

    // Store file metadata in database
    const supabase = await createClient();
    
    // Extract storage path from URL for database storage
    const url = new URL(uploadResult.url!);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf('public') + 1;
    const bucketName = pathParts[bucketIndex];
    const storagePath = pathParts.slice(bucketIndex + 1).join('/');

    const { data: fileRecord, error: dbError } = await supabase
      .from('file_uploads')
      .insert({
        user_id: uploadSession.userId,
        session_id: uploadSession.sessionId || null,
        filename: uploadSession.fileName,
        original_filename: uploadSession.fileName,
        storage_path: storagePath,
        file_type: uploadSession.fileType,
        file_size: uploadSession.fileSize,
        file_category: uploadSession.category,
        bucket_name: bucketName,
        description: uploadSession.description || null,
        tags: uploadSession.tags || [],
        is_shared: false,
      })
      .select('id, filename, file_type, file_size, created_at')
      .single();

    if (dbError) {
      console.error('Database error storing file metadata:', dbError);
      
      // Clean up uploaded file
      try {
        await fileService.deleteFile(uploadResult.url!);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }

      return NextResponse.json(
        { error: 'Failed to store file metadata' },
        { status: 500 }
      );
    }

    // Create session-file association if needed
    if (uploadSession.sessionId) {
      const { error: sessionFileError } = await supabase
        .from('session_files')
        .insert({
          session_id: uploadSession.sessionId,
          file_id: fileRecord.id,
          file_category: uploadSession.category,
          uploaded_by: uploadSession.userId,
          is_required: false,
        });

      if (sessionFileError) {
        console.error('Error creating session-file association:', sessionFileError);
      }
    }

    // Clean up upload session
    chunkedUploads.delete(uploadId);

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        fileType: fileRecord.file_type,
        fileSize: fileRecord.file_size,
        url: uploadResult.url,
        createdAt: fileRecord.created_at,
      },
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Error completing chunked upload:', error);
    
    // Clean up upload session
    chunkedUploads.delete(uploadId);

    return NextResponse.json(
      { error: 'Failed to complete chunked upload' },
      { status: 500 }
    );
  }
}

/**
 * Abort chunked upload and clean up
 */
async function handleChunkedUploadAbort(request: NextRequest, userId: string) {
  const body = await request.json();
  const { uploadId } = body;

  if (!uploadId) {
    return NextResponse.json(
      { error: 'Upload ID is required' },
      { status: 400 }
    );
  }

  // Get upload session
  const uploadSession = chunkedUploads.get(uploadId);
  if (!uploadSession) {
    return NextResponse.json(
      { error: 'Upload session not found or expired' },
      { status: 404 }
    );
  }

  // Verify ownership
  if (uploadSession.userId !== userId) {
    return NextResponse.json(
      { error: 'Unauthorized access to upload session' },
      { status: 403 }
    );
  }

  // Clean up upload session
  chunkedUploads.delete(uploadId);

  return NextResponse.json({
    success: true,
    message: 'Chunked upload aborted successfully'
  });
}

/**
 * GET /api/files/upload/chunked - Get upload status
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const uploadId = url.searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      );
    }

    // Get upload session
    const uploadSession = chunkedUploads.get(uploadId);
    if (!uploadSession) {
      return NextResponse.json(
        { error: 'Upload session not found or expired' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (uploadSession.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to upload session' },
        { status: 403 }
      );
    }

    const progress = Math.round((uploadSession.receivedChunks.size / uploadSession.totalChunks) * 100);

    return NextResponse.json({
      uploadId,
      fileName: uploadSession.fileName,
      fileSize: uploadSession.fileSize,
      totalChunks: uploadSession.totalChunks,
      receivedChunks: uploadSession.receivedChunks.size,
      progress,
      missingChunks: Array.from(
        { length: uploadSession.totalChunks }, 
        (_, i) => i
      ).filter(i => !uploadSession.receivedChunks.has(i)),
      createdAt: uploadSession.createdAt,
      lastActivity: uploadSession.lastActivity,
    });

  } catch (error) {
    console.error('Get chunked upload status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}