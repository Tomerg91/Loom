import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { enableMfaForUser, disableMfaForUser, resetMfaForUser } from '@/lib/database/mfa-admin';
import { rateLimit } from '@/lib/security/rate-limit';
import { authService } from '@/lib/services/auth-service';
import { logger } from '@/lib/logger';


const mfaActionSchema = z.object({
  action: z.enum(['enable', 'disable', 'reset']),
  reason: z.string().optional(),
});

interface RouteParams {
  params: Promise<{
    userId: string;
  }>;
}

// Apply rate limiting for MFA admin actions to prevent abuse
const rateLimitedHandler = rateLimit(20, 60000)( // 20 requests per minute for MFA admin actions
  async (request: NextRequest, { params }: RouteParams): Promise<NextResponse> => {
    try {
      // Verify admin access
      const session = await authService.getSession();
      if (!session?.user || session.user.role !== 'admin') {
        return ApiResponseHelper.forbidden('Admin access required for MFA management');
      }

      const { userId } = await params;
      if (!userId) {
        return ApiResponseHelper.badRequest('User ID is required');
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return ApiResponseHelper.badRequest('Invalid user ID format');
      }

      // Parse request body
      const body = await request.json();
      const validation = mfaActionSchema.safeParse(body);
      if (!validation.success) {
        return ApiResponseHelper.badRequest(
          'Invalid request body',
          validation.error.issues
        );
      }

      const { action, reason } = validation.data;
      const adminUserId = session.user.id;

      let result;
      switch (action) {
        case 'enable':
          result = await enableMfaForUser(userId, adminUserId);
          break;
        case 'disable':
          result = await disableMfaForUser(userId, adminUserId);
          break;
        case 'reset':
          result = await resetMfaForUser(userId, adminUserId);
          break;
        default:
          return ApiResponseHelper.badRequest('Invalid action specified');
      }

      if (!result.success) {
        return ApiResponseHelper.internalError(result.error || `Failed to ${action} MFA for user`);
      }

      return ApiResponseHelper.success({
          message: `MFA ${action} successful for user`,
          action,
          userId,
          adminUserId,
          reason: reason || null,
          timestamp: new Date().toISOString()
        });

    } catch (error) {
      logger.error('MFA admin action API error:', error);
      
      if (error instanceof ApiError) {
        return ApiResponseHelper.error(error.code, error.message);
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        return ApiResponseHelper.badRequest('Invalid JSON in request body');
      }
      
      return ApiResponseHelper.internalError('Failed to perform MFA admin action');
    }
  }
);

export async function POST(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const params = await context.params;

  return rateLimitedHandler(request, context);
}

// Also support PATCH for consistency with RESTful conventions
export async function PATCH(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const params = await context.params;

  return rateLimitedHandler(request, context);
}