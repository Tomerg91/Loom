/**
 * Get all available subscription plans
 * GET /api/subscriptions/plans
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionService } from '@/lib/database/subscriptions';
import { applySecurityHeaders } from '@/lib/security/headers';
import { rateLimit } from '@/lib/security/rate-limit';

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const subscriptionSvc = createSubscriptionService();
    const plans = await subscriptionSvc.getPublicPlans();

    return applySecurityHeaders(
      req,
      NextResponse.json(
        {
          success: true,
          data: plans,
        },
        { status: 200 }
      )
    );
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return applySecurityHeaders(
      req,
      NextResponse.json(
        { success: false, error: 'Failed to fetch plans' },
        { status: 500 }
      )
    );
  }
}

export const GET = rateLimit(30, 60_000)(handler);
