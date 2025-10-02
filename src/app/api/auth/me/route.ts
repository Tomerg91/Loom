import { NextRequest, NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { rateLimit } from '@/lib/security/rate-limit';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import { withApiOptimization, optimizeQuery } from '@/lib/performance/api-optimization';
import { CacheTTL } from '@/lib/performance/cache';

// Apply rate limiting to prevent user enumeration attacks
const rateLimitedHandler = rateLimit(120, 60000, { // 120 requests per minute for better UX
  enableSuspiciousActivityDetection: true,
});

// Optimized cache headers for auth endpoint
const setCacheHeaders = (response: NextResponse, fromCache = false) => {
  // Shorter cache for auth data to ensure freshness
  response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=30');
  response.headers.set('CDN-Cache-Control', 'private, max-age=120');
  response.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS');
  return response;
};

export const GET = withErrorHandling(
  withApiOptimization(
    rateLimitedHandler(async (request: NextRequest) => {
      try {
        const authService = await createAuthService(true);

        // Optimize user retrieval with caching
        const user = await optimizeQuery(
          () => authService.getCurrentUser(),
          `auth_user_${request.headers.get('authorization') || 'session'}`,
          CacheTTL.SHORT // 1 minute cache for auth data
        );

        if (!user) {
          // Log authentication check failure for monitoring (reduced logging)
          if (process.env.NODE_ENV === 'development') {
            console.warn('User profile request without authentication:', {
              timestamp: new Date().toISOString(),
              ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
          }
          
          return createErrorResponse(
            'Not authenticated',
            HTTP_STATUS.UNAUTHORIZED
          );
        }

        // Minimal user data for faster serialization
        const userData = {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          language: user.language,
          status: user.status,
          lastSeenAt: user.lastSeenAt,
          createdAt: user.createdAt
        };

        const response = createSuccessResponse({
          user: userData
        }, 'User profile retrieved successfully');
        
        return setCacheHeaders(response);

      } catch (error) {
        // Minimal error logging in production
        if (process.env.NODE_ENV === 'development') {
          console.error('Get current user error:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
        
        return createErrorResponse(
          'An error occurred while retrieving user profile',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}