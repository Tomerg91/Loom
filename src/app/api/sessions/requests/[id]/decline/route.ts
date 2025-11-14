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
import { createCorsResponse } from '@/lib/security/cors';
import { createClient } from '@/modules/platform/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const declineRequestSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

type DeclineRequestData = z.infer<typeof declineRequestSchema>;

/**
 * POST /api/sessions/requests/[id]/decline
 * Decline a pending session request
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
          'Only coaches and admins can decline session requests',
          HTTP_STATUS.FORBIDDEN
        )
      );
    }

    // Parse optional request body
    let validatedData: DeclineRequestData = {};
    const contentType = request.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      try {
        const body = await request.json();
        validatedData = declineRequestSchema.parse(body);
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
        status,
        client:client_id(id,email,first_name,last_name)
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

    // Verify the coach is authorized to decline this request
    if (
      profile.role === 'coach' &&
      sessionRequest.coach_id !== user.id
    ) {
      return propagateCookies(
        authResponse,
        createErrorResponse(
          'You can only decline session requests assigned to you',
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

    // Update the session request status
    const { error: updateError } = await serverSupabase
      .from('session_requests')
      .update({
        status: 'declined',
        reschedule_reason: validatedData.reason || 'Request declined by coach',
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error declining session request:', updateError);
      return propagateCookies(
        authResponse,
        createErrorResponse(
          'Failed to decline session request',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      );
    }

    // Send notification to client
    try {
      const coachName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Your coach';
      const clientName = `${sessionRequest.client.first_name || ''} ${sessionRequest.client.last_name || ''}`.trim();

      await serverSupabase.from('notifications').insert({
        user_id: sessionRequest.client_id,
        type: 'session_confirmation',
        title: 'Session Request Declined',
        message: `${coachName} has declined your session request for "${sessionRequest.title}".${validatedData.reason ? ` Reason: ${validatedData.reason}` : ''}`,
        data: {
          type: 'session_request_declined',
          request_id: requestId,
          session_title: sessionRequest.title,
          scheduled_at: sessionRequest.scheduled_at,
          coach_name: coachName,
          reason: validatedData.reason,
        },
      });

      console.info('Session request declined:', {
        requestId,
        coachId: user.id,
        clientId: sessionRequest.client_id,
        clientName,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending decline notification:', error);
      // Don't fail the decline if notification fails
    }

    return propagateCookies(
      authResponse,
      createSuccessResponse(
        { id: requestId, status: 'declined' },
        'Session request declined successfully'
      )
    );
  }
);

// OPTIONS /api/sessions/requests/[id]/decline - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}
