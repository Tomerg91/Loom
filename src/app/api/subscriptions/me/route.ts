/**
 * Get current user's subscription status
 * GET /api/subscriptions/me
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';
import { createSubscriptionService } from '@/lib/database/subscriptions';
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

    const subscriptionSvc = createSubscriptionService();
    const subscription = await subscriptionSvc.getUserSubscription(user.id);

    // Get plan details
    const plan = await subscriptionSvc.getPlanByTier(subscription.tier);

    return applySecurityHeaders(
      req,
      NextResponse.json(
        {
          success: true,
          data: {
            ...subscription,
            plan,
          },
        },
        { status: 200 }
      )
    );
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return applySecurityHeaders(
      req,
      NextResponse.json(
        { success: false, error: 'Failed to fetch subscription' },
        { status: 500 }
      )
    );
  }
}

export const GET = compose(handler, withRateLimit(), withAuth);
