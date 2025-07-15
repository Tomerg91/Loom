import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  validateRequestBody,
  parseQueryParams,
  HTTP_STATUS
} from '@/lib/api/utils';
import { validateQuery } from '@/lib/api/validation';
import { createSessionSchema, sessionQuerySchema } from '@/lib/api/validation';
import { 
  getSessionsPaginated, 
  getSessionsCount, 
  createSession 
} from '@/lib/database/sessions';

// GET /api/sessions - List sessions with pagination and filters
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

  const _user = {
    id: userProfile.id,
    email: userProfile.email,
    role: userProfile.role,
    status: userProfile.status
  };
  
  // Original route logic
  const query = parseQueryParams(request);
  
  // Validate query parameters
  const validatedQuery = validateQuery(sessionQuerySchema, query);
  const page = validatedQuery.page ?? 1;
  const limit = validatedQuery.limit ?? 10;
  const { sortBy, sortOrder, status, coachId, clientId, from, to } = validatedQuery;
  
  const offset = (page - 1) * limit;
  
  // Fetch sessions from database
  const [sessions, total] = await Promise.all([
    getSessionsPaginated({
      limit,
      offset,
      sortBy,
      sortOrder,
      status,
      coachId,
      clientId,
      from,
      to,
    }),
    getSessionsCount({ status, coachId, clientId, from, to }),
  ]);
  
  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return createSuccessResponse({
    data: sessions,
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

// POST /api/sessions - Create new session
export const POST = withErrorHandling(async (request: NextRequest) => {
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

  // Check if user has coach role (required for creating sessions)
  if (userProfile.role !== 'coach' && userProfile.role !== 'admin') {
    return createErrorResponse(
      'Access denied. Required role: coach',
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
  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequestBody(createSessionSchema, body);
  
  if (!validation.success) {
    return createErrorResponse(validation.error, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
  
  // Create session
  const session = await createSession(validation.data);
  
  return createSuccessResponse(session, 'Session created successfully', HTTP_STATUS.CREATED);
});

// OPTIONS /api/sessions - Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}