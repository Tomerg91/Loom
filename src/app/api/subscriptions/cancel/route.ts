/**
 * Cancel user subscription (downgrade to free at end of period)
 * POST /api/subscriptions/cancel
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
    await subscriptionSvc.cancelSubscription(user.id);

    return applySecurityHeaders(
      req,
      NextResponse.json(
        {
          success: true,
          message: 'Subscription canceled. You will retain access until the end of your billing period.',
        },
        { status: 200 }
      )
    );
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return applySecurityHeaders(
      req,
      NextResponse.json(
        { success: false, error: 'Failed to cancel subscription' },
        { status: 500 }
      )
    );
  }
}

export const POST = compose(handler, withRateLimit(), withAuth);
