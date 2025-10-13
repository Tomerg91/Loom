import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { fileModificationRateLimit } from '@/lib/security/file-rate-limit';
import { fileManagementService } from '@/lib/services/file-management-service';
import { createClient } from '@/lib/supabase/server';


// Validation schemas
const bulkShareSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(50), // Limit to 50 files
  sharedWith: z.array(z.string().uuid()).min(1).max(10), // Limit to 10 users
  permissionType: z.enum(['view', 'download', 'edit']).default('view'),
  expiresAt: z.string().datetime().optional(),
  message: z.string().max(1000).optional(),
  notifyUsers: z.boolean().default(true),
});

const bulkRevokeSchema = z.object({
  shareIds: z.array(z.string().uuid()).min(1).max(100), // Limit to 100 shares
  notifyUsers: z.boolean().default(true),
  reason: z.string().max(500).optional(),
});

const bulkUpdateSchema = z.object({
  shareIds: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    permissionType: z.enum(['view', 'download', 'edit']).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  }),
  notifyUsers: z.boolean().default(false),
});

// Helper function to check coach-client relationship
async function checkCoachClientRelationship(
  supabase: any,
  userId1: string,
  userId2: string
): Promise<boolean> {
  // Get user roles
  const { data: users } = await supabase
    .from('users')
    .select('id, role')
    .in('id', [userId1, userId2]);

  if (!users || users.length !== 2) {
    return false;
  }

  const user1 = users.find((u: { id: string; role: string }) => u.id === userId1);
  const user2 = users.find((u: { id: string; role: string }) => u.id === userId2);

  // Admin can share with anyone
  if (user1?.role === 'admin' || user2?.role === 'admin') {
    return true;
  }

  // Check for coach-client relationship through sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .or(`and(coach_id.eq.${userId1},client_id.eq.${userId2}),and(coach_id.eq.${userId2},client_id.eq.${userId1})`)
    .limit(1);

  return sessions && sessions.length > 0;
}

