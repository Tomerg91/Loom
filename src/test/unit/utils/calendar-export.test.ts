import { describe, it, expect } from 'vitest';
import { generateICS, generateGoogleCalendarURL } from '@/lib/utils/calendar-export';
import type { Session } from '@/types';

describe('Calendar Export - UTC Timezone Handling', () => {
  const mockSession: Session = {
    id: 'test-session-123',
    title: 'Coaching Session',
    description: 'Test session description',
    scheduledAt: '2024-01-15T09:30:00.000Z', // 9:30 AM UTC
    duration: 60,
    durationMinutes: 60,
    sessionType: 'video',
    status: 'scheduled',
    coach: {
      id: 'coach-1',
      firstName: 'John',
      lastName: 'Doe',
    },
  } as Session;

  describe('generateICS', () => {
    it('should format dates in UTC timezone', () => {
      const icsContent = generateICS(mockSession);

      // The session is scheduled at 2024-01-15T09:30:00.000Z (9:30 AM UTC)
      // It should appear in the ICS as 20240115T093000Z (not converted to local time)
      expect(icsContent).toContain('DTSTART:20240115T093000Z');

      // End time should be 1 hour later: 10:30 AM UTC
      expect(icsContent).toContain('DTEND:20240115T103000Z');
    });

    it('should not add local timezone offset to UTC times', () => {
      const icsContent = generateICS(mockSession);

      // Ensure the times end with 'Z' (UTC indicator)
      const dtstartMatch = icsContent.match(/DTSTART:(\d{8}T\d{6}Z)/);
      const dtendMatch = icsContent.match(/DTEND:(\d{8}T\d{6}Z)/);

      expect(dtstartMatch).toBeTruthy();
      expect(dtendMatch).toBeTruthy();

      // Verify the format is exactly YYYYMMDDTHHMMSSZ
      expect(dtstartMatch![1]).toMatch(/^\d{8}T\d{6}Z$/);
      expect(dtendMatch![1]).toMatch(/^\d{8}T\d{6}Z$/);
    });

    it('should handle different timezones correctly by converting to UTC', () => {
      // Test with a session that would be in a different local timezone
      // If run in PST (UTC-8), this would be 1:30 AM PST
      const earlyMorningSession: Session = {
        ...mockSession,
        scheduledAt: '2024-01-15T09:30:00.000Z', // 9:30 AM UTC
      };

      const icsContent = generateICS(earlyMorningSession);

      // Should still be 09:30 UTC in the ICS file, not converted to local time
      expect(icsContent).toContain('DTSTART:20240115T093000Z');
    });

    it('should include all required ICS fields', () => {
      const icsContent = generateICS(mockSession);

      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('VERSION:2.0');
      expect(icsContent).toContain('BEGIN:VEVENT');
      expect(icsContent).toContain('UID:session-test-session-123@loom-coaching.com');
      expect(icsContent).toContain('SUMMARY:Coaching Session');
      expect(icsContent).toContain('DESCRIPTION:');
      expect(icsContent).toContain('STATUS:CONFIRMED');
      expect(icsContent).toContain('END:VEVENT');
      expect(icsContent).toContain('END:VCALENDAR');
    });

    it('should include 15-minute reminder alarm', () => {
      const icsContent = generateICS(mockSession);

      expect(icsContent).toContain('BEGIN:VALARM');
      expect(icsContent).toContain('TRIGGER:-PT15M');
      expect(icsContent).toContain('ACTION:DISPLAY');
      expect(icsContent).toContain('END:VALARM');
    });
  });

  describe('generateGoogleCalendarURL', () => {
    it('should format dates in UTC timezone for Google Calendar', () => {
      const url = generateGoogleCalendarURL(mockSession);

      // Decode the URL to check the dates parameter
      const decodedUrl = decodeURIComponent(url);

      // Should contain dates in format: YYYYMMDDTHHmmssZ/YYYYMMDDTHHmmssZ
      expect(decodedUrl).toContain('dates=20240115T093000Z/20240115T103000Z');
    });

    it('should include session details in URL', () => {
      const url = generateGoogleCalendarURL(mockSession);

      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain('text=Coaching+Session');
      // Details are URL-encoded with + for spaces
      expect(url).toContain('Coach%3A+John+Doe'); // "Coach: John Doe"
      expect(url).toContain('Session+Type%3A+video');
      expect(url).toContain('Duration%3A+60+minutes');
    });

    it('should handle different session types', () => {
      const phoneSession: Session = {
        ...mockSession,
        sessionType: 'phone',
      };

      const url = generateGoogleCalendarURL(phoneSession);

      expect(url).toContain('location=Phone+Call');
    });
  });

  describe('Timezone Consistency', () => {
    it('should produce identical UTC times regardless of server timezone', () => {
      // This test ensures that the calendar export is timezone-agnostic
      const testDate = new Date('2024-01-15T14:30:00.000Z'); // 2:30 PM UTC

      const session: Session = {
        ...mockSession,
        scheduledAt: testDate.toISOString(),
      };

      const icsContent = generateICS(session);
      const googleUrl = generateGoogleCalendarURL(session);

      // Both should show 14:30 UTC (not converted to local)
      expect(icsContent).toContain('DTSTART:20240115T143000Z');
      expect(decodeURIComponent(googleUrl)).toContain('20240115T143000Z');
    });

    it('should handle edge cases near midnight UTC', () => {
      // Test a session at 11:59 PM UTC
      const session: Session = {
        ...mockSession,
        scheduledAt: '2024-01-15T23:59:00.000Z',
        duration: 30,
        durationMinutes: 30,
      };

      const icsContent = generateICS(session);

      expect(icsContent).toContain('DTSTART:20240115T235900Z');
      // End time should roll over to next day
      expect(icsContent).toContain('DTEND:20240116T002900Z');
    });

    it('should handle daylight saving time transitions correctly', () => {
      // March 10, 2024 is when DST starts in US (2 AM becomes 3 AM)
      // But UTC times should be unaffected
      const session: Session = {
        ...mockSession,
        scheduledAt: '2024-03-10T10:00:00.000Z', // 10 AM UTC (2 AM PST → 3 AM PDT)
      };

      const icsContent = generateICS(session);

      // Should still be 10:00 UTC, not affected by DST
      expect(icsContent).toContain('DTSTART:20240310T100000Z');
    });
  });
});
