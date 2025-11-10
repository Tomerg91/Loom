import { createServerClient } from '@/lib/supabase/server';
import type { NotificationType } from '@/types';

import { EmailNotificationService } from './email-notification-service';
import { PushNotificationService } from './push-notification-service';

export interface ScheduledNotification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: 'email' | 'push' | 'inapp';
  title: string;
  content: string;
  scheduledFor: Date;
  templateId?: string;
  templateVariables?: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationJob {
  id: string;
  type: 'send_notification' | 'send_bulk_notifications' | 'send_reminder' | 'cleanup_notifications';
  payload: unknown;
  scheduledFor: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationScheduler {
  private supabase: ReturnType<typeof createServerClient>;
  private emailService: EmailNotificationService;
  private pushService: PushNotificationService;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.supabase = createServerClient();
    this.emailService = new EmailNotificationService(true);
    this.pushService = new PushNotificationService(true);
  }

  /**
   * Schedule a notification to be sent at a specific time
   */
  async scheduleNotification(
    userId: string,
    type: NotificationType,
    channel: 'email' | 'push' | 'inapp',
    title: string,
    content: string,
    scheduledFor: Date,
    options: {
      templateVariables?: Record<string, unknown>;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      maxRetries?: number;
    } = {}
  ): Promise<string | null> {
    try {
      const notification = {
        user_id: userId,
        type,
        channel,
        title,
        message: content,
        scheduled_for: scheduledFor.toISOString(),
        template_variables: options.templateVariables || {},
        priority: options.priority || 'normal',
        status: 'pending',
        retry_count: 0,
        max_retries: options.maxRetries || 3,
      };

      const { data, error } = await this.supabase
        .from('scheduled_notifications')
        .insert([notification])
        .select('id')
        .single();

      if (error) {
        console.error('Error scheduling notification:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Schedule bulk notifications
   */
  async scheduleBulkNotifications(
    userIds: string[],
    type: NotificationType,
    channel: 'email' | 'push' | 'inapp',
    title: string,
    content: string,
    scheduledFor: Date,
    options: {
      templateVariables?: Record<string, unknown>;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      maxRetries?: number;
    } = {}
  ): Promise<string[]> {
    const scheduledIds: string[] = [];

    for (const userId of userIds) {
      const id = await this.scheduleNotification(
        userId,
        type,
        channel,
        title,
        content,
        scheduledFor,
        options
      );

      if (id) {
        scheduledIds.push(id);
      }
    }

    return scheduledIds;
  }

  /**
   * Schedule session reminders
   */
  async scheduleSessionReminders(
    sessionId: string,
    participantIds: string[],
    sessionTitle: string,
    sessionDateTime: Date,
    coachName: string
  ): Promise<void> {
    try {
      // Get participant notification preferences
      const { data: participants } = await this.supabase
        .from('users')
        .select(`
          id, email, first_name, last_name, language,
          notification_preferences (
            email_session_reminders,
            push_session_reminders,
            inapp_session_reminders,
            reminder_timing,
            quiet_hours_enabled,
            quiet_hours_start,
            quiet_hours_end,
            timezone
          )
        `)
        .in('id', participantIds);

      if (!participants) return;

      for (const participant of participants) {
        const prefs = participant.notification_preferences;
        if (!prefs) continue;

        const reminderMinutes = prefs.reminder_timing || 15;
        const reminderTime = new Date(sessionDateTime.getTime() - reminderMinutes * 60 * 1000);

        // Check if reminder time is within quiet hours
        const isQuietTime = this.isWithinQuietHours(
          reminderTime,
          prefs.quiet_hours_enabled,
          prefs.quiet_hours_start,
          prefs.quiet_hours_end,
          prefs.timezone
        );

        const templateVariables = {
          user_name: `${participant.first_name} ${participant.last_name}`.trim(),
          session_title: sessionTitle,
          coach_name: coachName,
          session_time: sessionDateTime.toLocaleString(),
          session_date: sessionDateTime.toLocaleDateString(),
          reminder_time: `${reminderMinutes} minutes`,
          session_url: `${process.env.NEXT_PUBLIC_BASE_URL}/sessions/${sessionId}`,
        };

        // Schedule email reminder
        if (prefs.email_session_reminders && !isQuietTime) {
          await this.scheduleNotification(
            participant.id,
            'session_reminder',
            'email',
            'Session Reminder',
            `Your session "${sessionTitle}" with ${coachName} starts in ${reminderMinutes} minutes.`,
            reminderTime,
            { templateVariables, priority: 'high' }
          );
        }

        // Schedule push reminder
        if (prefs.push_session_reminders && !isQuietTime) {
          await this.scheduleNotification(
            participant.id,
            'session_reminder',
            'push',
            'Session Reminder',
            `Your session "${sessionTitle}" with ${coachName} starts in ${reminderMinutes} minutes.`,
            reminderTime,
            { templateVariables, priority: 'high' }
          );
        }

        // Schedule in-app reminder
        if (prefs.inapp_session_reminders) {
          await this.scheduleNotification(
            participant.id,
            'session_reminder',
            'inapp',
            'Session Reminder',
            `Your session "${sessionTitle}" with ${coachName} starts in ${reminderMinutes} minutes.`,
            reminderTime,
            { templateVariables, priority: 'high' }
          );
        }
      }

      console.log(`Scheduled reminders for ${participants.length} participants for session: ${sessionTitle}`);
    } catch (error) {
      console.error('Error scheduling session reminders:', error);
    }
  }

  /**
   * Cancel scheduled notifications
   */
  async cancelScheduledNotifications(
    filters: {
      userId?: string;
      sessionId?: string;
      type?: NotificationType;
      channel?: string;
    }
  ): Promise<number> {
    try {
      let query = this.supabase
        .from('scheduled_notifications')
        .update({ status: 'cancelled' })
        .eq('status', 'pending');

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.channel) {
        query = query.eq('channel', filters.channel);
      }

      if (filters.sessionId) {
        query = query.contains('template_variables', { session_id: filters.sessionId });
      }

      const { data, error } = await query.select('id');

      if (error) {
        console.error('Error cancelling scheduled notifications:', error);
        return 0;
      }

      return data.length;
    } catch (error) {
      console.error('Error cancelling scheduled notifications:', error);
      return 0;
    }
  }

  /**
   * Process pending notifications (called by cron job)
   */
  async processPendingNotifications(): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {
    if (this.isProcessing) {
      console.log('Notification processing already in progress, skipping...');
      return { processed: 0, sent: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let sent = 0;
    let failed = 0;

    try {
      // Get notifications due for sending (5 minutes buffer)
      const now = new Date();
      const bufferTime = new Date(now.getTime() + 5 * 60 * 1000);

      const { data: notifications, error } = await this.supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', bufferTime.toISOString())
        .order('priority', { ascending: false })
        .order('scheduled_for', { ascending: true })
        .limit(100); // Process in batches of 100

      if (error) {
        console.error('Error fetching pending notifications:', error);
        return { processed, sent, failed };
      }

      if (!notifications || notifications.length === 0) {
        console.log('No pending notifications to process');
        return { processed, sent, failed };
      }

      console.log(`Processing ${notifications.length} pending notifications...`);

      // Process each notification
      for (const notification of notifications) {
        processed++;

        try {
          // Mark as processing
          await this.supabase
            .from('scheduled_notifications')
            .update({ status: 'processing' })
            .eq('id', notification.id);

          const success = await this.sendNotification(notification);

          if (success) {
            sent++;
            await this.supabase
              .from('scheduled_notifications')
              .update({ 
                status: 'sent',
                sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', notification.id);
          } else {
            failed++;
            const newRetryCount = notification.retry_count + 1;
            
            if (newRetryCount >= notification.max_retries) {
              // Mark as failed permanently
              await this.supabase
                .from('scheduled_notifications')
                .update({ 
                  status: 'failed',
                  retry_count: newRetryCount,
                  updated_at: new Date().toISOString()
                })
                .eq('id', notification.id);
            } else {
              // Schedule for retry (exponential backoff)
              const retryDelay = Math.pow(2, newRetryCount) * 60 * 1000; // 2^retry minutes
              const retryTime = new Date(now.getTime() + retryDelay);
              
              await this.supabase
                .from('scheduled_notifications')
                .update({ 
                  status: 'pending',
                  retry_count: newRetryCount,
                  scheduled_for: retryTime.toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', notification.id);
            }
          }

          // Small delay to avoid overwhelming services
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing notification ${notification.id}:`, error);
          failed++;
          
          await this.supabase
            .from('scheduled_notifications')
            .update({ 
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date().toISOString()
            })
            .eq('id', notification.id);
        }
      }

      console.log(`Notification processing complete: ${sent} sent, ${failed} failed out of ${processed} processed`);
    } catch (error) {
      console.error('Error in processPendingNotifications:', error);
    } finally {
      this.isProcessing = false;
    }

    return { processed, sent, failed };
  }

  /**
   * Send a notification via the appropriate channel
   */
  private async sendNotification(notification: unknown): Promise<boolean> {
    try {
      // Get user details
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('email, first_name, last_name, language')
        .eq('id', notification.user_id)
        .single();

      if (userError || !user) {
        console.error('User not found for notification:', notification.id);
        return false;
      }

      const userName = `${user.first_name} ${user.last_name}`.trim();
      const templateVariables = {
        ...notification.template_variables,
        user_name: userName,
      };

      switch (notification.channel) {
        case 'email':
          const emailResult = await this.emailService.sendEmailFromTemplate(
            notification.user_id,
            user.email,
            notification.type,
            templateVariables,
            user.language || 'en'
          );
          return emailResult.success;

        case 'push':
          const pushResult = await this.pushService.sendPushNotification(
            notification.user_id,
            {
              title: notification.title,
              body: notification.message,
              data: {
                notificationId: notification.id,
                type: notification.type,
                ...templateVariables,
              },
              requireInteraction: notification.priority === 'urgent',
            }
          );
          return pushResult.success;

        case 'inapp':
          // Create in-app notification record
          const { error: inappError } = await this.supabase
            .from('notifications')
            .insert({
              user_id: notification.user_id,
              type: notification.type,
              channel: 'inapp',
              title: notification.title,
              message: notification.message,
              data: templateVariables,
              priority: notification.priority,
            });
          
          return !inappError;

        default:
          console.error('Unknown notification channel:', notification.channel);
          return false;
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  /**
   * Check if a time is within quiet hours
   */
  private isWithinQuietHours(
    time: Date,
    quietHoursEnabled: boolean,
    quietStart: string,
    quietEnd: string,
    timezone: string
  ): boolean {
    if (!quietHoursEnabled) return false;

    try {
      // Convert time to user's timezone
      const userTime = new Date(time.toLocaleString('en-US', { timeZone: timezone }));
      const timeHours = userTime.getHours();
      const timeMinutes = userTime.getMinutes();
      const timeInMinutes = timeHours * 60 + timeMinutes;

      const [startHour, startMin] = quietStart.split(':').map(Number);
      const [endHour, endMin] = quietEnd.split(':').map(Number);
      const startInMinutes = startHour * 60 + startMin;
      const endInMinutes = endHour * 60 + endMin;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startInMinutes > endInMinutes) {
        return timeInMinutes >= startInMinutes || timeInMinutes <= endInMinutes;
      } else {
        return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
      }
    } catch (error) {
      console.error('Error checking quiet hours:', error);
      return false;
    }
  }

  /**
   * Clean up old notifications and delivery logs
   */
  async cleanupOldData(): Promise<{
    notificationsDeleted: number;
    logsDeleted: number;
  }> {
    try {
      // Delete old scheduled notifications (completed/failed older than 30 days)
      const { data: oldNotifications } = await this.supabase
        .from('scheduled_notifications')
        .delete()
        .in('status', ['sent', 'failed', 'cancelled'])
        .lt('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .select('id');

      // Clean up notification delivery logs older than 90 days
      const { data: oldLogs } = await this.supabase
        .from('notification_delivery_logs')
        .delete()
        .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .select('id');

      // Clean up old push subscriptions
      await this.pushService.cleanupExpiredSubscriptions();

      return {
        notificationsDeleted: oldNotifications?.length || 0,
        logsDeleted: oldLogs?.length || 0,
      };
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      return { notificationsDeleted: 0, logsDeleted: 0 };
    }
  }

  /**
   * Start automatic processing (for server environments)
   */
  startProcessing(intervalMs: number = 60000): void {
    if (this.processingInterval) {
      this.stopProcessing();
    }

    console.log(`Starting notification processor with ${intervalMs}ms interval`);
    
    this.processingInterval = setInterval(async () => {
      await this.processPendingNotifications();
    }, intervalMs);

    // Process immediately on start
    this.processPendingNotifications();
  }

  /**
   * Stop automatic processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Stopped notification processor');
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    byChannel: Record<string, number>;
    byType: Record<string, number>;
  }> {
    try {
      let query = this.supabase
        .from('scheduled_notifications')
        .select('status, channel, type');

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notification stats:', error);
        return { total: 0, pending: 0, sent: 0, failed: 0, byChannel: {}, byType: {} };
      }

      const stats = data.reduce((acc, notification) => {
        acc.total++;
        acc[notification.status] = (acc[notification.status] || 0) + 1;
        acc.byChannel[notification.channel] = (acc.byChannel[notification.channel] || 0) + 1;
        acc.byType[notification.type] = (acc.byType[notification.type] || 0) + 1;
        return acc;
      }, { 
        total: 0, 
        pending: 0, 
        sent: 0, 
        failed: 0, 
        byChannel: {} as Record<string, number>, 
        byType: {} as Record<string, number> 
      });

      return stats;
    } catch (error) {
      console.error('Error calculating notification stats:', error);
      return { total: 0, pending: 0, sent: 0, failed: 0, byChannel: {}, byType: {} };
    }
  }
}