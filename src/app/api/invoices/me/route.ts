/**
 * Get current user's invoices
 * GET /api/invoices/me
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { applySecurityHeaders } from '@/lib/security/headers';
import { compose, withAuth, withRateLimit } from '@/lib/api/guard';

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = createAuthService(true);
    const user = await auth.getCurrentUser();

    if (!user) {
      return applySecurityHeaders(
        req,
        NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const admin = createAdminClient();
    const { data, error } = await admin.rpc('get_user_invoices', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      throw error;
    }

    return applySecurityHeaders(
      req,
      NextResponse.json(
        {
          success: true,
          data: data || [],
        },
        { status: 200 }
      )
    );
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    return applySecurityHeaders(
      req,
      NextResponse.json(
        { success: false, error: 'Failed to fetch invoices' },
        { status: 500 }
      )
    );
  }
}

export const GET = compose(handler, withRateLimit(), withAuth);
