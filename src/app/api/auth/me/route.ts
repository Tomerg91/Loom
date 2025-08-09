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

// Apply rate limiting to prevent user enumeration attacks
const rateLimitedHandler = rateLimit(60, 60000, { // 60 requests per minute
  enableSuspiciousActivityDetection: true,
});

export const GET = withErrorHandling(
  rateLimitedHandler(async (request: NextRequest) => {
    try {
      const authService = createAuthService(true);
      const user = await authService.getCurrentUser();

      if (!user) {
        // Log authentication check failure for monitoring
        console.warn('User profile request without authentication:', {
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent')
        });
        
        return createErrorResponse(
          'Not authenticated',
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      // Log successful profile access for auditing (optional - can be removed for performance)
      console.debug('User profile accessed:', {
        userId: user.id,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return createSuccessResponse({
        user: {
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
        }
      }, 'User profile retrieved successfully');

    } catch (error) {
      // Log error for monitoring
      console.error('Get current user error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return createErrorResponse(
        'An error occurred while retrieving user profile',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  })
);

export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}