import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  validateRequestBody,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema } from '@/lib/api/validation';
import { getSessionById, markNoShow } from '@/lib/database/sessions';
import { z } from 'zod';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema for no-show request body
const noShowSchema = z.object({
  reason: z.string().optional(),
  noShowType: z.enum(['coach', 'client', 'both']).optional(),
});

type NoShowData = z.infer<typeof noShowSchema>;

// POST /api/sessions/[id]/no-show - Mark session as no-show
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid session ID format', HTTP_STATUS.BAD_REQUEST);
  }
  
  // Parse and validate request body (optional)
  let validatedData: NoShowData = {};
  const contentType = request.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    try {
      const body = await request.json();
      const validation = validateRequestBody(noShowSchema, body);
      
      if (!validation.success) {
        return createErrorResponse(validation.error, HTTP_STATUS.UNPROCESSABLE_ENTITY);
      }
      
      validatedData = validation.data;
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', HTTP_STATUS.BAD_REQUEST);
    }
  }
  
  // Check if session exists
  const existingSession = await getSessionById(id);
  if (!existingSession) {
    return createErrorResponse('Session not found', HTTP_STATUS.NOT_FOUND);
  }
  
  // Validate session can be marked as no-show
  if (!['scheduled', 'in_progress'].includes(existingSession.status)) {
    return createErrorResponse(
      `Cannot mark session with status '${existingSession.status}' as no-show. Session must be scheduled or in progress.`, 
      HTTP_STATUS.BAD_REQUEST
    );
  }
  
  // Check if session time has passed (can only mark as no-show after scheduled time)
  const scheduledTime = new Date(existingSession.scheduledAt);
  const now = new Date();
  
  if (now < scheduledTime) {
    return createErrorResponse(
      'Cannot mark session as no-show before the scheduled time',
      HTTP_STATUS.BAD_REQUEST
    );
  }
  
  // Build reason string
  let reason = validatedData.reason || 'No show recorded';
  if (validatedData.noShowType) {
    reason = `${reason} (${validatedData.noShowType} no-show)`;
  }
  
  // Mark session as no-show
  const success = await markNoShow(id, reason);
  
  if (!success) {
    return createErrorResponse('Failed to mark session as no-show', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  
  // Get updated session data
  const updatedSession = await getSessionById(id);
  
  return createSuccessResponse(updatedSession, 'Session marked as no-show successfully');
});

// OPTIONS /api/sessions/[id]/no-show - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}