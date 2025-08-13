import { NextRequest, NextResponse } from 'next/server';
import { fileManagementService } from '@/lib/services/file-management-service';
import { authMiddleware } from '@/lib/auth/middleware';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/files/[id]/share - Share a file with another user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const paramsData = await params;
    
    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = authResult.data;
    const { id: fileId } = paramsData;
    
    const shareData = await request.json();
    const { userId: targetUserId, permission, expiresAt } = shareData;

    // Validate required fields
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      );
    }

    if (!['view', 'download', 'edit'].includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission. Must be view, download, or edit' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const supabase = await createClient();
    const { data: targetUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', targetUserId)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Share the file
    const shareOptions = {
      userId: targetUserId,
      permission: permission as 'view' | 'download' | 'edit',
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    };

    const result = await fileManagementService.shareFile(fileId, userId, shareOptions);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes('not found') ? 404 : 403 }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error(`POST /api/files/${id}/share error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/files/[id]/share - Get file sharing information
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = authResult.data;
    const { id: fileId } = await params;

    // Get file details including shares
    const fileResult = await fileManagementService.getFile(fileId, userId);
    if (!fileResult.success) {
      return NextResponse.json(
        { error: fileResult.error },
        { status: fileResult.error.includes('not found') ? 404 : 403 }
      );
    }

    // Only file owner can see sharing details
    if (fileResult.data.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only file owner can view sharing details' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { data: shares, error } = await supabase
      .from('file_shares')
      .select(`
        *,
        users!file_shares_shared_with_id_fkey(id, first_name, last_name, email)
      `)
      .eq('file_id', fileId)
      .eq('is_active', true);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to get sharing information' },
        { status: 500 }
      );
    }

    return NextResponse.json(shares || []);
  } catch (error) {
    console.error(`GET /api/files/${id}/share error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/[id]/share - Remove file sharing (revoke access)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = authResult.data;
    const { id: fileId } = await params;
    
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      );
    }

    // Verify file ownership
    const fileResult = await fileManagementService.getFile(fileId, userId);
    if (!fileResult.success) {
      return NextResponse.json(
        { error: fileResult.error },
        { status: fileResult.error.includes('not found') ? 404 : 403 }
      );
    }

    if (fileResult.data.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only file owner can revoke sharing' },
        { status: 403 }
      );
    }

    // Revoke sharing
    const supabase = await createClient();
    const { error } = await supabase
      .from('file_shares')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('file_id', fileId)
      .eq('shared_with_id', targetUserId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to revoke file sharing' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/files/${id}/share error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}