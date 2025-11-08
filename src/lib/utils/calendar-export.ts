import { addMinutes } from 'date-fns';

import type { Session } from '@/types';

/**
 * Format date for ICS format (YYYYMMDDTHHMMSSZ)
 *
 * IMPORTANT: This formats the date in UTC timezone.
 * The literal 'Z' suffix indicates UTC, so we must convert the date to UTC first.
 * Using toISOString() ensures the date is in UTC before formatting.
 */
function formatICSDate(date: Date): string {
  // Convert to UTC and format as YYYYMMDDTHHMMSSZ
  const isoString = date.toISOString();
  // Remove hyphens, colons, and milliseconds from ISO string
  // From: 2024-01-15T09:30:00.000Z
  // To:   20240115T093000Z
  return isoString.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate ICS (iCalendar) file content for a session
 */
export function generateICS(session: Session): string {
  const startDate = new Date(session.scheduledAt);
  const endDate = addMinutes(startDate, session.durationMinutes || session.duration);
  const now = new Date();

  // Build location based on session type
  let location = '';
  if (session.sessionType === 'video') {
    location = 'Video Call';
  } else if (session.sessionType === 'phone') {
    location = 'Phone Call';
  } else if (session.sessionType === 'in-person') {
    location = 'In Person';
  }

  // Build description
  const description = [
    session.description || '',
    '',
    `Coach: ${session.coach?.firstName || ''} ${session.coach?.lastName || ''}`.trim(),
    `Session Type: ${session.sessionType || 'video'}`,
    `Duration: ${session.durationMinutes || session.duration} minutes`,
  ]
    .filter(Boolean)
    .join('\\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Loom Coaching Platform//Session//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:session-${session.id}@loom-coaching.com`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICS(session.title || 'Coaching Session')}`,
    `DESCRIPTION:${escapeICS(description)}`,
    location ? `LOCATION:${escapeICS(location)}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${escapeICS(session.title || 'Coaching Session')} in 15 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  return icsContent;
}

/**
 * Generate Google Calendar URL for a session
 */
export function generateGoogleCalendarURL(session: Session): string {
  const startDate = new Date(session.scheduledAt);
  const endDate = addMinutes(startDate, session.durationMinutes || session.duration);

  // Google Calendar date format: YYYYMMDDTHHmmssZ
  // IMPORTANT: Must be in UTC timezone (indicated by 'Z' suffix)
  const formatGoogleDate = (date: Date) => {
    const isoString = date.toISOString();
    return isoString.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: session.title || 'Coaching Session',
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: [
      session.description || '',
      '',
      `Coach: ${session.coach?.firstName || ''} ${session.coach?.lastName || ''}`.trim(),
      `Session Type: ${session.sessionType || 'video'}`,
      `Duration: ${session.durationMinutes || session.duration} minutes`,
    ]
      .filter(Boolean)
      .join('\n'),
    location: session.sessionType === 'video' ? 'Video Call' : session.sessionType === 'phone' ? 'Phone Call' : 'In Person',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL for a session
 */
export function generateOutlookCalendarURL(session: Session): string {
  const startDate = new Date(session.scheduledAt);
  const endDate = addMinutes(startDate, session.durationMinutes || session.duration);

  // Outlook date format: YYYY-MM-DDTHH:mm:ssZ
  const formatOutlookDate = (date: Date) => date.toISOString();

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: session.title || 'Coaching Session',
    startdt: formatOutlookDate(startDate),
    enddt: formatOutlookDate(endDate),
    body: [
      session.description || '',
      '',
      `Coach: ${session.coach?.firstName || ''} ${session.coach?.lastName || ''}`.trim(),
      `Session Type: ${session.sessionType || 'video'}`,
      `Duration: ${session.durationMinutes || session.duration} minutes`,
    ]
      .filter(Boolean)
      .join('\n'),
    location: session.sessionType === 'video' ? 'Video Call' : session.sessionType === 'phone' ? 'Phone Call' : 'In Person',
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Download ICS file for a session
 */
export function downloadICS(session: Session): void {
  const icsContent = generateICS(session);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `session-${session.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
