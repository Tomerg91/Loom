import { NextRequest } from 'next/server';

import { 
  createSuccessResponse, 
  createErrorResponse,
  withErrorHandling,
  parseQueryParams,
  parsePagination,
  requireAuth,
  HTTP_STATUS,
  handlePreflight
} from '@/lib/api/utils';
import { validateQuery } from '@/lib/api/validation';
import { paginationSchema, sortSchema } from '@/lib/api/validation';
import { UserService } from '@/lib/database/users';
import { rateLimit } from '@/lib/security/rate-limit';

// GET /api/users - List users with pagination (Admin only)
export const GET = withErrorHandling(
  rateLimit(200, 60000)( // 200 requests per minute for admin endpoints
    requireAuth(async (user, _request: NextRequest, context: { params: Promise<{}> }) => {
      // Check if user has admin role (required for listing all users)
      if (user.role !== 'admin') {
        return createErrorResponse(
          'Access denied. Required role: admin',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const query = parseQueryParams(request);
      
      // Validate query parameters
      const paginationResult = validateQuery(paginationSchema, query);
      const sortResult = validateQuery(sortSchema, query);
      const page = paginationResult.page ?? 1;
      const limit = paginationResult.limit ?? 10;
      const { sortBy, sortOrder } = sortResult;
      
      // Parse filters
      const role = query.role as string | undefined;
      const search = query.search as string | undefined;
      const status = query.status as string | undefined;
      
      const { offset } = parsePagination({ page: page.toString(), limit: limit.toString() });
      
      const userService = new UserService(true);

      // Fetch users from database
      const [users, total] = await Promise.all([
        userService.getUsersPaginated({
          limit,
          offset,
          sortBy,
          sortOrder,
          role,
          search,
          status,
        }),
        userService.getUsersCount({ role, search, status }),
      ]);
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      return createSuccessResponse({
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev,
        },
      });
    })
  )
);

// OPTIONS /api/users - Handle CORS preflight
export async function OPTIONS(_request: NextRequest) {
  return handlePreflight(request);
}