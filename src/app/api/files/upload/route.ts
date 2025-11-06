import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError } from '@/lib/api/errors';
import { fileUploadRateLimit } from '@/lib/security/file-rate-limit';
import { fileService } from '@/lib/services/file-service';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';


// Validation schema for file upload
const fileUploadSchema = z.object({
  directory: z.enum(['avatars', 'documents', 'uploads', 'sessions']).default('uploads'),
  sessionId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  category: z.enum(['preparation', 'notes', 'recording', 'resource', 'personal', 'avatar', 'document']).default('document'),
  isShared: z.boolean().default(false),
});

// File type configurations
const FILE_TYPE_CONFIGS = {
  avatars: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  documents: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
    ],
  },
  uploads: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: [
      'image/*',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  sessions: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      'application/pdf',
      'image/*',
      'audio/mpeg',
      'audio/wav',
      'video/mp4',
      'video/webm',
    ],
  },
};

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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse and validate metadata
    let parsedMetadata;
    try {
      parsedMetadata = metadata ? JSON.parse(metadata) : {};
    } catch {
      return NextResponse.json(
        { error: 'Invalid metadata JSON' },
        { status: 400 }
      );
    }

    const validatedMetadata = fileUploadSchema.parse(parsedMetadata);

    // Get file type configuration
    const typeConfig = FILE_TYPE_CONFIGS[validatedMetadata.directory];

    // Validate file
    const validation = fileService.validateFile(file, {
      maxSize: typeConfig.maxSize,
      allowedTypes: typeConfig.allowedTypes,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check session permissions if sessionId provided
    if (validatedMetadata.sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('coach_id, client_id')
        .eq('id', validatedMetadata.sessionId)
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      if (session.coach_id !== user.id && session.client_id !== user.id) {
        return NextResponse.json(
          { error: 'Not authorized to upload files to this session' },
          { status: 403 }
        );
      }
    }

    // Upload file to storage
    const uploadResult = await fileService.uploadFile(file, {
      directory: validatedMetadata.directory,
      userId: user.id,
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

    // Extract storage path from URL for database storage
    const url = new URL(uploadResult.url!);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf('public') + 1;
    const bucketName = pathParts[bucketIndex];
    const storagePath = pathParts.slice(bucketIndex + 1).join('/');

    // Store file metadata in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('file_uploads')
      .insert({
        user_id: user.id,
        session_id: validatedMetadata.sessionId || null,
        filename: file.name,
        original_filename: file.name,
        storage_path: storagePath,
        file_type: file.type,
        file_size: file.size,
        file_category: validatedMetadata.category,
        bucket_name: bucketName,
        description: validatedMetadata.description || null,
        tags: validatedMetadata.tags || [],
        is_shared: validatedMetadata.isShared,
      })
      .select('id, filename, file_type, file_size, created_at')
      .single();

    if (dbError) {
      logger.error('Database error storing file metadata:', dbError);
      
      // Clean up uploaded file if database insert fails
      try {
        await fileService.deleteFile(uploadResult.url!);
      } catch (cleanupError) {
        logger.error('Failed to clean up uploaded file:', cleanupError);
      }

      return NextResponse.json(
        { error: 'Failed to store file metadata' },
        { status: 500 }
      );
    }

    // If this is a session file, create the session-file association
    if (validatedMetadata.sessionId) {
      const { error: sessionFileError } = await supabase
        .from('session_files')
        .insert({
          session_id: validatedMetadata.sessionId,
          file_id: fileRecord.id,
          file_category: validatedMetadata.category,
          uploaded_by: user.id,
          is_required: false,
        });

      if (sessionFileError) {
        logger.error('Error creating session-file association:', sessionFileError);
        // Don't fail the entire upload for this, but log the error
      }
    }

    // Return success response
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
    });

  } catch (error) {
    logger.error('File upload error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}