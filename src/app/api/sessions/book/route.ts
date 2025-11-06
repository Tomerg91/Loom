import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  HTTP_STATUS,
} from '@/lib/api/utils';
import {
  createAuthenticatedSupabaseClient,
  propagateCookies,
} from '@/lib/api/auth-client';
import { isCoachAvailable } from '@/lib/database/availability';
import { sessionNotificationService } from '@/lib/notifications/session-notifications';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import { rateLimit } from '@/lib/security/rate-limit';
import type { Session } from '@/types';
import { logger } from '@/lib/logger';

const bookSessionSchema = z.object({
  coachId: z.string().uuid('Invalid coach ID format'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  scheduledAt: z.string().min(1, 'Scheduled date and time is required'),
  durationMinutes: z
    .number()
    .min(15, 'Session must be at least 15 minutes')
    .max(240, 'Session cannot be longer than 4 hours'),
});

// Apply rate limiting for session booking to prevent abuse
const rateLimitedHandler = rateLimit(10, 60000, {
  // 10 bookings per minute
  blockDuration: 10 * 60 * 1000, // 10 minutes block
  enableSuspiciousActivityDetection: true,
});

// POST /api/sessions/book - Book a new session with notifications
export const POST = withErrorHandling(
  rateLimitedHandler(async (request: NextRequest) => {
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

    // Parse and validate request body
    const body = await request.json();

    let validatedData;
    try {
      validatedData = bookSessionSchema.parse(body);
    } catch (error) {
      // Log invalid booking attempt
      logger.warn('Invalid session booking attempt:', {
        userId: user.id,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString(),
        validationError: error,
      });

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

    // Log session booking attempt for auditing
    logger.info('Session booking attempted:', {
      userId: user.id,
      coachId: validatedData.coachId,
      scheduledAt: validatedData.scheduledAt,
      duration: validatedData.durationMinutes,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Verify user is a client
    const { data: profile } = await supabase
      .from('users')
      .select('role, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'client') {
      return propagateCookies(
        authResponse,
        createErrorResponse(
          'Only clients can book sessions',
          HTTP_STATUS.FORBIDDEN
        )
      );
    }

    // Verify coach exists and get coach details
    const { data: coach } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('id', validatedData.coachId)
      .eq('role', 'coach')
      .single();

    if (!coach) {
      return propagateCookies(
        authResponse,
        createErrorResponse('Coach not found', HTTP_STATUS.NOT_FOUND)
      );
    }

    // Check coach availability
    const isAvailable = await isCoachAvailable(
      validatedData.coachId,
      validatedData.scheduledAt,
      validatedData.durationMinutes
    );

    if (!isAvailable) {
      return propagateCookies(
        authResponse,
        createErrorResponse(
          'Coach is not available at the selected time',
          HTTP_STATUS.CONFLICT
        )
      );
    }

    // Create session
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        coach_id: validatedData.coachId,
        client_id: user.id,
        title: validatedData.title,
        description: validatedData.description,
        scheduled_at: validatedData.scheduledAt,
        duration_minutes: validatedData.durationMinutes,
        status: 'scheduled',
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
      created_at,
      updated_at
    `
      )
      .single();

    if (error) {
      logger.error('Error creating session:', error);
      return propagateCookies(
        authResponse,
        createErrorResponse(
          'Failed to create session',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      );
    }

    // Transform to match frontend interface
    const transformedSession: Session = {
      id: session.id,
      coachId: session.coach_id,
      clientId: session.client_id,
      title: session.title,
      description: session.description || undefined,
      scheduledAt: session.scheduled_at,
      duration: session.duration_minutes,
      durationMinutes: session.duration_minutes,
      status: session.status as Session['status'],
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      coach: {
        id: coach.id,
        email: coach.email,
        firstName: coach.first_name || '',
        lastName: coach.last_name || '',
      },
      client: {
        id: user.id,
        email: user.email || '',
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
      },
    };

    // Create notifications for session booking
    try {
      await sessionNotificationService.onSessionBooked(transformedSession);
    } catch (error) {
      logger.error('Error creating session notifications:', error);
      // Don't fail the session creation if notifications fail
    }

    // Log successful session booking for auditing
    logger.info('Session booked successfully:', {
      sessionId: transformedSession.id,
      userId: user.id,
      coachId: validatedData.coachId,
      scheduledAt: validatedData.scheduledAt,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return propagateCookies(
      authResponse,
      createSuccessResponse(
        transformedSession,
        'Session booked successfully',
        HTTP_STATUS.CREATED
      )
    );
  })
);

// OPTIONS /api/sessions/book - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}
