import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { temporarySharesDatabase } from '@/lib/database/temporary-shares';
import { fileModificationRateLimit } from '@/lib/security/file-rate-limit';
import { fileManagementService } from '@/lib/services/file-management-service';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';


// Validation schema for creating temporary share
const createTemporaryShareSchema = z.object({
  file_id: z.string().uuid(),
  description: z.string().max(500).optional(),
  expires_at: z.string().datetime().optional().refine((date) => {
    if (!date) return true;
    const expiryDate = new Date(date);
    const now = new Date();
    const maxExpiry = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year max
    
    return expiryDate > now && expiryDate <= maxExpiry;
  }, {
    message: 'Expiry date must be in the future and within 1 year'
  }),
  max_downloads: z.number().int().min(1).max(10000).optional(),
  password: z.string().min(4).max(100).optional(),
  notify_on_access: z.boolean().default(false),
});

// Validation schema for listing temporary shares
const listTemporarySharesSchema = z.object({
  file_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  expired_only: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  sort_by: z.enum(['created_at', 'expires_at', 'current_downloads']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * POST /api/files/shares/temporary - Create a new temporary share
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
    const validatedData = createTemporaryShareSchema.parse(body);

    // Verify file exists and user has access
    const fileResult = await fileManagementService.getFile(validatedData.file_id, user.id);
    if (!fileResult.success) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    const file = fileResult.data;

    // Check if user owns the file or has sharing permission
    if (file.userId !== user.id) {
      // Check if file is shared with user and they have edit permission
      const { data: share } = await supabase
        .from('file_shares')
        .select('permission_type')
        .eq('file_id', validatedData.file_id)
        .eq('shared_with', user.id)
        .eq('permission_type', 'edit')
        .maybeSingle();

      if (!share) {
        return NextResponse.json(
          { error: 'You can only create temporary shares for files you own or have edit access to' },
          { status: 403 }
        );
      }
    }

    // Generate share token
    const shareToken = uuidv4().replace(/-/g, '');

    // Hash password if provided
    let passwordHash = null;
    if (validatedData.password) {
      passwordHash = await bcrypt.hash(validatedData.password, 10);
    }

    // Set default expiry (7 days from now)
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);

    const expiresAt = validatedData.expires_at ? 
      new Date(validatedData.expires_at) : defaultExpiry;

    // Create temporary share in database
    const { data: temporaryShare, error: insertError } = await supabase
      .from('temporary_shares')
      .insert({
        file_id: validatedData.file_id,
        share_token: shareToken,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        max_downloads: validatedData.max_downloads || 100,
        description: validatedData.description,
        password_hash: passwordHash,
        notify_on_access: validatedData.notify_on_access,
        is_active: true,
        current_downloads: 0,
      })
      .select('*')
      .single();

    if (insertError) {
      logger.error('Error creating temporary share:', insertError);
      return NextResponse.json(
        { error: 'Failed to create temporary share' },
        { status: 500 }
      );
    }

    // Generate share URL
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/${shareToken}`;

    // Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'file_share_created',
      title: 'Temporary Share Created',
      message: `Temporary share created for file: ${file.filename}`,
      data: {
        type: 'temporary_file_share',
        share_id: temporaryShare.id,
        file_id: validatedData.file_id,
        share_url: shareUrl,
        expires_at: expiresAt.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      share: {
        id: temporaryShare.id,
        share_token: temporaryShare.share_token,
        share_url: shareUrl,
        expires_at: temporaryShare.expires_at,
        max_downloads: temporaryShare.max_downloads,
        current_downloads: temporaryShare.current_downloads,
        description: temporaryShare.description,
        is_active: temporaryShare.is_active,
        password_protected: !!passwordHash,
        notify_on_access: temporaryShare.notify_on_access,
        created_at: temporaryShare.created_at,
      },
      file: {
        id: file.id,
        filename: file.filename,
        file_type: file.fileType,
        file_size: file.fileSize,
      },
      message: 'Temporary share created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Create temporary share error:', error);

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
 * GET /api/files/shares/temporary - List user's temporary shares
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      file_id: searchParams.get('file_id') || undefined,
      is_active: searchParams.get('is_active') ? searchParams.get('is_active') === 'true' : undefined,
      expired_only: searchParams.get('expired_only') === 'true',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sort_by: searchParams.get('sort_by') as any || 'created_at',
      sort_order: searchParams.get('sort_order') as any || 'desc',
    };

    const validatedParams = listTemporarySharesSchema.parse(queryParams);

    // Build query
    let query = supabase
      .from('temporary_shares')
      .select(`
        *,
        file_uploads!temporary_shares_file_id_fkey(
          id,
          filename,
          original_filename,
          file_type,
          file_size,
          file_category
        )
      `)
      .eq('created_by', user.id);

    // Apply filters
    if (validatedParams.file_id) {
      query = query.eq('file_id', validatedParams.file_id);
    }

    if (validatedParams.is_active !== undefined) {
      query = query.eq('is_active', validatedParams.is_active);
    }

    if (validatedParams.expired_only) {
      query = query.lt('expires_at', new Date().toISOString());
    } else {
      // Default to showing only non-expired shares unless specifically requested
      query = query.gt('expires_at', new Date().toISOString());
    }

    // Apply sorting
    query = query.order(validatedParams.sort_by, { 
      ascending: validatedParams.sort_order === 'asc' 
    });

    // Apply pagination
    query = query.range(validatedParams.offset, validatedParams.offset + validatedParams.limit - 1);

    const { data: shares, error: sharesError, count } = await query;

    if (sharesError) {
      logger.error('Error fetching temporary shares:', sharesError);
      return NextResponse.json(
        { error: 'Failed to fetch temporary shares' },
        { status: 500 }
      );
    }

    // Get total count
    let countQuery = supabase
      .from('temporary_shares')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id);

    if (validatedParams.file_id) {
      countQuery = countQuery.eq('file_id', validatedParams.file_id);
    }
    if (validatedParams.is_active !== undefined) {
      countQuery = countQuery.eq('is_active', validatedParams.is_active);
    }
    if (validatedParams.expired_only) {
      countQuery = countQuery.lt('expires_at', new Date().toISOString());
    } else {
      countQuery = countQuery.gt('expires_at', new Date().toISOString());
    }

    const { count: totalCount } = await countQuery;

    // Generate share URLs and format response
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const formattedShares = shares?.map(share => ({
      id: share.id,
      share_token: share.share_token,
      share_url: `${baseUrl}/share/${share.share_token}`,
      expires_at: share.expires_at,
      max_downloads: share.max_downloads,
      current_downloads: share.current_downloads,
      description: share.description,
      is_active: share.is_active,
      password_protected: !!share.password_hash,
      notify_on_access: share.notify_on_access,
      created_at: share.created_at,
      updated_at: share.updated_at,
      file: share.file_uploads ? {
        id: share.file_uploads.id,
        filename: share.file_uploads.filename,
        file_type: share.file_uploads.file_type,
        file_size: share.file_uploads.file_size,
        file_category: share.file_uploads.file_category,
      } : null,
      // Calculate status
      is_expired: new Date(share.expires_at) <= new Date(),
      is_exhausted: share.current_downloads >= share.max_downloads,
    })) || [];

    return NextResponse.json({
      shares: formattedShares,
      pagination: {
        total: totalCount || 0,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        has_more: (validatedParams.offset + validatedParams.limit) < (totalCount || 0),
      },
      statistics: {
        total_shares: totalCount || 0,
        active_shares: formattedShares.filter(s => s.is_active && !s.is_expired && !s.is_exhausted).length,
        expired_shares: formattedShares.filter(s => s.is_expired).length,
        exhausted_shares: formattedShares.filter(s => s.is_exhausted).length,
      },
    });

  } catch (error) {
    logger.error('List temporary shares error:', error);

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
 * DELETE /api/files/shares/temporary - Bulk delete temporary shares
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

    // Parse request body
    const body = await request.json();
    const { share_ids, delete_expired_only } = body;

    if (delete_expired_only) {
      // Delete all expired shares for the user
      const { error: deleteError, count } = await supabase
        .from('temporary_shares')
        .delete({ count: 'exact' })
        .eq('created_by', user.id)
        .lt('expires_at', new Date().toISOString());

      if (deleteError) {
        logger.error('Error deleting expired shares:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete expired shares' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        deleted_count: count || 0,
        message: `${count || 0} expired shares deleted successfully`,
      });
    }

    if (!share_ids || !Array.isArray(share_ids) || share_ids.length === 0) {
      return NextResponse.json(
        { error: 'share_ids array is required' },
        { status: 400 }
      );
    }

    // Validate all share IDs belong to the user
    const { data: userShares, error: validateError } = await supabase
      .from('temporary_shares')
      .select('id')
      .eq('created_by', user.id)
      .in('id', share_ids);

    if (validateError) {
      logger.error('Error validating shares:', validateError);
      return NextResponse.json(
        { error: 'Failed to validate shares' },
        { status: 500 }
      );
    }

    const validShareIds = userShares?.map(s => s.id) || [];
    const invalidShareIds = share_ids.filter(id => !validShareIds.includes(id));

    if (invalidShareIds.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some shares not found or not owned by you',
          invalid_ids: invalidShareIds 
        },
        { status: 400 }
      );
    }

    // Delete the shares
    const { error: deleteError, count } = await supabase
      .from('temporary_shares')
      .delete({ count: 'exact' })
      .in('id', validShareIds);

    if (deleteError) {
      logger.error('Error deleting shares:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete shares' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_count: count || 0,
      message: `${count || 0} shares deleted successfully`,
    });

  } catch (error) {
    logger.error('Bulk delete temporary shares error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}