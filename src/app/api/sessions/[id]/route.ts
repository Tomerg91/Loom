import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  validateRequestBody,
  requireAuth,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema, updateSessionSchema } from '@/lib/api/validation';
import { getSessionById, updateSession, deleteSession } from '@/lib/database/sessions';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import { rateLimit } from '@/lib/security/rate-limit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id] - Get session by ID
export const GET = withErrorHandling(
  rateLimit(150, 60000)( // 150 requests per minute
    requireAuth(async (user, request: NextRequest, { params }: RouteParams) => {
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
      
      // Check if user has access to this session
      if (session.coachId !== user.id && session.clientId !== user.id && user.role !== 'admin') {
        return createErrorResponse('Access denied', HTTP_STATUS.FORBIDDEN);
      }
      
      return createSuccessResponse(session);
    })
  )
);

// PUT /api/sessions/[id] - Update session
export const PUT = withErrorHandling(
  rateLimit(50, 60000)( // 50 requests per minute
    requireAuth(async (user, request: NextRequest, { params }: RouteParams) => {
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
      
      // Check if user has permission to update this session
      if (existingSession.coachId !== user.id && user.role !== 'admin') {
        return createErrorResponse('Access denied. Only the coach or admin can update sessions.', HTTP_STATUS.FORBIDDEN);
      }
      
      // Update session
      const updatedSession = await updateSession(id, validation.data);
      
      return createSuccessResponse(updatedSession, 'Session updated successfully');
    })
  )
);

// DELETE /api/sessions/[id] - Cancel/Delete session with policy enforcement
export const DELETE = withErrorHandling(
  rateLimit(20, 60000)( // 20 requests per minute for session cancellations
    requireAuth(async (user, request: NextRequest, { params }: RouteParams) => {
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
      
      // Check if user has permission to cancel this session
      if (existingSession.coachId !== user.id && existingSession.clientId !== user.id && user.role !== 'admin') {
        return createErrorResponse('Access denied. You can only cancel your own sessions.', HTTP_STATUS.FORBIDDEN);
      }
  
  // Check if session can be cancelled
  if (!['scheduled', 'in_progress'].includes(existingSession.status)) {
    return createErrorResponse(
      `Cannot cancel session with status '${existingSession.status}'. Session must be scheduled or in progress.`, 
      HTTP_STATUS.BAD_REQUEST
    );
  }
  
  // Get appropriate cancellation policy
  const { getCancellationPolicy, validateCancellationRequest } = await import('@/lib/config/cancellation-policies');
  
  const policy = getCancellationPolicy();
  const sessionCost = 150; // This could come from session data or pricing config
  
  // Parse request body for cancellation details
  let cancellationData: {
    reason?: string;
    refundRequested?: boolean;
    cancellationType?: 'coach' | 'client' | 'admin' | 'system';
    notifyParticipants?: boolean;
  } = {};
  
  const contentType = request.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      cancellationData = await request.json();
    } catch (error) {
      // If no body provided, continue with defaults
    }
  }
  
  // Validate cancellation request and calculate fees
  const isPrivileged = ['admin', 'system'].includes(cancellationData.cancellationType || '');
  const userRole = cancellationData.cancellationType || 'client';
  
  const validation = validateCancellationRequest(
    existingSession.scheduledAt,
    policy,
    userRole,
    sessionCost
  );
  
  if (!validation.isValid) {
    return createErrorResponse(
      validation.errors.join('. '),
      HTTP_STATUS.BAD_REQUEST
    );
  }
  
  const cancellationResult = validation.result;
  
  // Build cancellation reason
  let reason = cancellationData.reason || 'Session cancelled';
  if (cancellationData.cancellationType) {
    reason = `${reason} (cancelled by ${cancellationData.cancellationType})`;
  }
  if (cancellationResult.type !== 'free') {
    reason = `${reason} - ${cancellationResult.message}`;
  }
  
  // Cancel the session using the workflow service
  const { cancelSession } = await import('@/lib/database/sessions');
  const success = await cancelSession(id, reason);
  
  if (!success) {
    return createErrorResponse('Failed to cancel session', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  
  // Get updated session data
  const updatedSession = await getSessionById(id);
  
  // Calculate hours until session for response
  const hoursUntilSession = (new Date(existingSession.scheduledAt).getTime() - new Date().getTime()) / (1000 * 60 * 60);
  
  // Return cancellation details
  return createSuccessResponse({
    session: updatedSession,
    cancellationPolicy: {
      type: cancellationResult.type,
      feeAmount: cancellationResult.feeAmount,
      refundPercentage: cancellationResult.refundPercentage,
      message: cancellationResult.message,
      hoursUntilSession: Math.max(0, hoursUntilSession),
      isAllowed: cancellationResult.isAllowed,
    },
    refundRequested: cancellationData.refundRequested || false,
    notifyParticipants: cancellationData.notifyParticipants !== false, // Default to true
  }, cancellationResult.message);
    })
  )
);

// OPTIONS /api/sessions/[id] - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}