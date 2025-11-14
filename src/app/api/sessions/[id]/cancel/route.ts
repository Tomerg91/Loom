import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  validateRequestBody,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema } from '@/lib/api/validation';
import { getSessionById, cancelSession } from '@/lib/database/sessions';
import { sessionNotificationService } from '@/lib/notifications/session-notifications';
import { createCorsResponse } from '@/lib/security/cors';
import type { Session } from '@/types';
import { createAuthenticatedSupabaseClient } from '@/lib/api/auth-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema for cancel session request body
const cancelSessionSchema = z.object({
  reason: z.string().optional(),
  cancellationType: z.enum(['coach', 'client', 'admin', 'system']).optional(),
  refundRequested: z.boolean().optional(),
  rescheduleRequested: z.boolean().optional(),
});

type CancelSessionData = z.infer<typeof cancelSessionSchema>;

// POST /api/sessions/[id]/cancel - Cancel session
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  
  // Validate UUID format
  const validationResult = uuidSchema.safeParse(id);
  if (!validationResult.success) {
    return createErrorResponse('Invalid session ID format', HTTP_STATUS.BAD_REQUEST);
  }
  
  // Parse and validate request body (optional)
  let validatedData: CancelSessionData = {};
  const contentType = request.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    try {
      const body = await request.json();
      const validation = validateRequestBody(cancelSessionSchema, body);
      
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
  
  // Validate session can be cancelled
  if (!['scheduled', 'in_progress'].includes(existingSession.status)) {
    return createErrorResponse(
      `Cannot cancel session with status '${existingSession.status}'. Session must be scheduled or in progress.`, 
      HTTP_STATUS.BAD_REQUEST
    );
  }
  
  // Check cancellation policy (example: 24-hour notice required)
  const scheduledTime = new Date(existingSession.scheduledAt);
  const now = new Date();
  const hoursUntilSession = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Allow admin and system cancellations at any time
  const isPrivilegedCancellation = ['admin', 'system'].includes(validatedData.cancellationType || '');
  
  if (!isPrivilegedCancellation && hoursUntilSession < 24) {
    // Still allow cancellation but flag it as late cancellation
    validatedData.reason = `Late cancellation (${validatedData.reason || 'No reason provided'})`;
  }
  
  // Build reason string
  let reason = validatedData.reason || 'Session cancelled';
  if (validatedData.cancellationType) {
    reason = `${reason} (cancelled by ${validatedData.cancellationType})`;
  }
  if (validatedData.refundRequested) {
    reason = `${reason} - Refund requested`;
  }
  if (validatedData.rescheduleRequested) {
    reason = `${reason} - Reschedule requested`;
  }
  
  // Cancel the session
  const success = await cancelSession(id, reason);
  
  if (!success) {
    return createErrorResponse('Failed to cancel session', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  
  // If additional data provided, we could update the session with that data
  if (validatedData.refundRequested || validatedData.rescheduleRequested) {
    const { updateSession } = await import('@/lib/database/sessions');
    
    const updateData: Record<string, unknown> = {};
    if (validatedData.refundRequested !== undefined) {
      updateData.refundRequested = validatedData.refundRequested;
    }
    if (validatedData.rescheduleRequested !== undefined) {
      updateData.rescheduleRequested = validatedData.rescheduleRequested;
    }
    
    await updateSession(id, updateData);
  }
  
  // Get updated session data
  const updatedSession = await getSessionById(id);

  // Send cancellation notifications
  if (updatedSession) {
    try {
      let cancelledBy: 'coach' | 'client' | null = null;

      if (validatedData.cancellationType === 'coach') {
        cancelledBy = 'coach';
      } else if (validatedData.cancellationType === 'client') {
        cancelledBy = 'client';
      }

      if (!cancelledBy) {
        try {
          const { client: supabase } = createAuthenticatedSupabaseClient(
            request,
            new NextResponse()
          );
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            if (user.id === updatedSession.clientId) {
              cancelledBy = 'client';
            } else if (user.id === updatedSession.coachId) {
              cancelledBy = 'coach';
            }
          }
        } catch (authError) {
          console.error('Error determining cancellation actor', authError);
        }
      }

      const fallbackCancelledBy: 'coach' | 'client' =
        cancelledBy ?? 'coach';

      await sessionNotificationService.onSessionCancelled(
        updatedSession as Session,
        fallbackCancelledBy
      );
    } catch (error) {
      console.error('Error sending cancellation notifications:', error);
      // Don't fail the cancellation if notifications fail
    }
  }

  return createSuccessResponse(
    updatedSession,
    hoursUntilSession < 24 && !isPrivilegedCancellation
      ? 'Session cancelled successfully (late cancellation policy applied)'
      : 'Session cancelled successfully'
  );
});

// OPTIONS /api/sessions/[id]/cancel - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}