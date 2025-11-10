import { NextRequest } from 'next/server';
import { z } from 'zod';

import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  validateRequestBody,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema } from '@/lib/api/validation';
import { getSessionById, completeSession } from '@/lib/database/sessions';
import { createCorsResponse } from '@/lib/security/cors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema for complete session request body
const completeSessionSchema = z.object({
  notes: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),
  actionItems: z.array(z.string()).optional(),
});

type CompleteSessionData = z.infer<typeof completeSessionSchema>;

// POST /api/sessions/[id]/complete - Complete session (mark as completed)
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid session ID format', HTTP_STATUS.BAD_REQUEST);
  }
  
  // Parse and validate request body (optional)
  let validatedData: CompleteSessionData = {};
  const contentType = request.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    try {
      const body = await request.json();
      const validation = validateRequestBody(completeSessionSchema, body);
      
      if (!validation.success) {
        return createErrorResponse(validation.error, HTTP_STATUS.UNPROCESSABLE_ENTITY);
      }

      validatedData = validation.data;
    } catch (_error) {
      return createErrorResponse('Invalid JSON in request body', HTTP_STATUS.BAD_REQUEST);
    }
  }
  
  // Check if session exists
  const existingSession = await getSessionById(id);
  if (!existingSession) {
    return createErrorResponse('Session not found', HTTP_STATUS.NOT_FOUND);
  }
  
  // Validate session can be completed
  if (existingSession.status !== 'in_progress') {
    return createErrorResponse(
      `Cannot complete session with status '${existingSession.status}'. Session must be in progress.`, 
      HTTP_STATUS.BAD_REQUEST
    );
  }
  
  // Complete the session
  const success = await completeSession(id, validatedData.notes);
  
  if (!success) {
    return createErrorResponse('Failed to complete session', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  
  // If additional data provided, update the session with that data
  if (validatedData.rating || validatedData.feedback || validatedData.actionItems) {
    const { updateSession } = await import('@/lib/database/sessions');
    
    const updateData: Record<string, unknown> = {};
    if (validatedData.rating) updateData.rating = validatedData.rating;
    if (validatedData.feedback) updateData.feedback = validatedData.feedback;
    if (validatedData.actionItems) updateData.actionItems = validatedData.actionItems;
    
    await updateSession(id, updateData);
  }
  
  // Get updated session data
  const updatedSession = await getSessionById(id);
  
  return createSuccessResponse(updatedSession, 'Session completed successfully');
});

// OPTIONS /api/sessions/[id]/complete - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}