import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError } from '@/lib/api/errors';
import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { ApiResponseHelper } from '@/lib/api/types';
import { rateLimit } from '@/lib/security/rate-limit';
import { userService } from '@/lib/services/user-service';


const getUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['admin', 'coach', 'client']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Apply rate limiting for admin user management to prevent abuse
const rateLimitedHandler = rateLimit(100, 60000)( // 100 requests per minute for admin user listing
  async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Verify admin access
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    };

    const validation = getUsersQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return ApiResponseHelper.badRequest('Invalid query parameters');
    }

    const { search, role, status, page, limit } = validation.data;

    // Fetch users with filters
    const result = await userService.getUsers({
      search,
      role,
      status,
      page,
      limit,
    });

    return ApiResponseHelper.success(result);

  } catch (error) {
    console.error('Get users API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch users');
  }
  }
);

export async function GET(request: NextRequest): Promise<Response> {
  return rateLimitedHandler(request);
}