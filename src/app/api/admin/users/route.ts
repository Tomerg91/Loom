import { NextRequest } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { userService } from '@/lib/services/user-service';
import { ApiResponse } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { z } from 'zod';

const getUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['admin', 'coach', 'client']).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponse.forbidden('Admin access required');
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
      return ApiResponse.badRequest('Invalid query parameters');
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

    return ApiResponse.success(result);

  } catch (error) {
    console.error('Get users API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponse.error(error.code, error.message);
    }
    
    return ApiResponse.internalError('Failed to fetch users');
  }
}