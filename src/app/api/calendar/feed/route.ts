import { NextRequest } from 'next/server';

import { createErrorResponse, HTTP_STATUS, withErrorHandling } from '@/lib/api/utils';
import { createAuthService } from '@/lib/auth/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/calendar/feed?token=<auth_token>
 *
 * Returns an authenticated iCal feed of the user's sessions
 *
 * Query Parameters:
 * - token: Authentication token for feed access
 *
 * Returns: iCalendar (.ics) format feed
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return createErrorResponse('Authentication token required', HTTP_STATUS.UNAUTHORIZED);
  }

  // Verify token and get user
  const authService = createAuthService(true);
  const user = await authService.getCurrentUser();

  if (!user) {
    return createErrorResponse('Invalid or expired token', HTTP_STATUS.UNAUTHORIZED);
  }

  // Fetch user's sessions
  const supabase = await createClient();

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      id,
      title,
      description,
      scheduled_at,
      duration,
      duration_minutes,
      session_type,
      status,
      coach:coach_id(first_name, last_name, email),
      client:client_id(first_name, last_name, email)
    `)
    .or(`coach_id.eq.${user.id},client_id.eq.${user.id}`)
    .in('status', ['scheduled', 'confirmed'])
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch sessions for calendar feed:', error);
    return createErrorResponse('Failed to generate calendar feed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  // Generate iCal content
  const icalContent = generateICalFeed(sessions || [], user);

  return new Response(icalContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="loom-coaching-sessions.ics"',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    },
  });
});

/**
 * Generate iCalendar feed from sessions
 */
function generateICalFeed(sessions: any[], user: any): string {
  const now = new Date();
  const formatICalDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const events = sessions.map(session => {
    const startDate = new Date(session.scheduled_at);
    const duration = session.duration_minutes || session.duration || 60;
    const endDate = new Date(startDate.getTime() + duration * 60000);

    const isCoach = session.coach?.email === user.email;
    const otherParty = isCoach
      ? `${session.client?.first_name || ''} ${session.client?.last_name || ''}`.trim()
      : `${session.coach?.first_name || ''} ${session.coach?.last_name || ''}`.trim();

    const summary = session.title || `Coaching Session${otherParty ? ` with ${otherParty}` : ''}`;

    let description = session.description || 'Coaching session';
    description += `\\n\\nDuration: ${duration} minutes`;
    description += `\\nType: ${session.session_type || 'video'}`;
    if (otherParty) {
      description += `\\n${isCoach ? 'Client' : 'Coach'}: ${otherParty}`;
    }

    const location = session.session_type === 'video' ? 'Video Call'
      : session.session_type === 'phone' ? 'Phone Call'
      : session.session_type === 'in_person' ? 'In Person'
      : 'Online';

    return [
      'BEGIN:VEVENT',
      `UID:session-${session.id}@loom-coaching.com`,
      `DTSTAMP:${formatICalDate(now)}`,
      `DTSTART:${formatICalDate(startDate)}`,
      `DTEND:${formatICalDate(endDate)}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `LOCATION:${escapeText(location)}`,
      `STATUS:${session.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(`Reminder: ${summary} in 15 minutes`)}`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Loom Coaching Platform//Sessions Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Loom Coaching Sessions`,
    `X-WR-CALDESC:Your coaching sessions from Loom`,
    `X-WR-TIMEZONE:${user.timezone || 'UTC'}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return calendar;
}
