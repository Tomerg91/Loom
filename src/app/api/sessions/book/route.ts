import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { isCoachAvailable } from '@/lib/database/availability';
import { sessionNotificationService } from '@/lib/notifications/session-notifications';
import type { Session } from '@/types';

const bookSessionSchema = z.object({
  coachId: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scheduledAt: z.string(),
  durationMinutes: z.number().min(15).max(240),
});

// POST /api/sessions/book - Book a new session with notifications
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  const body = await request.json();
  const validatedData = bookSessionSchema.parse(body);

  // Verify user is a client
  const { data: profile } = await supabase
    .from('users')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'client') {
    return createErrorResponse('Only clients can book sessions', HTTP_STATUS.FORBIDDEN);
  }

  // Verify coach exists and get coach details
  const { data: coach } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('id', validatedData.coachId)
    .eq('role', 'coach')
    .single();

  if (!coach) {
    return createErrorResponse('Coach not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check coach availability
  const isAvailable = await isCoachAvailable(
    validatedData.coachId,
    validatedData.scheduledAt,
    validatedData.durationMinutes
  );

  if (!isAvailable) {
    return createErrorResponse('Coach is not available at the selected time', HTTP_STATUS.CONFLICT);
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
    .select(`
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
    `)
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return createErrorResponse('Failed to create session', HTTP_STATUS.INTERNAL_SERVER_ERROR);
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
    console.error('Error creating session notifications:', error);
    // Don't fail the session creation if notifications fail
  }

  return createSuccessResponse(transformedSession, 'Session booked successfully', HTTP_STATUS.CREATED);
});

// OPTIONS /api/sessions/book - Handle CORS preflight
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