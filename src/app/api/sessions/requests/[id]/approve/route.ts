import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createAuthenticatedSupabaseClient,
  propagateCookies,
} from '@/lib/api/auth-client';
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  HTTP_STATUS,
} from '@/lib/api/utils';
import { uuidSchema } from '@/lib/api/validation';
import { sessionNotificationService } from '@/lib/notifications/session-notifications';
import { createCorsResponse } from '@/lib/security/cors';
import { createClient } from '@/modules/platform/supabase/server';
import type { Session } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const approveRequestSchema = z.object({
  meetingUrl: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
});

type ApproveRequestData = z.infer<typeof approveRequestSchema>;

/**
 * POST /api/sessions/requests/[id]/approve
 * Approve a pending session request and create the session
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: RouteParams) => {
    const { id: requestId } = await params;

    // Validate UUID format
    const validationResult = uuidSchema.safeParse(requestId);
    if (!validationResult.success) {
      return createErrorResponse(
        'Invalid request ID format',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { client: supabase, response: authResponse } =
      createAuthenticatedSupabaseClient(request, new NextResponse());
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return propagateCookies(
        authResponse,
        createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
      );
    }

    // Get user role
    const { data: profile } = await supabase
      .from('users')
      .select('role, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (!profile || !['coach', 'admin'].includes(profile.role)) {
      return propagateCookies(
        authResponse,
        createErrorResponse(
          'Only coaches and admins can approve session requests',
          HTTP_STATUS.FORBIDDEN
        )
      );
    }

    // Parse optional request body
    let validatedData: ApproveRequestData = {};
    const contentType = request.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      try {
        const body = await request.json();
        validatedData = approveRequestSchema.parse(body);
      } catch (error) {
        return propagateCookies(
          authResponse,
          createErrorResponse(
            error instanceof z.ZodError
              ? error.errors[0].message
              : 'Invalid request data',
            HTTP_STATUS.BAD_REQUEST
          )
        );
      }
    }

    const serverSupabase = createClient();

    // Get the session request
    const { data: sessionRequest, error: fetchError } = await serverSupabase
      .from('session_requests')
      .select(
        `
        id,
        coach_id,
        client_id,
        scheduled_at,
        duration_minutes,
        title,
        timezone,
        meeting_url,
        notes,
        status
      `
      )
      .eq('id', requestId)
      .single();

    if (fetchError || !sessionRequest) {
      return propagateCookies(
        authResponse,
        createErrorResponse('Session request not found', HTTP_STATUS.NOT_FOUND)
      );
    }

    // Verify the coach is authorized to approve this request
    if (
      profile.role === 'coach' &&
      sessionRequest.coach_id !== user.id
    ) {
      return propagateCookies(
        authResponse,
        createErrorResponse(
          'You can only approve session requests assigned to you',
          HTTP_STATUS.FORBIDDEN
        )
      );
    }

    // Check if already approved or declined
    if (sessionRequest.status !== 'pending') {
      return propagateCookies(
        authResponse,
        createErrorResponse(
          `Session request is already ${sessionRequest.status}`,
          HTTP_STATUS.BAD_REQUEST
        )
      );
    }

    // Create the session
    const { data: newSession, error: sessionError } = await serverSupabase
      .from('sessions')
      .insert({
        coach_id: sessionRequest.coach_id,
        client_id: sessionRequest.client_id,
        title: sessionRequest.title,
        scheduled_at: sessionRequest.scheduled_at,
        duration_minutes: sessionRequest.duration_minutes,
        status: 'scheduled',
        meeting_url: validatedData.meetingUrl || sessionRequest.meeting_url,
        timezone: sessionRequest.timezone,
        notes: validatedData.notes || sessionRequest.notes,
      })
      .select(
        `
        id,
        coach_id,
        client_id,
        title,
        description,
        scheduled_at,
        duration_minutes,
        status,
        meeting_url,
        timezone,
        notes,
        created_at,
        updated_at,
        coach:coach_id(id,email,first_name,last_name,avatar_url),
        client:client_id(id,email,first_name,last_name,avatar_url)
      `
      )
      .single();

    if (sessionError || !newSession) {
      console.error('Error creating session:', sessionError);
      return propagateCookies(
        authResponse,
        createErrorResponse(
          'Failed to create session',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      );
    }

    // Update the session request status
    const { error: updateError } = await serverSupabase
      .from('session_requests')
      .update({
        status: 'approved',
        session_id: newSession.id,
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating session request:', updateError);
      // Don't fail the request if update fails - session is already created
    }

    // Transform to match frontend Session interface
    const transformedSession: Session = {
      id: newSession.id,
      coachId: newSession.coach_id,
      clientId: newSession.client_id,
      title: newSession.title,
      description: newSession.description || undefined,
      scheduledAt: newSession.scheduled_at,
      duration: newSession.duration_minutes,
      durationMinutes: newSession.duration_minutes,
      status: newSession.status as Session['status'],
      meetingUrl: newSession.meeting_url || undefined,
      timezone: newSession.timezone || undefined,
      notes: newSession.notes || undefined,
      createdAt: newSession.created_at,
      updatedAt: newSession.updated_at,
      coach: {
        id: newSession.coach.id,
        email: newSession.coach.email,
        firstName: newSession.coach.first_name || '',
        lastName: newSession.coach.last_name || '',
        avatarUrl: newSession.coach.avatar_url || undefined,
      },
      client: {
        id: newSession.client.id,
        email: newSession.client.email,
        firstName: newSession.client.first_name || '',
        lastName: newSession.client.last_name || '',
        avatarUrl: newSession.client.avatar_url || undefined,
      },
    };

    // Send notifications
    try {
      await sessionNotificationService.onSessionBooked(transformedSession);
    } catch (error) {
      console.error('Error sending approval notifications:', error);
      // Don't fail the approval if notifications fail
    }

    return propagateCookies(
      authResponse,
      createSuccessResponse(
        transformedSession,
        'Session request approved successfully',
        HTTP_STATUS.CREATED
      )
    );
  }
);

// OPTIONS /api/sessions/requests/[id]/approve - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}