/**
 * POST /api/files/share/bulk - Share multiple files with multiple users
 */
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
    const validatedData = bulkShareSchema.parse(body);

    // Verify user owns all files
    const fileChecks = await Promise.all(
      validatedData.fileIds.map(async (fileId) => {
        const fileResult = await fileManagementService.getFile(fileId, user.id);
        return {
          fileId,
          success: fileResult.success,
          file: fileResult.success ? fileResult.data : null,
          error: fileResult.success ? null : fileResult.error,
        };
      })
    );

    const ownedFiles = fileChecks.filter(fc => fc.success && fc.file?.userId === user.id);
    const unauthorizedFiles = fileChecks.filter(fc => !fc.success || fc.file?.userId !== user.id);

    if (unauthorizedFiles.length > 0) {
      return NextResponse.json(
        { 
          error: 'Access denied to some files',
          unauthorizedFiles: unauthorizedFiles.map(uf => ({
            fileId: uf.fileId,
            error: uf.error || 'Not owned by user'
          }))
        },
        { status: 403 }
      );
    }

    // Verify relationships with all target users
    const relationshipChecks = await Promise.all(
      validatedData.sharedWith.map(async (targetUserId) => {
        if (targetUserId === user.id) {
          return { userId: targetUserId, hasRelationship: false, error: 'Cannot share with yourself' };
        }

        const hasRelationship = await checkCoachClientRelationship(supabase, user.id, targetUserId);
        return { 
          userId: targetUserId, 
          hasRelationship,
          error: hasRelationship ? null : 'No coach-client relationship found'
        };
      })
    );

    const validUsers = relationshipChecks.filter(rc => rc.hasRelationship);
    const invalidUsers = relationshipChecks.filter(rc => !rc.hasRelationship);

    if (invalidUsers.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot share with some users',
          invalidUsers: invalidUsers.map(iu => ({
            userId: iu.userId,
            error: iu.error
          }))
        },
        { status: 400 }
      );
    }

    // Perform bulk sharing
    const shareResults = [];
    const shareErrors = [];

    for (const fileCheck of ownedFiles) {
      const file = fileCheck.file!;
      
      for (const userCheck of validUsers) {
        try {
          const shareResult = await fileManagementService.shareFile(
            file.id,
            user.id,
            {
              userId: userCheck.userId,
              permission: validatedData.permissionType,
              expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
            }
          );

          if (!shareResult.success) {
            shareErrors.push({
              fileId: file.id,
              userId: userCheck.userId,
              error: shareResult.error
            });
            continue;
          }

          shareResults.push({
            fileId: file.id,
            fileName: file.filename,
            userId: userCheck.userId,
            shareId: shareResult.data.id,
            permissionType: shareResult.data.permission_type,
            expiresAt: shareResult.data.expires_at,
          });

          // Create notification if enabled
          if (validatedData.notifyUsers) {
            await supabase.from('notifications').insert({
              user_id: userCheck.userId,
              type: 'new_message',
              title: 'Files Shared With You',
              message: `${ownedFiles.length} file(s) have been shared with you${validatedData.message ? ': ' + validatedData.message : ''}`,
              data: {
                type: 'bulk_files_shared',
                shared_by: user.id,
                file_count: ownedFiles.length,
                permission_type: validatedData.permissionType,
                expires_at: validatedData.expiresAt,
                custom_message: validatedData.message,
              },
            });
          }

        } catch (error) {
          shareErrors.push({
            fileId: file.id,
            userId: userCheck.userId,
            error: error instanceof Error ? error.message : 'Failed to create share'
          });
        }
      }
    }

    // Create activity log
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'system_update',
      title: 'Bulk File Sharing Completed',
      message: `Shared ${ownedFiles.length} file(s) with ${validUsers.length} user(s)`,
      data: {
        type: 'bulk_file_sharing_completed',
        files_shared: ownedFiles.length,
        users_shared_with: validUsers.length,
        successful_shares: shareResults.length,
        failed_shares: shareErrors.length,
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        filesProcessed: ownedFiles.length,
        usersSharedWith: validUsers.length,
        successfulShares: shareResults.length,
        failedShares: shareErrors.length,
      },
      shares: shareResults,
      errors: shareErrors.length > 0 ? shareErrors : undefined,
    });

  } catch (error) {
    console.error('Bulk file sharing error:', error);

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

/**
 * DELETE /api/files/share/bulk - Bulk revoke file shares
 */
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = bulkRevokeSchema.parse(body);

    // Get all shares to be revoked and verify ownership
    const { data: shares, error: sharesError } = await supabase
      .from('file_shares')
      .select(`
        *,
        file:file_uploads!file_id (id, filename),
        shared_with_user:users!shared_with (id, first_name, last_name)
      `)
      .in('id', validatedData.shareIds)
      .eq('shared_by', user.id); // Only shares created by current user

    if (sharesError) {
      return NextResponse.json(
        { error: 'Failed to fetch shares' },
        { status: 500 }
      );
    }

    const validShares = shares || [];
    const notFoundShares = validatedData.shareIds.filter(
      shareId => !validShares.find(share => share.id === shareId)
    );

    if (notFoundShares.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some shares not found or not owned by you',
          notFoundShares 
        },
        { status: 404 }
      );
    }

    // Bulk delete shares
    const { error: deleteError } = await supabase
      .from('file_shares')
      .delete()
      .in('id', validatedData.shareIds);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to revoke shares' },
        { status: 500 }
      );
    }

    // Create notifications for affected users if enabled
    if (validatedData.notifyUsers) {
      const notificationPromises = validShares.map(share =>
        supabase.from('notifications').insert({
          user_id: share.shared_with,
          type: 'system_update',
          title: 'File Access Revoked',
          message: `Access to "${share.file.filename}" has been revoked${validatedData.reason ? ': ' + validatedData.reason : ''}`,
          data: {
            type: 'file_access_revoked',
            file_id: share.file_id,
            revoked_by: user.id,
            reason: validatedData.reason,
          },
        })
      );

      await Promise.all(notificationPromises);
    }

    // Group results by user
    const affectedUsers = validShares.reduce((acc, share) => {
      const userId = share.shared_with;
      if (!acc[userId]) {
        acc[userId] = {
          user: {
            id: userId,
            name: `${share.shared_with_user.first_name} ${share.shared_with_user.last_name || ''}`.trim(),
          },
          revokedFiles: [],
        };
      }
      acc[userId].revokedFiles.push({
        fileId: share.file_id,
        fileName: share.file.filename,
        shareId: share.id,
      });
      return acc;
    }, {} as any);

    return NextResponse.json({
      success: true,
      summary: {
        sharesRevoked: validShares.length,
        affectedUsers: Object.keys(affectedUsers).length,
        affectedFiles: [...new Set(validShares.map(s => s.file_id))].length,
      },
      affectedUsers: Object.values(affectedUsers),
    });

  } catch (error) {
    console.error('Bulk revoke shares error:', error);

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

/**
 * PUT /api/files/share/bulk - Bulk update file share permissions
 */
export async function PUT(request: NextRequest) {
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
    const validatedData = bulkUpdateSchema.parse(body);

    // Verify all shares are owned by the user
    const { data: shares, error: sharesError } = await supabase
      .from('file_shares')
      .select(`
        *,
        file:file_uploads!file_id (id, filename),
        shared_with_user:users!shared_with (id, first_name, last_name)
      `)
      .in('id', validatedData.shareIds)
      .eq('shared_by', user.id);

    if (sharesError) {
      return NextResponse.json(
        { error: 'Failed to fetch shares' },
        { status: 500 }
      );
    }

    const validShares = shares || [];
    const notFoundShares = validatedData.shareIds.filter(
      shareId => !validShares.find(share => share.id === shareId)
    );

    if (notFoundShares.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some shares not found or not owned by you',
          notFoundShares 
        },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (validatedData.updates.permissionType) {
      updateData.permission_type = validatedData.updates.permissionType;
    }
    if (validatedData.updates.expiresAt !== undefined) {
      updateData.expires_at = validatedData.updates.expiresAt;
    }

    // Bulk update shares
    const { data: updatedShares, error: updateError } = await supabase
      .from('file_shares')
      .update(updateData)
      .in('id', validatedData.shareIds)
      .select();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update shares' },
        { status: 500 }
      );
    }

    // Create notifications for affected users if enabled
    if (validatedData.notifyUsers) {
      const changes: string[] = [];
      if (validatedData.updates.permissionType) {
        changes.push(`permission updated to ${validatedData.updates.permissionType}`);
      }
      if (validatedData.updates.expiresAt !== undefined) {
        changes.push(validatedData.updates.expiresAt ? `expiry date updated` : 'expiry date removed');
      }

      const notificationPromises = validShares.map(share =>
        supabase.from('notifications').insert({
          user_id: share.shared_with,
          type: 'system_update',
          title: 'File Sharing Updated',
          message: `File sharing settings for "${share.file.filename}" have been updated: ${changes.join(', ')}`,
          data: {
            type: 'file_sharing_updated',
            file_id: share.file_id,
            updated_by: user.id,
            changes: changes,
            new_permission: validatedData.updates.permissionType,
            new_expires_at: validatedData.updates.expiresAt,
          },
        })
      );

      await Promise.all(notificationPromises);
    }

    return NextResponse.json({
      success: true,
      summary: {
        sharesUpdated: updatedShares?.length || 0,
        affectedUsers: [...new Set(validShares.map(s => s.shared_with))].length,
        affectedFiles: [...new Set(validShares.map(s => s.file_id))].length,
      },
      changes: {
        permissionType: validatedData.updates.permissionType,
        expiresAt: validatedData.updates.expiresAt,
      },
      updatedShares: updatedShares?.map(share => ({
        shareId: share.id,
        fileId: share.file_id,
        sharedWith: share.shared_with,
        newPermission: share.permission_type,
        newExpiresAt: share.expires_at,
      })),
    });

  } catch (error) {
    console.error('Bulk update shares error:', error);

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