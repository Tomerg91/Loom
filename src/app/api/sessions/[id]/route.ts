import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  validateRequestBody,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema, updateSessionSchema } from '@/lib/api/validation';
import { getSessionById, updateSession, deleteSession } from '@/lib/database/sessions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id] - Get session by ID
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid session ID format', HTTP_STATUS.BAD_REQUEST);
  }
  
  const session = await getSessionById(id);
  
  if (!session) {
    return createErrorResponse('Session not found', HTTP_STATUS.NOT_FOUND);
  }
  
  return createSuccessResponse(session);
});

// PUT /api/sessions/[id] - Update session
export const PUT = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid session ID format', HTTP_STATUS.BAD_REQUEST);
  }
  
  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequestBody(updateSessionSchema, body);
  
  if (!validation.success) {
    return createErrorResponse(validation.error, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
  
  // Check if session exists
  const existingSession = await getSessionById(id);
  if (!existingSession) {
    return createErrorResponse('Session not found', HTTP_STATUS.NOT_FOUND);
  }
  
  // Update session
  const updatedSession = await updateSession(id, validation.data);
  
  return createSuccessResponse(updatedSession, 'Session updated successfully');
});

// DELETE /api/sessions/[id] - Delete session
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid session ID format', HTTP_STATUS.BAD_REQUEST);
  }
  
  // Check if session exists
  const existingSession = await getSessionById(id);
  if (!existingSession) {
    return createErrorResponse('Session not found', HTTP_STATUS.NOT_FOUND);
  }
  
  // Delete session
  await deleteSession(id);
  
  return createSuccessResponse(null, 'Session deleted successfully', HTTP_STATUS.NO_CONTENT);
});

// OPTIONS /api/sessions/[id] - Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}