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
   * Get notifications by IDs for a specific user
   */
  async getNotificationsByIds(notificationIds: string[], userId: string): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .in('id', notificationIds)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching notifications by IDs:', error);
      return [];
    }

    return data.map(this.mapDatabaseNotificationToNotification);
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<{ count: number; processedIds: string[] }> {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', notificationIds)
      .eq('user_id', userId)
      .is('read_at', null)
      .select('id');

    if (error) {
      console.error('Error marking multiple notifications as read:', error);
      return { count: 0, processedIds: [] };
    }

    return { count: data.length, processedIds: data.map(n => n.id) };
  }

  /**
   * Delete multiple notifications
   */
  async deleteMultiple(notificationIds: string[], userId: string): Promise<{ count: number; processedIds: string[] }> {
    const { data, error } = await this.supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      console.error('Error deleting multiple notifications:', error);
      return { count: 0, processedIds: [] };
    }

    return { count: data.length, processedIds: data.map(n => n.id) };
  }

  /**
   * Archive multiple notifications (mark as archived and read)
   */
  async archiveMultiple(notificationIds: string[], userId: string): Promise<{ count: number; processedIds: string[] }> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('notifications')
      .update({ 
        data: this.supabase.rpc('jsonb_set', { 
          target: 'data', 
          path: '{isArchived}', 
          value: JSON.stringify(true) 
        }),
        read_at: now
      })
      .in('id', notificationIds)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      console.error('Error archiving multiple notifications:', error);
      return { count: 0, processedIds: [] };
    }

    return { count: data.length, processedIds: data.map(n => n.id) };
  }

  /**
   * Get notifications for export with optional filtering
   */
  async getNotificationsForExport(filters: {
    userId: string;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Notification[]> {
    let queryBuilder = this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', filters.userId);

    if (filters.type) {
      queryBuilder = queryBuilder.eq('type', filters.type);
    }

    if (filters.startDate) {
      queryBuilder = queryBuilder.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      queryBuilder = queryBuilder.lte('created_at', filters.endDate);
    }

    queryBuilder = queryBuilder
      .order(filters.sortBy || 'created_at', { ascending: filters.sortOrder === 'asc' })
      .limit(filters.limit || 1000);

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching notifications for export:', error);
      return [];
    }

    return data.map(this.mapDatabaseNotificationToNotification);
  }

  /**
   * Get paginated notifications with enhanced filtering
   * Supports filtering by read status, archive status, type, and custom sorting
   * @param options - Configuration options for pagination and filtering
   * @returns Promise<Notification[]> - Array of filtered notifications
   */
  async getNotificationsPaginated(options: GetNotificationsOptions): Promise<Notification[]> {
    let queryBuilder = this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', options.userId);

    if (options.isRead !== undefined) {
      if (options.isRead) {
        queryBuilder = queryBuilder.not('read_at', 'is', null);
      } else {
        queryBuilder = queryBuilder.is('read_at', null);
      }
    }

    if (options.isArchived !== undefined) {
      if (options.isArchived) {
        queryBuilder = queryBuilder.eq('data->>isArchived', 'true');
      } else {
        queryBuilder = queryBuilder.or('data->>isArchived.is.null,data->>isArchived.eq.false');
      }
    }

    if (options.type) {
      queryBuilder = queryBuilder.eq('type', options.type);
    }

    queryBuilder = queryBuilder
      .order(options.sortBy || 'created_at', { ascending: options.sortOrder === 'asc' })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1);

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching paginated notifications:', error);
      return [];
    }

    return data.map(this.mapDatabaseNotificationToNotification);
  }

  /**
   * Get notifications count with filtering
   * Supports filtering by read status, archive status, and type
   * @param options - Configuration options for filtering
   * @returns Promise<number> - Total count of notifications matching the filters
   */
  async getNotificationsCount(options: GetNotificationsCountOptions): Promise<number> {
    let queryBuilder = this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', options.userId);

    if (options.isRead !== undefined) {
      if (options.isRead) {
        queryBuilder = queryBuilder.not('read_at', 'is', null);
      } else {
        queryBuilder = queryBuilder.is('read_at', null);
      }
    }

    if (options.isArchived !== undefined) {
      if (options.isArchived) {
        queryBuilder = queryBuilder.eq('data->>isArchived', 'true');
      } else {
        queryBuilder = queryBuilder.or('data->>isArchived.is.null,data->>isArchived.eq.false');
      }
    }

    if (options.type) {
      queryBuilder = queryBuilder.eq('type', options.type);
    }

    const { count, error } = await queryBuilder;

    if (error) {
      console.error('Error getting notifications count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Create notification from API data
   * Transforms API data structure and delegates to the main createNotification method
   * @param data - API notification data structure
   * @returns Promise<Notification | null> - Created notification or null if failed
   */
  async createNotificationFromApi(data: CreateNotificationData): Promise<Notification | null> {
    return this.createNotification({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.content,
      data: data.metadata,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
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
      userId: dbNotification.userId || dbNotification.user_id,
      type: dbNotification.type as NotificationType,
      title: dbNotification.title,
      message: dbNotification.message,
      data: dbNotification.data as Record<string, unknown> || {},
      readAt: dbNotification.read_at || undefined,
      sentAt: dbNotification.sent_at || undefined,
      scheduledFor: dbNotification.scheduled_for,
      createdAt: dbNotification.createdAt || dbNotification.created_at,
      updatedAt: dbNotification.updatedAt || dbNotification.updated_at,
    };
  }



}

// Export individual functions for API usage
const notificationService = new NotificationService(true);

/**
 * Get paginated notifications with enhanced filtering (API wrapper)
 * @param options - Configuration options for pagination and filtering
 * @returns Promise<Notification[]> - Array of filtered notifications
 */
export const getNotificationsPaginated = (options: GetNotificationsOptions) => 
  notificationService.getNotificationsPaginated(options);

/**
 * Get notifications count with filtering (API wrapper)
 * @param options - Configuration options for filtering
 * @returns Promise<number> - Total count of notifications matching the filters
 */
export const getNotificationsCount = (options: GetNotificationsCountOptions) => 
  notificationService.getNotificationsCount(options);

/**
 * Create notification from API data (API wrapper)
 * @param notificationData - API notification data structure
 * @returns Promise<Notification | null> - Created notification or null if failed
 */
export const createNotification = (notificationData: CreateNotificationData) => 
  notificationService.createNotificationFromApi(notificationData);