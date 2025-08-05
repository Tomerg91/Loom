import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema } from '@/lib/api/validation';
import { getSessionById, startSession } from '@/lib/database/sessions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/sessions/[id]/start - Start session (mark as in_progress)
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
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
  
  // Validate session can be started
  if (existingSession.status !== 'scheduled') {
    return createErrorResponse(
      `Cannot start session with status '${existingSession.status}'. Session must be scheduled.`, 
      HTTP_STATUS.BAD_REQUEST
    );
  }
  
  // Check if session time is appropriate (not too early)
  const scheduledTime = new Date(existingSession.scheduledAt);
  const now = new Date();
  const timeDiff = scheduledTime.getTime() - now.getTime();
  const minutesUntilSession = Math.floor(timeDiff / (1000 * 60));
  
  // Allow starting up to 15 minutes early
  if (minutesUntilSession > 15) {
    return createErrorResponse(
      `Session is scheduled for ${scheduledTime.toISOString()}. Cannot start more than 15 minutes early.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
  
  // Start the session
  const success = await startSession(id);
  
  if (!success) {
    return createErrorResponse('Failed to start session', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  
  // Get updated session data
  const updatedSession = await getSessionById(id);
  
  return createSuccessResponse(updatedSession, 'Session started successfully');
});

// OPTIONS /api/sessions/[id]/start - Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}