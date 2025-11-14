/**
 * Feature Gating Middleware
 * Restricts access to paid features based on user subscription tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';
import { createSubscriptionService } from '@/lib/database/subscriptions';
import { applySecurityHeaders } from '@/lib/security/headers';

export interface FeatureGateOptions {
  feature?: string; // Feature name to check (e.g., 'resource_library', 'advanced_analytics')
  minTier?: 'basic' | 'professional' | 'enterprise'; // Minimum tier required
  limitType?: 'clients' | 'sessions' | 'resources' | 'storage'; // Resource limit to check
}

/**
 * Middleware to gate features based on subscription
 */
export function withFeatureGate(options: FeatureGateOptions) {
  return async (
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<(req: NextRequest) => Promise<NextResponse>> => {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        // Get authenticated user
        const auth = createAuthService(true);
        const user = await auth.getCurrentUser();

        if (!user) {
          return applySecurityHeaders(
            req,
            NextResponse.json(
              { success: false, error: 'Unauthorized' },
              { status: 401 }
            )
          );
        }

        const subscriptionSvc = createSubscriptionService();

        // Check feature access
        if (options.feature) {
          const hasAccess = await subscriptionSvc.userHasFeature(user.id, options.feature);

          if (!hasAccess) {
            return applySecurityHeaders(
              req,
              NextResponse.json(
                {
                  success: false,
                  error: 'Feature not available in your plan',
                  code: 'FEATURE_NOT_AVAILABLE',
                  feature: options.feature,
                },
                { status: 403 }
              )
            );
          }
        }

        // Check minimum tier
        if (options.minTier) {
          const subscription = await subscriptionSvc.getUserSubscription(user.id);
          const tierHierarchy = {
            free: 0,
            basic: 1,
            professional: 2,
            enterprise: 3,
          };

          const userTierLevel = tierHierarchy[subscription.tier];
          const requiredTierLevel = tierHierarchy[options.minTier];

          if (userTierLevel < requiredTierLevel) {
            return applySecurityHeaders(
              req,
              NextResponse.json(
                {
                  success: false,
                  error: `This feature requires ${options.minTier} plan or higher`,
                  code: 'UPGRADE_REQUIRED',
                  currentTier: subscription.tier,
                  requiredTier: options.minTier,
                },
                { status: 403 }
              )
            );
          }
        }

        // Check resource limits
        if (options.limitType) {
          const limitCheck = await subscriptionSvc.checkPlanLimit(user.id, options.limitType);

          if (!limitCheck.isWithinLimit) {
            return applySecurityHeaders(
              req,
              NextResponse.json(
                {
                  success: false,
                  error: `You have reached your plan limit for ${options.limitType}`,
                  code: 'LIMIT_EXCEEDED',
                  limit: limitCheck.limit,
                  current: limitCheck.current,
                },
                { status: 403 }
              )
            );
          }
        }

        // All checks passed, proceed to handler
        return await handler(req);
      } catch (error) {
        console.error('Feature gate error:', error);
        return applySecurityHeaders(
          req,
          NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
          )
        );
      }
    };
  };
}

/**
 * Helper to check if user has feature access (for use in API routes)
 */
export async function requireFeature(userId: string, featureName: string): Promise<boolean> {
  const subscriptionSvc = createSubscriptionService();
  return await subscriptionSvc.userHasFeature(userId, featureName);
}

/**
 * Helper to check if user is within plan limits (for use in API routes)
 */
export async function requireWithinLimit(
  userId: string,
  limitType: 'clients' | 'sessions' | 'resources' | 'storage'
): Promise<{ allowed: boolean; limit: number | null; current: number; remaining: number | null }> {
  const subscriptionSvc = createSubscriptionService();
  const limitCheck = await subscriptionSvc.checkPlanLimit(userId, limitType);

  return {
    allowed: limitCheck.isWithinLimit,
    limit: limitCheck.limit,
    current: limitCheck.current,
    remaining: limitCheck.remaining,
  };
}

/**
 * Helper to require minimum subscription tier (throws if not met)
 */
export async function requireMinTier(
  userId: string,
  minTier: 'basic' | 'professional' | 'enterprise'
): Promise<void> {
  const subscriptionSvc = createSubscriptionService();
  const subscription = await subscriptionSvc.getUserSubscription(userId);

  const tierHierarchy = {
    free: 0,
    basic: 1,
    professional: 2,
    enterprise: 3,
  };

  const userTierLevel = tierHierarchy[subscription.tier];
  const requiredTierLevel = tierHierarchy[minTier];

  if (userTierLevel < requiredTierLevel) {
    throw new Error(`This feature requires ${minTier} plan or higher. Current tier: ${subscription.tier}`);
  }
}
