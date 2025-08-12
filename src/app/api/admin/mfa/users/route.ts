import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { getMfaUserStatuses, getMfaStatistics } from '@/lib/database/mfa-admin';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { rateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';

const getMfaUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['admin', 'coach', 'client']).optional(),
  mfaStatus: z.enum(['enabled', 'disabled', 'all']).default('all'),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeStatistics: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
});

// Apply rate limiting for MFA admin queries to prevent abuse
const rateLimitedHandler = rateLimit(50, 60000)( // 50 requests per minute for MFA admin queries
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Verify admin access
      const session = await authService.getSession();
      if (!session?.user || session.user.role !== 'admin') {
        return ApiResponseHelper.forbidden('Admin access required for MFA management');
      }

      const { searchParams } = new URL(request.url);
      const queryParams = {
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        search: searchParams.get('search') || undefined,
        role: searchParams.get('role') || undefined,
        mfaStatus: searchParams.get('mfaStatus') || undefined,
        sortBy: searchParams.get('sortBy') || undefined,
        sortOrder: searchParams.get('sortOrder') || undefined,
        includeStatistics: searchParams.get('includeStatistics') || undefined,
      };

      const validation = getMfaUsersQuerySchema.safeParse(queryParams);
      if (!validation.success) {
        return ApiResponseHelper.badRequest(
          'Invalid query parameters', 
          validation.error.issues
        );
      }

      const { includeStatistics, ...userOptions } = validation.data;

      // Fetch MFA user statuses
      const usersResult = await getMfaUserStatuses(userOptions);
      if (!usersResult.success) {
        return ApiResponseHelper.internalError(usersResult.error || 'Failed to fetch MFA user data');
      }

      let statistics = null;
      if (includeStatistics) {
        const statsResult = await getMfaStatistics();
        if (statsResult.success) {
          statistics = statsResult.data;
        } else {
          console.error('Failed to fetch MFA statistics:', statsResult.error);
          // Don't fail the request if statistics fail, just log the error
        }
      }

      const response = {
        ...usersResult.data,
        statistics,
      };

      return ApiResponseHelper.success(response);

    } catch (error) {
      console.error('Get MFA users API error:', error);
      
      if (error instanceof ApiError) {
        return ApiResponseHelper.error(error.code, error.message);
      }
      
      return ApiResponseHelper.internalError('Failed to fetch MFA user data');
    }
  }
);

export async function GET(request: NextRequest): Promise<Response> {
  return rateLimitedHandler(request);
}