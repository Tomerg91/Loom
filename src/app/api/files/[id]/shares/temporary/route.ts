import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { fileDatabase } from '@/lib/database/files';
import { temporarySharesDatabase } from '@/lib/database/temporary-shares';
import { fileModificationRateLimit } from '@/lib/security/file-rate-limit';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';


// Validation schemas
const createTemporaryShareSchema = z.object({
  expires_at: z.string().datetime().refine((date) => {
    const expiryDate = new Date(date);
    const now = new Date();
    const maxExpiry = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year max
    
    return expiryDate > now && expiryDate <= maxExpiry;
  }, {
    message: 'Expiry date must be in the future and within 1 year'
  }),
  password: z.string().min(4).max(100).optional(),
  max_downloads: z.number().int().min(1).max(10000).optional(),
  description: z.string().max(500).optional(),
});

// POST /api/files/[id]/shares/temporary - Create a temporary share link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Verify user owns the file
    const file = await fileDatabase.getFileUpload(id);
    
    if (file.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only create shares for files you own' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createTemporaryShareSchema.parse(body);

    // Create the temporary share
    const share = await temporarySharesDatabase.createTemporaryShare(
      {
        file_id: id,
        expires_at: validatedData.expires_at,
        password: validatedData.password,
        max_downloads: validatedData.max_downloads,
        description: validatedData.description,
      },
      user.id
    );

    // Generate the share URL
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const shareUrl = temporarySharesDatabase.generateShareUrl(share.share_token, baseUrl);

    // Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'file_share_created',
      title: 'Temporary Share Created',
      message: `Temporary share created for file "${file.filename}"`,
      data: {
        type: 'temporary_file_share',
        file_id: id,
        share_id: share.id,
        share_url: shareUrl,
        expires_at: share.expires_at,
      },
    });

    return NextResponse.json({
      success: true,
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
      },
      file: {
        id: file.id,
        filename: file.filename,
        file_type: file.file_type,
        file_size: file.file_size,
      },
      message: `Temporary share created successfully! Link expires ${new Date(share.expires_at).toLocaleString()}`,
    });

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
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/files/[id]/shares/temporary - Get all temporary shares for a file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Verify user owns the file
    const file = await fileDatabase.getFileUpload(id);
    
    if (file.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only view shares for files you own' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('include_stats') === 'true';

    // Get all temporary shares for the file
    const shares = await temporarySharesDatabase.getFileTemporaryShares(id);
    
    // Add statistics if requested
    const sharesWithData = await Promise.all(
      shares.map(async (share) => {
        const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
        const shareUrl = temporarySharesDatabase.generateShareUrl(share.share_token, baseUrl);
        
        let statistics = null;
        if (includeStats) {
          statistics = await temporarySharesDatabase.getShareStatistics(share.id);
        }

        return {
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
          statistics,
        };
      })
    );

    return NextResponse.json({
      file_id: id,
      file: {
        id: file.id,
        filename: file.filename,
        file_type: file.file_type,
        file_size: file.file_size,
      },
      shares: sharesWithData,
      total_shares: sharesWithData.length,
      active_shares: sharesWithData.filter(s => s.is_active && new Date(s.expires_at) > new Date()).length,
    });

  } catch (error) {
    logger.error('Get file temporary shares error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}