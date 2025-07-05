import { NotificationService } from '@/lib/database/notifications';
import type { Session } from '@/types';

export class SessionNotificationService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService(true);
  }

  /**
   * Create notifications when a session is booked
   */
  async onSessionBooked(session: Session) {
    const promises = [];

    // Notify coach about new session
    promises.push(
      this.notificationService.createNotification({
        userId: session.coachId,
        type: 'session_confirmation',
        title: 'New Session Booked',
        message: `${session.client.firstName} ${session.client.lastName} has booked a session: "${session.title}"`,
        data: {
          sessionId: session.id,
          sessionTitle: session.title,
          clientName: `${session.client.firstName} ${session.client.lastName}`,
          scheduledAt: session.scheduledAt,
        },
      })
    );

    // Notify client about session confirmation
    promises.push(
      this.notificationService.createNotification({
        userId: session.clientId,
        type: 'session_confirmation',
        title: 'Session Confirmed',
        message: `Your session "${session.title}" with ${session.coach.firstName} ${session.coach.lastName} has been confirmed`,
        data: {
          sessionId: session.id,
          sessionTitle: session.title,
          coachName: `${session.coach.firstName} ${session.coach.lastName}`,
          scheduledAt: session.scheduledAt,
        },
      })
    );

    // Create session reminder for client (24 hours before)
    const sessionDate = new Date(session.scheduledAt);
    const reminderDate = new Date(sessionDate.getTime() - 24 * 60 * 60 * 1000);

    if (reminderDate > new Date()) {
      promises.push(
        this.notificationService.createNotification({
          userId: session.clientId,
          type: 'session_reminder',
          title: 'Session Reminder',
          message: `Don't forget about your session "${session.title}" tomorrow at ${sessionDate.toLocaleTimeString()}`,
          data: {
            sessionId: session.id,
            sessionTitle: session.title,
            coachName: `${session.coach.firstName} ${session.coach.lastName}`,
            scheduledAt: session.scheduledAt,
          },
          scheduledFor: reminderDate,
        })
      );
    }

    // Create session reminder for coach (2 hours before)
    const coachReminderDate = new Date(sessionDate.getTime() - 2 * 60 * 60 * 1000);

    if (coachReminderDate > new Date()) {
      promises.push(
        this.notificationService.createNotification({
          userId: session.coachId,
          type: 'session_reminder',
          title: 'Upcoming Session',
          message: `You have a session with ${session.client.firstName} ${session.client.lastName} in 2 hours: "${session.title}"`,
          data: {
            sessionId: session.id,
            sessionTitle: session.title,
            clientName: `${session.client.firstName} ${session.client.lastName}`,
            scheduledAt: session.scheduledAt,
          },
          scheduledFor: coachReminderDate,
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Create notifications when a session is cancelled
   */
  async onSessionCancelled(session: Session, cancelledBy: 'client' | 'coach') {
    const promises = [];

    if (cancelledBy === 'client') {
      // Notify coach about cancellation
      promises.push(
        this.notificationService.createNotification({
          userId: session.coachId,
          type: 'session_confirmation',
          title: 'Session Cancelled',
          message: `${session.client.firstName} ${session.client.lastName} has cancelled the session: "${session.title}"`,
          data: {
            sessionId: session.id,
            sessionTitle: session.title,
            clientName: `${session.client.firstName} ${session.client.lastName}`,
            scheduledAt: session.scheduledAt,
            reason: 'cancelled_by_client',
          },
        })
      );
    } else {
      // Notify client about cancellation
      promises.push(
        this.notificationService.createNotification({
          userId: session.clientId,
          type: 'session_confirmation',
          title: 'Session Cancelled',
          message: `Your coach ${session.coach.firstName} ${session.coach.lastName} has cancelled the session: "${session.title}"`,
          data: {
            sessionId: session.id,
            sessionTitle: session.title,
            coachName: `${session.coach.firstName} ${session.coach.lastName}`,
            scheduledAt: session.scheduledAt,
            reason: 'cancelled_by_coach',
          },
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Create notifications when a session is rescheduled
   */
  async onSessionRescheduled(session: Session, oldScheduledAt: string, rescheduledBy: 'client' | 'coach') {
    const promises = [];

    if (rescheduledBy === 'client') {
      // Notify coach about reschedule
      promises.push(
        this.notificationService.createNotification({
          userId: session.coachId,
          type: 'session_confirmation',
          title: 'Session Rescheduled',
          message: `${session.client.firstName} ${session.client.lastName} has rescheduled the session: "${session.title}"`,
          data: {
            sessionId: session.id,
            sessionTitle: session.title,
            clientName: `${session.client.firstName} ${session.client.lastName}`,
            oldScheduledAt,
            newScheduledAt: session.scheduledAt,
          },
        })
      );
    } else {
      // Notify client about reschedule
      promises.push(
        this.notificationService.createNotification({
          userId: session.clientId,
          type: 'session_confirmation',
          title: 'Session Rescheduled',
          message: `Your coach ${session.coach.firstName} ${session.coach.lastName} has rescheduled the session: "${session.title}"`,
          data: {
            sessionId: session.id,
            sessionTitle: session.title,
            coachName: `${session.coach.firstName} ${session.coach.lastName}`,
            oldScheduledAt,
            newScheduledAt: session.scheduledAt,
          },
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Create notifications when a session is completed
   */
  async onSessionCompleted(session: Session) {
    const promises = [];

    // Notify client about completed session and encourage reflection
    promises.push(
      this.notificationService.createNotification({
        userId: session.clientId,
        type: 'session_confirmation',
        title: 'Session Completed',
        message: `Great session with ${session.coach.firstName} ${session.coach.lastName}! Consider adding a reflection to capture your insights.`,
        data: {
          sessionId: session.id,
          sessionTitle: session.title,
          coachName: `${session.coach.firstName} ${session.coach.lastName}`,
          completedAt: new Date().toISOString(),
          suggestReflection: true,
        },
      })
    );

    await Promise.all(promises);
  }

  /**
   * Create notifications when a coach note is shared with client
   */
  async onCoachNoteShared(noteId: string, coachName: string, clientId: string, sessionTitle?: string) {
    await this.notificationService.createNotification({
      userId: clientId,
      type: 'new_message',
      title: 'New Note from Coach',
      message: sessionTitle 
        ? `${coachName} has shared notes from your session: "${sessionTitle}"`
        : `${coachName} has shared new notes with you`,
      data: {
        noteId,
        coachName,
        sessionTitle,
        type: 'coach_note',
      },
    });
  }

  /**
   * Create system notifications for platform updates
   */
  async createSystemNotification(
    userIds: string[],
    title: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    const promises = userIds.map(userId =>
      this.notificationService.createNotification({
        userId,
        type: 'system_update',
        title,
        message,
        data,
      })
    );

    await Promise.all(promises);
  }
}

// Export singleton instance
export const sessionNotificationService = new SessionNotificationService();