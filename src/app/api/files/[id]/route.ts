import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fileService } from '@/lib/services/file-service';
import { ApiError } from '@/lib/api/errors';
import { fileDownloadRateLimit, fileModificationRateLimit, fileDeletionRateLimit } from '@/lib/security/file-rate-limit';
import { z } from 'zod';

// Validation schema for file updates
const fileUpdateSchema = z.object({
  filename: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  isShared: z.boolean().optional(),
});

// Helper function to check file access permissions
async function checkFileAccess(
  supabase: any,
  fileId: string,
  userId: string,
  action: 'read' | 'write' | 'delete'
) {
  // Get file details with access check
  const { data: file, error } = await supabase
    .from('file_uploads')
    .select(`
      *,
      user:users!user_id (
        id, first_name, last_name, role
      ),
      file_shares!inner (
        permission_type,
        expires_at
      )
    `)
    .eq('id', fileId)
    .or(`user_id.eq.${userId},file_shares.shared_with.eq.${userId}`)
    .single();

  if (error || !file) {
    return { hasAccess: false, file: null, error: 'File not found' };
  }

  // Owner has full access
  if (file.user_id === userId) {
    return { hasAccess: true, file, error: null };
  }

  // Check shared access
  const share = file.file_shares?.find((share: any) => 
    share.shared_with === userId && 
    (!share.expires_at || new Date(share.expires_at) > new Date())
  );

  if (!share) {
    return { hasAccess: false, file: null, error: 'Access denied' };
  }

  // Check permission level
  switch (action) {
    case 'read':
      return { hasAccess: true, file, error: null };
    case 'write':
      if (share.permission_type === 'edit') {
        return { hasAccess: true, file, error: null };
      }
      return { hasAccess: false, file: null, error: 'Edit permission required' };
    case 'delete':
      // Only owner can delete
      return { hasAccess: false, file: null, error: 'Only file owner can delete' };
    default:
      return { hasAccess: false, file: null, error: 'Invalid action' };
  }
}

// GET /api/files/[id] - Get file details and download URL
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting for downloads
    const rateLimitResult = await fileDownloadRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { hasAccess, file, error: accessError } = await checkFileAccess(
      supabase,
      params.id,
      user.id,
      'read'
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: accessError },
        { status: accessError === 'File not found' ? 404 : 403 }
      );
    }

    // Increment download count
    await supabase.rpc('increment_file_download_count', {
      file_upload_id: file.id
    });

    // Generate download URL (signed URL for private files, public URL for public files)
    let downloadUrl: string;
    
    if (file.bucket_name === 'avatars') {
      // Public bucket - use public URL
      const { data } = supabase.storage
        .from(file.bucket_name)
        .getPublicUrl(file.storage_path);
      downloadUrl = data.publicUrl;
    } else {
      // Private bucket - create signed URL
      const signedUrl = await fileService.createSignedUrl(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${file.bucket_name}/${file.storage_path}`,
        3600 // 1 hour expiration
      );
      downloadUrl = signedUrl || '';
    }

    // Get file metadata from storage
    const metadata = await fileService.getFileMetadata(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${file.bucket_name}/${file.storage_path}`
    );

    return NextResponse.json({
      id: file.id,
      filename: file.filename,
      originalFilename: file.original_filename,
      fileType: file.file_type,
      fileSize: file.file_size,
      category: file.file_category,
      description: file.description,
      tags: file.tags,
      isShared: file.is_shared,
      downloadCount: file.download_count + 1, // Include the increment we just made
      downloadUrl,
      owner: {
        id: file.user.id,
        name: `${file.user.first_name} ${file.user.last_name || ''}`.trim(),
        role: file.user.role,
      },
      createdAt: file.created_at,
      updatedAt: file.updated_at,
      metadata: metadata,
    });

  } catch (error) {
    console.error('Get file error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/files/[id] - Update file metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting for modifications
    const rateLimitResult = await fileModificationRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { hasAccess, file, error: accessError } = await checkFileAccess(
      supabase,
      params.id,
      user.id,
      'write'
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: accessError },
        { status: accessError === 'File not found' ? 404 : 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = fileUpdateSchema.parse(body);

    // Update file metadata
    const updateData: any = {};
    
    if (validatedData.filename !== undefined) {
      updateData.filename = validatedData.filename;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.tags !== undefined) {
      updateData.tags = validatedData.tags;
    }
    if (validatedData.isShared !== undefined) {
      updateData.is_shared = validatedData.isShared;
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: updatedFile, error: updateError } = await supabase
      .from('file_uploads')
      .update(updateData)
      .eq('id', params.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Update file error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: updatedFile.id,
      filename: updatedFile.filename,
      description: updatedFile.description,
      tags: updatedFile.tags,
      isShared: updatedFile.is_shared,
      updatedAt: updatedFile.updated_at,
    });

  } catch (error) {
    console.error('Update file error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/files/[id] - Delete file and cleanup storage
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting for deletions
    const rateLimitResult = await fileDeletionRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { hasAccess, file, error: accessError } = await checkFileAccess(
      supabase,
      params.id,
      user.id,
      'delete'
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: accessError },
        { status: accessError === 'File not found' ? 404 : 403 }
      );
    }

    // Delete from storage first
    const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${file.bucket_name}/${file.storage_path}`;
    
    try {
      await fileService.deleteFile(storageUrl);
    } catch (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database (cascading deletes will handle file_shares and session_files)
    const { error: deleteError } = await supabase
      .from('file_uploads')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete file record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}