import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fileManagementService } from '@/lib/services/file-management-service';
import { fileModificationRateLimit } from '@/lib/security/file-rate-limit';
import { z } from 'zod';

// Validation schemas
const shareFileSchema = z.object({
  fileId: z.string().uuid('Invalid file ID format'),
  sharedWith: z.array(z.string().uuid('Invalid user ID format')).min(1).max(10),
  permissionType: z.enum(['view', 'download', 'edit']).default('view'),
  expiresAt: z.string().datetime().optional(),
  message: z.string().max(500).optional(),
});

const getSharedFilesSchema = z.object({
  type: z.enum(['shared_by_me', 'shared_with_me', 'all']).default('all'),
  fileId: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const revokeShareSchema = z.object({
  shareId: z.string().uuid('Invalid share ID format'),
});

// Helper function to check coach-client relationship
async function checkCoachClientRelationship(
  supabase: any,
  userId1: string,
  userId2: string
): Promise<{ hasRelationship: boolean; userRole: string | null }> {
  // Get user roles
  const { data: users, error } = await supabase
    .from('users')
    .select('id, role')
    .in('id', [userId1, userId2]);

  if (error || !users || users.length !== 2) {
    return { hasRelationship: false, userRole: null };
  }

  const user1 = users.find(u => u.id === userId1);
  const user2 = users.find(u => u.id === userId2);

  if (!user1 || !user2) {
    return { hasRelationship: false, userRole: null };
  }

  // Admin can share with anyone
  if (user1.role === 'admin' || user2.role === 'admin') {
    return { hasRelationship: true, userRole: user1.role };
  }

  // Check if they have a coach-client relationship through sessions
  const { data: sessions, error: sessionError } = await supabase
    .from('sessions')
    .select('coach_id, client_id')
    .or(`and(coach_id.eq.${userId1},client_id.eq.${userId2}),and(coach_id.eq.${userId2},client_id.eq.${userId1})`);

  if (sessionError || !sessions || sessions.length === 0) {
    return { hasRelationship: false, userRole: user1.role };
  }

  return { hasRelationship: true, userRole: user1.role };
}

// POST /api/files/share - Share files with other users
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = shareFileSchema.parse(body);

    // Verify the user owns the file
    const fileResult = await fileManagementService.getFile(validatedData.fileId, user.id);
    
    if (!fileResult.success) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    const file = fileResult.data;
    
    if (file.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only share files you own' },
        { status: 403 }
      );
    }

    // Check coach-client relationships for all target users
    const shareResults = [];
    const shareErrors = [];

    for (const targetUserId of validatedData.sharedWith) {
      // Don't allow sharing with self
      if (targetUserId === user.id) {
        shareErrors.push({
          userId: targetUserId,
          error: 'Cannot share file with yourself'
        });
        continue;
      }

      // Check relationship
      const { hasRelationship } = await checkCoachClientRelationship(
        supabase,
        user.id,
        targetUserId
      );

      if (!hasRelationship) {
        shareErrors.push({
          userId: targetUserId,
          error: 'No coach-client relationship found'
        });
        continue;
      }

      try {
        // Create the file share
        const shareResult = await fileManagementService.shareFile(
          validatedData.fileId, 
          user.id, 
          {
            userId: targetUserId,
            permission: validatedData.permissionType,
            expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
          }
        );

        if (!shareResult.success) {
          shareErrors.push({
            userId: targetUserId,
            error: shareResult.error
          });
          continue;
        }

        const share = shareResult.data;

        // Get target user info
        const { data: targetUser } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('id', targetUserId)
          .single();

        shareResults.push({
          shareId: share.id,
          sharedWith: {
            id: targetUserId,
            name: targetUser ? `${targetUser.first_name} ${targetUser.last_name || ''}`.trim() : 'Unknown User',
          },
          permissionType: share.permission_type,
          expiresAt: share.expires_at,
        });

        // Create notification for the user receiving the file
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          type: 'new_message', // Using existing type, could create 'file_shared' type
          title: 'New File Shared',
          message: `${file.ownerName || 'Someone'} shared a file with you: ${file.filename}`,
          data: {
            type: 'file_shared',
            file_id: validatedData.fileId,
            shared_by: user.id,
            share_id: share.id,
            custom_message: validatedData.message,
          },
        });

      } catch (error) {
        console.error('Error creating share for user:', targetUserId, error);
        shareErrors.push({
          userId: targetUserId,
          error: error instanceof Error ? error.message : 'Failed to create share'
        });
      }
    }

    // File is already marked as shared by the fileManagementService.shareFile method

    return NextResponse.json({
      success: true,
      sharesCreated: shareResults.length,
      shares: shareResults,
      errors: shareErrors.length > 0 ? shareErrors : undefined,
    });

  } catch (error) {
    console.error('File sharing error:', error);

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

// GET /api/files/share - Get file shares (shared by user or shared with user)
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type') || 'all',
      fileId: searchParams.get('fileId'),
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const validatedQuery = getSharedFilesSchema.parse(queryParams);

    // Get file shares based on type
    let shares;

    switch (validatedQuery.type) {
      case 'shared_by_me':
        shares = await supabase
          .from('file_shares')
          .select(`
            *,
            file:file_uploads!file_id (
              id, filename, file_type, file_size, description
            ),
            shared_with_user:users!shared_with (
              id, first_name, last_name, role
            )
          `)
          .eq('shared_by', user.id)
          .or('expires_at.is.null,expires_at.gt.now()')
          .order('created_at', { ascending: false })
          .range(validatedQuery.offset, validatedQuery.offset + validatedQuery.limit - 1);
        break;

      case 'shared_with_me':
        shares = await supabase
          .from('file_shares')
          .select(`
            *,
            file:file_uploads!file_id (
              id, filename, file_type, file_size, description
            ),
            shared_by_user:users!shared_by (
              id, first_name, last_name, role
            )
          `)
          .eq('shared_with', user.id)
          .or('expires_at.is.null,expires_at.gt.now()')
          .order('created_at', { ascending: false })
          .range(validatedQuery.offset, validatedQuery.offset + validatedQuery.limit - 1);
        break;

      case 'all':
      default:
        shares = await supabase
          .from('file_shares')
          .select(`
            *,
            file:file_uploads!file_id (
              id, filename, file_type, file_size, description
            ),
            shared_by_user:users!shared_by (
              id, first_name, last_name, role
            ),
            shared_with_user:users!shared_with (
              id, first_name, last_name, role
            )
          `)
          .or(`shared_by.eq.${user.id},shared_with.eq.${user.id}`)
          .or('expires_at.is.null,expires_at.gt.now()')
          .order('created_at', { ascending: false })
          .range(validatedQuery.offset, validatedQuery.offset + validatedQuery.limit - 1);
        break;
    }

    if (shares.error) {
      throw new Error(`Failed to get file shares: ${shares.error.message}`);
    }

    // Format response
    const formattedShares = shares.data.map(share => ({
      id: share.id,
      file: {
        id: share.file.id,
        filename: share.file.filename,
        fileType: share.file.file_type,
        fileSize: share.file.file_size,
        description: share.file.description,
      },
      sharedBy: share.shared_by_user ? {
        id: share.shared_by_user.id,
        name: `${share.shared_by_user.first_name} ${share.shared_by_user.last_name || ''}`.trim(),
        role: share.shared_by_user.role,
      } : null,
      sharedWith: share.shared_with_user ? {
        id: share.shared_with_user.id,
        name: `${share.shared_with_user.first_name} ${share.shared_with_user.last_name || ''}`.trim(),
        role: share.shared_with_user.role,
      } : null,
      permissionType: share.permission_type,
      accessCount: share.access_count,
      lastAccessedAt: share.last_accessed_at,
      expiresAt: share.expires_at,
      createdAt: share.created_at,
      isOwner: share.shared_by === user.id,
    }));

    return NextResponse.json({
      shares: formattedShares,
      count: formattedShares.length,
      hasMore: formattedShares.length === validatedQuery.limit,
    });

  } catch (error) {
    console.error('Get file shares error:', error);

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

// DELETE /api/files/share - Revoke file sharing access
export async function DELETE(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const validatedData = revokeShareSchema.parse(body);

    // Verify the user owns the share
    const { data: share, error: shareError } = await supabase
      .from('file_shares')
      .select(`
        *,
        file:file_uploads!file_id (
          id, filename, user_id
        ),
        shared_with_user:users!shared_with (
          id, first_name, last_name
        )
      `)
      .eq('id', validatedData.shareId)
      .single();

    if (shareError || !share) {
      return NextResponse.json(
        { error: 'File share not found' },
        { status: 404 }
      );
    }

    // Only the person who shared the file can revoke it
    if (share.shared_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only revoke shares you created' },
        { status: 403 }
      );
    }

    // Delete the share
    const { error: deleteError } = await supabase
      .from('file_shares')
      .delete()
      .eq('id', validatedData.shareId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to revoke file share' },
        { status: 500 }
      );
    }

    // Create notification for the user who lost access
    await supabase.from('notifications').insert({
      user_id: share.shared_with,
      type: 'system_update',
      title: 'File Access Revoked',
      message: `Access to "${share.file.filename}" has been revoked`,
      data: {
        type: 'file_access_revoked',
        file_id: share.file_id,
        revoked_by: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'File sharing access revoked successfully',
      revokedFor: {
        id: share.shared_with_user.id,
        name: `${share.shared_with_user.first_name} ${share.shared_with_user.last_name || ''}`.trim(),
      },
    });

  } catch (error) {
    console.error('Revoke file share error:', error);

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