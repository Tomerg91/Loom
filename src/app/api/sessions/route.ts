import { NextRequest } from 'next/server';
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  validateRequestBody,
  parseQueryParams,
  requireAuth,
  handlePreflight,
  HTTP_STATUS
} from '@/lib/api/utils';
import { validateQuery } from '@/lib/api/validation';
import { createSessionSchema, sessionQuerySchema } from '@/lib/api/validation';
import {
  getSessionsPaginated,
  getSessionsCount,
  createSession
} from '@/lib/database/sessions';
import { rateLimit } from '@/lib/security/rate-limit';
import { getCachedData, CacheKeys, CacheTTL, CacheInvalidation } from '@/lib/performance/cache';
import { withApiOptimization, createStreamingResponse, optimizeQuery } from '@/lib/performance/api-optimization';
import { createClient } from '@/lib/supabase/server';

// GET /api/sessions - Optimized list sessions with caching and streaming
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
    }

    const user = {
      id: authUser.id,
      email: authUser.email!,
      role: (authUser.user_metadata?.role || 'client') as any,
      status: 'active'
    };

    // Original route logic
    const query = parseQueryParams(request);

    // Validate query parameters
    const validatedQuery = validateQuery(sessionQuerySchema, query);
    const page = validatedQuery.page ?? 1;
    const limit = validatedQuery.limit ?? 10;
    const { sortBy, sortOrder, status, coachId, clientId, from, to } = validatedQuery;

    const offset = (page - 1) * limit;

    // Create cache key based on user and filters
    const filterKey = JSON.stringify({ page, limit, sortBy, sortOrder, status, coachId, clientId, from, to });
    const cacheKey = CacheKeys.sessions(user.id, filterKey);

    // Fetch sessions from cache or database
    const [sessions, total] = await getCachedData(
      cacheKey,
      async () => Promise.all([
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
      ]),
      CacheTTL.MEDIUM
    );

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
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return createErrorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// POST /api/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
    }

    const user = {
      id: authUser.id,
      email: authUser.email!,
      role: (authUser.user_metadata?.role || 'client') as any,
      status: 'active'
    };

    // Check if user has coach role (required for creating sessions)
    if (user.role !== 'coach' && user.role !== 'admin') {
      return createErrorResponse(
        'Access denied. Required role: coach',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateRequestBody(createSessionSchema, body);

    if (!validation.success) {
      return createErrorResponse(validation.error, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    // Create session
    const session = await createSession(validation.data);

    // Invalidate relevant caches
    CacheInvalidation.user(user.id);
    if (validation.data.clientId) {
      CacheInvalidation.user(validation.data.clientId);
    }

    return createSuccessResponse(session, 'Session created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    console.error('Error creating session:', error);
    return createErrorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// OPTIONS /api/sessions - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}