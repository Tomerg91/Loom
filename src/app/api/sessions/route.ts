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

// GET /api/sessions - List sessions with pagination and filters
export const GET = withErrorHandling(
  rateLimit(100, 60000)( // 100 requests per minute
    requireAuth(async (user, request: NextRequest) => {
  
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
    })
  )
);

// POST /api/sessions - Create new session
export const POST = withErrorHandling(
  rateLimit(50, 60000)( // 50 session creations per minute
    requireAuth(async (user, request: NextRequest) => {
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
      
      return createSuccessResponse(session, 'Session created successfully', HTTP_STATUS.CREATED);
    })
  )
);

// OPTIONS /api/sessions - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}