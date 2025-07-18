import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import type { Notification, NotificationType } from '@/types';
import type { Database } from '@/types/supabase';

// API-specific interfaces
interface GetNotificationsOptions {
  userId: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isArchived?: boolean;
  type?: string;
}

interface GetNotificationsCountOptions {
  userId: string;
  isRead?: boolean;
  isArchived?: boolean;
  type?: string;
}

interface CreateNotificationData {
  userId: string;
  type: 'session_reminder' | 'new_message' | 'session_confirmation' | 'system_update';
  title: string;
  content: string;
  scheduledFor?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  private supabase: ReturnType<typeof createServerClient> | ReturnType<typeof createClient>;

  constructor(isServer = true) {
    this.supabase = isServer ? createServerClient() : createClient();
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string, 
    limit = 50, 
    includeRead = false
  ): Promise<Notification[]> {
    let queryBuilder = this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (!includeRead) {
      queryBuilder = queryBuilder.is('read_at', null);
    }

    queryBuilder = queryBuilder
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data.map(this.mapDatabaseNotificationToNotification);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Create new notification
   */
  async createNotification(notificationData: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    scheduledFor?: Date;
  }): Promise<Notification | null> {
    const { data, error } = await this.supabase
      .rpc('send_notification', {
        user_id: notificationData.userId,
        notification_type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data ? JSON.stringify(notificationData.data) : null,
        scheduled_for: notificationData.scheduledFor?.toISOString() || new Date().toISOString(),
      });

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return this.getNotification(data);
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: string): Promise<Notification | null> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (error) {
      console.error('Error fetching notification:', error);
      return null;
    }

    return this.mapDatabaseNotificationToNotification(data);
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(
    userId: string, 
    notificationIds?: string[]
  ): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('mark_notifications_read', {
        user_id: userId,
        notification_ids: notificationIds || undefined,
      });

    if (error) {
      console.error('Error marking notifications as read:', error);
      return 0;
    }

    return data;
  }

  /**
   * Mark single notification as read
   */
  async markSingleAsRead(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting all notifications:', error);
      return false;
    }

    return true;
  }

  /**
   * Get notifications by type
   */
  async getNotificationsByType(
    userId: string, 
    type: NotificationType, 
    limit = 20
  ): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications by type:', error);
      return [];
    }

    return data.map(this.mapDatabaseNotificationToNotification);
  }

  /**
   * Create session reminder notification
   */
  async createSessionReminder(
    userId: string, 
    sessionId: string, 
    sessionTitle: string, 
    scheduledAt: Date
  ): Promise<Notification | null> {
    const reminderTime = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000); // 24 hours before

    return this.createNotification({
      userId,
      type: 'session_reminder',
      title: 'Session Reminder',
      message: `Your session "${sessionTitle}" is scheduled for tomorrow`,
      data: { sessionId, sessionTitle, scheduledAt: scheduledAt.toISOString() },
      scheduledFor: reminderTime,
    });
  }

  /**
   * Create new message notification
   */
  async createNewMessageNotification(
    userId: string, 
    fromUserName: string, 
    messageType: string
  ): Promise<Notification | null> {
    return this.createNotification({
      userId,
      type: 'new_message',
      title: 'New Message',
      message: `${fromUserName} sent you a new ${messageType}`,
      data: { fromUserName, messageType },
    });
  }

  /**
   * Create session confirmation notification
   */
  async createSessionConfirmation(
    userId: string, 
    sessionId: string, 
    sessionTitle: string
  ): Promise<Notification | null> {
    return this.createNotification({
      userId,
      type: 'session_confirmation',
      title: 'Session Confirmed',
      message: `Your session "${sessionTitle}" has been confirmed`,
      data: { sessionId, sessionTitle },
    });
  }


  /**
   * Create system update notification
   */
  async createSystemUpdate(
    userId: string, 
    updateTitle: string, 
    updateMessage: string
  ): Promise<Notification | null> {
    return this.createNotification({
      userId,
      type: 'system_update' as NotificationType,
      title: updateTitle,
      message: updateMessage,
    });
  }

  /**
   * Get scheduled notifications that need to be sent
   */
  async getScheduledNotifications(): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .lte('scheduled_for', new Date().toISOString())
      .is('sent_at', null)
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('Error fetching scheduled notifications:', error);
      return [];
    }

    return data.map(this.mapDatabaseNotificationToNotification);
  }

  /**
   * Mark notification as sent
   */
  async markAsSent(notificationId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as sent:', error);
      return false;
    }

    return true;
  }

  /**
   * Map database notification to application notification type
   */
  private mapDatabaseNotificationToNotification(
    dbNotification: Database['public']['Tables']['notifications']['Row']
  ): Notification {
    return {
      id: dbNotification.id,
      userId: dbNotification.user_id,
      type: dbNotification.type as NotificationType,
      title: dbNotification.title,
      message: dbNotification.message,
      data: dbNotification.data as Record<string, unknown> || {},
      readAt: dbNotification.read_at || undefined,
      sentAt: dbNotification.sent_at || undefined,
      scheduledFor: dbNotification.scheduled_for,
      createdAt: dbNotification.created_at,
      updatedAt: dbNotification.updated_at,
    };
  }

  /**
   * Get notifications with pagination and filtering (for API)
   */
  async getNotificationsPaginated(options: GetNotificationsOptions): Promise<Notification[]> {
    let query = this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', options.userId);

    // Apply filters
    if (options.isRead !== undefined) {
      if (options.isRead) {
        query = query.not('read_at', 'is', null);
      } else {
        query = query.is('read_at', null);
      }
    }
    if (options.type) {
      query = query.eq('type', options.type as 'session_reminder' | 'new_message' | 'session_confirmation' | 'system_update');
    }

    // Apply sorting
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications with pagination:', error);
      return [];
    }

    return data.map(this.mapDatabaseNotificationToNotification);
  }

  /**
   * Get total count of notifications (for API pagination)
   */
  async getNotificationsCount(options: GetNotificationsCountOptions): Promise<number> {
    let query = this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', options.userId);

    // Apply filters
    if (options.isRead !== undefined) {
      if (options.isRead) {
        query = query.not('read_at', 'is', null);
      } else {
        query = query.is('read_at', null);
      }
    }
    if (options.type) {
      query = query.eq('type', options.type as 'session_reminder' | 'new_message' | 'session_confirmation' | 'system_update');
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting notifications:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Create notification (for API)
   */
  async createNotificationFromApi(notificationData: CreateNotificationData): Promise<Notification | null> {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.content,
        data: JSON.parse(JSON.stringify(notificationData.metadata || {})),
        scheduled_for: notificationData.scheduledFor,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return this.mapDatabaseNotificationToNotification(data);
  }
}

// Export individual functions for API usage
const notificationService = new NotificationService(true);

export const getNotificationsPaginated = (options: GetNotificationsOptions) => notificationService.getNotificationsPaginated(options);
export const getNotificationsCount = (options: GetNotificationsCountOptions) => notificationService.getNotificationsCount(options);
export const createNotification = (notificationData: CreateNotificationData) => notificationService.createNotificationFromApi(notificationData);