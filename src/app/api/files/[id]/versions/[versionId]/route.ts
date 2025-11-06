import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { fileVersionsDatabase } from '@/lib/database/file-versions';
import { fileDatabase } from '@/lib/database/files';
import { fileModificationRateLimit } from '@/lib/security/file-rate-limit';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';


// Validation schemas
const updateVersionSchema = z.object({
  description: z.string().max(1000).optional(),
  change_summary: z.string().max(500).optional(),
  is_major_version: z.boolean().optional(),
});

// GET /api/files/[id]/versions/[versionId] - Get specific version details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to the file
    const file = await fileDatabase.getFileUpload(id);
    
    // Check if user owns the file or it's shared with them
    if (file.user_id !== user.id) {
      const userShares = await fileDatabase.getFileShares(id, user.id);
      const hasFileAccess = userShares.some(share => 
        share.shared_with === user.id && 
        (!share.expires_at || new Date(share.expires_at) > new Date())
      );

      if (!hasFileAccess) {
        return NextResponse.json(
          { error: 'File not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Get specific version
    const version = await fileVersionsDatabase.getFileVersion(versionId);

    if (version.file_id !== id) {
      return NextResponse.json(
        { error: 'Version does not belong to this file' },
        { status: 400 }
      );
    }

    // Get download URL for the version
    const { data: urlData } = await supabase.storage
      .from('uploads')
      .createSignedUrl(version.storage_path, 3600); // 1 hour expiry

    return NextResponse.json({
      version: {
        id: version.id,
        version_number: version.version_number,
        filename: version.filename,
        file_type: version.file_type,
        file_size: version.file_size,
        description: version.description,
        change_summary: version.change_summary,
        is_major_version: version.is_major_version,
        is_current_version: version.is_current_version,
        created_by: version.created_by_user ? {
          id: version.created_by_user.id,
          name: `${version.created_by_user.first_name} ${version.created_by_user.last_name || ''}`.trim(),
        } : null,
        created_at: version.created_at,
        file_hash: version.file_hash,
      },
      download_url: urlData?.signedUrl,
    });

  } catch (error) {
    logger.error('Get file version error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/files/[id]/versions/[versionId] - Update version metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    
    // Apply rate limiting
    const rateLimitResult = await fileModificationRateLimit(request);
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

    // Verify user owns the file
    const file = await fileDatabase.getFileUpload(id);
    
    if (file.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only update versions for files you own' },
        { status: 403 }
      );
    }

    // Get and validate the version
    const version = await fileVersionsDatabase.getFileVersion(versionId);

    if (version.file_id !== id) {
      return NextResponse.json(
        { error: 'Version does not belong to this file' },
        { status: 400 }
      );
    }

    // Only allow the creator or file owner to update version metadata
    if (version.created_by !== user.id && file.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only update versions you created' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateVersionSchema.parse(body);

    // Update version
    const updatedVersion = await fileVersionsDatabase.updateFileVersion(
      versionId,
      validatedData
    );

    return NextResponse.json({
      success: true,
      version: {
        id: updatedVersion.id,
        version_number: updatedVersion.version_number,
        filename: updatedVersion.filename,
        file_type: updatedVersion.file_type,
        file_size: updatedVersion.file_size,
        description: updatedVersion.description,
        change_summary: updatedVersion.change_summary,
        is_major_version: updatedVersion.is_major_version,
        is_current_version: updatedVersion.is_current_version,
        created_at: updatedVersion.created_at,
      },
    });

  } catch (error) {
    logger.error('Update file version error:', error);

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
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/files/[id]/versions/[versionId] - Delete a version
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    
    // Apply rate limiting
    const rateLimitResult = await fileModificationRateLimit(request);
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

    // Verify user owns the file
    const file = await fileDatabase.getFileUpload(id);
    
    if (file.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete versions for files you own' },
        { status: 403 }
      );
    }

    // Get and validate the version
    const version = await fileVersionsDatabase.getFileVersion(versionId);

    if (version.file_id !== id) {
      return NextResponse.json(
        { error: 'Version does not belong to this file' },
        { status: 400 }
      );
    }

    // Cannot delete current version
    if (version.is_current_version) {
      return NextResponse.json(
        { error: 'Cannot delete the current version' },
        { status: 400 }
      );
    }

    // Only allow the creator or file owner to delete version
    if (version.created_by !== user.id && file.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete versions you created' },
        { status: 403 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('uploads')
      .remove([version.storage_path]);

    if (storageError) {
      logger.error('Failed to delete from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await fileVersionsDatabase.deleteFileVersion(versionId);

    return NextResponse.json({
      success: true,
      message: 'Version deleted successfully',
    });

  } catch (error) {
    logger.error('Delete file version error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}