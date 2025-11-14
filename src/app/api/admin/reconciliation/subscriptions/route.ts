/**
 * Subscription Reconciliation API for Finance Stakeholders
 * GET /api/admin/reconciliation/subscriptions
 *
 * Provides subscription analytics and revenue reports
 * Requires admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';
import { createSubscriptionService } from '@/lib/database/subscriptions';
import { applySecurityHeaders } from '@/lib/security/headers';
import { compose, withAuth, withRateLimit } from '@/lib/api/guard';

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authorization
    const auth = createAuthService(true);
    const user = await auth.getCurrentUser();

    if (!user || user.role !== 'admin') {
      return applySecurityHeaders(
        req,
        NextResponse.json(
          { success: false, error: 'Unauthorized - Admin access required' },
          { status: 403 }
        )
      );
    }

    const subscriptionSvc = createSubscriptionService();
    const analytics = await subscriptionSvc.getSubscriptionAnalytics();

    return applySecurityHeaders(
      req,
      NextResponse.json(
        {
          success: true,
          data: analytics,
        },
        { status: 200 }
      )
    );
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    return applySecurityHeaders(
      req,
      NextResponse.json(
        { success: false, error: 'Failed to fetch subscription analytics' },
        { status: 500 }
      )
    );
  }
}

export const GET = compose(handler, withRateLimit(), withAuth);
