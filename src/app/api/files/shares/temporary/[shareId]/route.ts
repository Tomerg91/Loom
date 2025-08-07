import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { temporarySharesDatabase } from '@/lib/database/temporary-shares';
import { fileDatabase } from '@/lib/database/files';
import { fileModificationRateLimit } from '@/lib/security/file-rate-limit';
import { z } from 'zod';

// Validation schemas
const updateTemporaryShareSchema = z.object({
  description: z.string().max(500).optional(),
  expires_at: z.string().datetime().refine((date) => {
    const expiryDate = new Date(date);
    const now = new Date();
    const maxExpiry = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year max
    
    return expiryDate > now && expiryDate <= maxExpiry;
  }, {
    message: 'Expiry date must be in the future and within 1 year'
  }).optional(),
  max_downloads: z.number().int().min(1).max(10000).optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(4).max(100).nullable().optional(),
});

// GET /api/files/shares/temporary/[shareId] - Get specific temporary share details
export async function GET(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
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

    // Get the temporary share with details
    const share = await temporarySharesDatabase.getTemporaryShare(params.shareId);
    
    if (!share) {
      return NextResponse.json(
        { error: 'Temporary share not found' },
        { status: 404 }
      );
    }

    // Verify user owns the share
    if (share.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only view shares you created' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeLogs = searchParams.get('include_logs') === 'true';

    // Generate share URL
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const shareUrl = temporarySharesDatabase.generateShareUrl(share.share_token, baseUrl);

    // Get access logs if requested
    let accessLogs = null;
    if (includeLogs) {
      accessLogs = await temporarySharesDatabase.getShareAccessLogs(params.shareId, 50, 0);
    }

    return NextResponse.json({
      share: {
        id: share.id,
        share_token: share.share_token,
        share_url: shareUrl,
        expires_at: share.expires_at,
        max_downloads: share.max_downloads,
        current_downloads: share.current_downloads,
        description: share.description,
        is_active: share.is_active,
        password_protected: !!share.password_hash,
        created_at: share.created_at,
        updated_at: share.updated_at,
      },
      file: share.file ? {
        id: share.file.id,
        filename: share.file.filename,
        original_filename: share.file.original_filename,
        file_type: share.file.file_type,
        file_size: share.file.file_size,
      } : null,
      statistics: share.statistics,
      access_logs: accessLogs,
    });

  } catch (error) {
    console.error('Get temporary share error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/files/shares/temporary/[shareId] - Update temporary share
export async function PUT(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
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

    // Get the temporary share
    const existingShare = await temporarySharesDatabase.getTemporaryShare(params.shareId);
    
    if (!existingShare) {
      return NextResponse.json(
        { error: 'Temporary share not found' },
        { status: 404 }
      );
    }

    // Verify user owns the share
    if (existingShare.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only update shares you created' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateTemporaryShareSchema.parse(body);

    // Update the share
    const updatedShare = await temporarySharesDatabase.updateTemporaryShare(
      params.shareId,
      validatedData
    );

    // Generate share URL
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const shareUrl = temporarySharesDatabase.generateShareUrl(updatedShare.share_token, baseUrl);

    // Create notification if significant changes
    const significantChanges = [];
    if (validatedData.expires_at) significantChanges.push('expiry date');
    if (validatedData.is_active === false) significantChanges.push('deactivated');
    if (validatedData.password !== undefined) {
      significantChanges.push(validatedData.password ? 'password added' : 'password removed');
    }

    if (significantChanges.length > 0) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'file_share_updated',
        title: 'Temporary Share Updated',
        message: `Temporary share updated: ${significantChanges.join(', ')}`,
        data: {
          type: 'temporary_file_share',
          share_id: params.shareId,
          file_id: existingShare.file_id,
          changes: significantChanges,
        },
      });
    }

    return NextResponse.json({
      success: true,
      share: {
        id: updatedShare.id,
        share_token: updatedShare.share_token,
        share_url: shareUrl,
        expires_at: updatedShare.expires_at,
        max_downloads: updatedShare.max_downloads,
        current_downloads: updatedShare.current_downloads,
        description: updatedShare.description,
        is_active: updatedShare.is_active,
        password_protected: !!updatedShare.password_hash,
        created_at: updatedShare.created_at,
        updated_at: updatedShare.updated_at,
      },
      message: 'Temporary share updated successfully',
    });

  } catch (error) {
    console.error('Update temporary share error:', error);

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

// DELETE /api/files/shares/temporary/[shareId] - Delete temporary share
export async function DELETE(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
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

    // Get the temporary share
    const existingShare = await temporarySharesDatabase.getTemporaryShare(params.shareId);
    
    if (!existingShare) {
      return NextResponse.json(
        { error: 'Temporary share not found' },
        { status: 404 }
      );
    }

    // Verify user owns the share
    if (existingShare.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete shares you created' },
        { status: 403 }
      );
    }

    // Delete the share
    await temporarySharesDatabase.deleteTemporaryShare(params.shareId);

    // Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'file_share_deleted',
      title: 'Temporary Share Deleted',
      message: 'Temporary file share was deleted',
      data: {
        type: 'temporary_file_share',
        share_id: params.shareId,
        file_id: existingShare.file_id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Temporary share deleted successfully',
    });

  } catch (error) {
    console.error('Delete temporary share error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}