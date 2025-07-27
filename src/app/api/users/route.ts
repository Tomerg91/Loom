import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse,
  withErrorHandling,
  parseQueryParams,
  parsePagination,
  HTTP_STATUS
} from '@/lib/api/utils';
import { validateQuery } from '@/lib/api/validation';
import { paginationSchema, sortSchema } from '@/lib/api/validation';
import { getUsersPaginated, getUsersCount } from '@/lib/database/users';

// GET /api/users - List users with pagination (Admin only)
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Authenticate user
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return createErrorResponse(
      'Authentication required',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Get authenticated user from Supabase
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return createErrorResponse(
      'Invalid authentication token',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Get user profile from database
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, role, status')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    return createErrorResponse(
      'User profile not found',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Check if user is active
  if (userProfile.status !== 'active') {
    return createErrorResponse(
      'User account is not active',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Check if user has admin role (required for listing all users)
  if (userProfile.role !== 'admin') {
    return createErrorResponse(
      'Access denied. Required role: admin',
      HTTP_STATUS.FORBIDDEN
    );
  }

  const _user = {
    id: userProfile.id,
    email: userProfile.email,
    role: userProfile.role,
    status: userProfile.status
  };
  
  // Original route logic
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
  
  // Fetch users from database
  const [users, total] = await Promise.all([
    getUsersPaginated({
      limit,
      offset,
      sortBy,
      sortOrder,
      role,
      search,
      status,
    }),
    getUsersCount({ role, search, status }),
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
});

// OPTIONS /api/users - Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}