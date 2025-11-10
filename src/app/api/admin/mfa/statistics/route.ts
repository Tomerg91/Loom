import { NextRequest, NextResponse } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { getMfaStatistics } from '@/lib/database/mfa-admin';
import { rateLimit } from '@/lib/security/rate-limit';
import { authService } from '@/lib/services/auth-service';

// Apply rate limiting for MFA statistics queries
const rateLimitedHandler = rateLimit(30, 60000)( // 30 requests per minute for statistics
  async (_request: NextRequest): Promise<NextResponse> => {
    try {
      // Verify admin access
      const session = await authService.getSession();
      if (!session?.user || session.user.role !== 'admin') {
        return ApiResponseHelper.forbidden('Admin access required for MFA statistics');
      }

      // Fetch MFA statistics
      const result = await getMfaStatistics();
      if (!result.success) {
        return ApiResponseHelper.internalError(result.error || 'Failed to fetch MFA statistics');
      }

      return ApiResponseHelper.success(result.data);

    } catch (error) {
      console.error('Get MFA statistics API error:', error);
      
      if (error instanceof ApiError) {
        return ApiResponseHelper.error(error.code, error.message);
      }
      
      return ApiResponseHelper.internalError('Failed to fetch MFA statistics');
    }
  }
);

export async function GET(request: NextRequest): Promise<Response> {
  return rateLimitedHandler(request);
}