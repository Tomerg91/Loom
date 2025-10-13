import { NextRequest } from 'next/server';
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionById, updateSession } from '@/lib/database/sessions';
import { isCoachAvailable } from '@/lib/database/availability';
import { sessionNotificationService } from '@/lib/notifications/session-notifications';
import { z } from 'zod';
import { differenceInHours, parseISO } from 'date-fns';
import type { Session } from '@/types';
import { createCorsResponse } from '@/lib/security/cors';

const rescheduleSessionSchema = z.object({
  newScheduledAt: z.string().min(1, 'New scheduled time is required'),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

// POST /api/sessions/[id]/reschedule - Reschedule a session
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  const sessionId = params.id;

  // Get session details
  const session = await getSessionById(sessionId);

  if (!session) {
    return createErrorResponse('Session not found', HTTP_STATUS.NOT_FOUND);
  }

  // Authorization: only coach or client can reschedule
  if (user.id !== session.coachId && user.id !== session.clientId) {
    return createErrorResponse('Forbidden', HTTP_STATUS.FORBIDDEN);
  }

  // Only allow rescheduling scheduled sessions
  if (session.status !== 'scheduled') {
    return createErrorResponse(
      `Cannot reschedule a session with status: ${session.status}`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Parse and validate request body
  const body = await request.json();
  const validatedData = rescheduleSessionSchema.parse(body);

  // Validate new time is in the future
  const newScheduledTime = parseISO(validatedData.newScheduledAt);
  const now = new Date();

  if (newScheduledTime <= now) {
    return createErrorResponse(
      'New scheduled time must be in the future',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Check minimum notice period (24 hours)
  const originalScheduledTime = parseISO(session.scheduledAt);
  const hoursUntilOriginal = differenceInHours(originalScheduledTime, now);

  if (hoursUntilOriginal < 24) {
    return createErrorResponse(
      'Sessions can only be rescheduled with at least 24 hours notice',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Check coach availability at new time
  const isAvailable = await isCoachAvailable(
    session.coachId,
    validatedData.newScheduledAt,
    session.durationMinutes || session.duration
  );

  if (!isAvailable) {
    return createErrorResponse(
      'Coach is not available at the requested time',
      HTTP_STATUS.CONFLICT
    );
  }

  // Get user role
  const userRole = user.id === session.coachId ? 'coach' : 'client';

  // Update session with new time and add reschedule metadata
  const updatedSession = await updateSession(sessionId, {
    scheduledAt: validatedData.newScheduledAt,
    metadata: {
      ...(session.metadata || {}),
      rescheduled: true,
      rescheduledBy: userRole,
      rescheduledAt: new Date().toISOString(),
      rescheduledFrom: session.scheduledAt,
      rescheduledReason: validatedData.reason,
    },
  });

  // Send notification to the other party
  try {
    await sessionNotificationService.onSessionRescheduled(
      updatedSession as Session,
      session.scheduledAt,
      userRole
    );

    // Send custom reschedule notification
    const otherPartyId = user.id === session.coachId ? session.clientId : session.coachId;
    const { data: userData } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const userName = userData
      ? `${userData.first_name} ${userData.last_name || ''}`.trim()
      : 'Your session partner';

    await supabase.from('notifications').insert({
      user_id: otherPartyId,
      type: 'session_update',
      title: 'Session Rescheduled',
      message: `${userName} has rescheduled "${session.title}". New time: ${new Date(validatedData.newScheduledAt).toLocaleString()}${validatedData.reason ? `. Reason: ${validatedData.reason}` : ''}`,
      data: {
        type: 'session_rescheduled',
        session_id: sessionId,
        old_time: session.scheduledAt,
        new_time: validatedData.newScheduledAt,
        rescheduled_by: user.id,
        reason: validatedData.reason,
      },
    });
  } catch (error) {
    console.error('Error sending reschedule notification:', error);
  }

  return createSuccessResponse(
    updatedSession,
    'Session rescheduled successfully'
  );
});

// OPTIONS /api/sessions/[id]/reschedule - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}
