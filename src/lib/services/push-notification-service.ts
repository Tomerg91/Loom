export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

interface WebPushConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
}

type ServerClientFactory = typeof import('@/lib/supabase/server').createServerClient;
type BrowserClientFactory = typeof import('@/lib/supabase/client').createClient;

export class PushNotificationService {
  private supabase: ReturnType<ServerClientFactory> | ReturnType<BrowserClientFactory>;
  private config: WebPushConfig | null = null;

  constructor(isServer = true) {
    if (isServer) {
      const { createServerClient } = require('@/lib/supabase/server');
      this.supabase = (createServerClient as ServerClientFactory)();
    } else {
      const { createClient } = require('@/lib/supabase/client');
      this.supabase = (createClient as BrowserClientFactory)();
    }
    this.initializeConfig();
  }

  private initializeConfig() {
    this.config = {
      vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
      vapidSubject:
        process.env.VAPID_SUBJECT || 'mailto:support@loom-coaching.com',
    };
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  getVapidPublicKey(): string {
    return this.config?.vapidPublicKey || '';
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribeUser(
    userId: string,
    subscription: any
  ): Promise<PushSubscription | null> {
    try {
      const subscriptionData = {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : '',
      };

      // Check if subscription already exists
      const { data: existing } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
        .single();

      if (existing) {
        // Update existing subscription
        const { data, error } = await this.supabase
          .from('push_subscriptions')
          .update({
            p256dh_key: subscriptionData.p256dh_key,
            auth_key: subscriptionData.auth_key,
            user_agent: subscriptionData.user_agent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          logger.error('Error updating push subscription:', error);
          return null;
        }

        return this.mapDatabaseSubscription(data);
      } else {
        // Create new subscription
        const { data, error } = await this.supabase
          .from('push_subscriptions')
          .insert([subscriptionData])
          .select()
          .single();

        if (error) {
          logger.error('Error creating push subscription:', error);
          return null;
        }

        return this.mapDatabaseSubscription(data);
      }
    } catch (error) {
      logger.error('Error subscribing user to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribeUser(userId: string, endpoint?: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (endpoint) {
        query = query.eq('endpoint', endpoint);
      }

      const { error } = await query;

      if (error) {
        logger.error('Error unsubscribing from push notifications:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error unsubscribing user from push notifications:', error);
      return false;
    }
  }

  /**
   * Get user's push subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    try {
      const { data, error } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        logger.error('Error fetching user subscriptions:', error);
        return [];
      }

      return data.map(this.mapDatabaseSubscription);
    } catch (error) {
      logger.error('Error getting user subscriptions:', error);
      return [];
    }
  }

  /**
   * Send push notification to user
   */
  async sendPushNotification(
    userId: string,
    payload: PushNotificationPayload,
    options?: {
      ttl?: number;
      urgency?: 'very-low' | 'low' | 'normal' | 'high';
      topic?: string;
    }
  ): Promise<{ success: boolean; results: any[] }> {
    try {
      // Get user's push subscriptions
      const subscriptions = await this.getUserSubscriptions(userId);

      if (subscriptions.length === 0) {
        logger.debug('No push subscriptions found for user:', userId);
        return { success: true, results: [] };
      }

      // Prepare notification payload
      const notificationPayload = {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/favicon.ico',
        badge: payload.badge || '/favicon.ico',
        image: payload.image,
        tag: payload.tag || `loom-${Date.now()}`,
        data: {
          url: payload.data?.url || '/dashboard',
          notificationId: payload.data?.notificationId,
          ...payload.data,
        },
        actions: payload.actions || [],
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        timestamp: payload.timestamp || Date.now(),
        vibrate: payload.vibrate || [200, 100, 200],
      };

      // Send to each subscription (in a real app, you'd use a service like Firebase or a web-push library)
      const results = await Promise.allSettled(
        subscriptions.map(async subscription => {
          try {
            // In a production environment, you would use web-push library here
            // For now, we'll simulate the push notification sending
            logger.debug('Sending push notification to:', subscription.endpoint);
            logger.debug('Payload:', notificationPayload);

            // Log the delivery attempt
            await this.logPushDelivery(
              payload.data?.notificationId,
              subscription.id,
              'sent',
              null
            );

            return { success: true, subscriptionId: subscription.id };
          } catch (error) {
            logger.error('Failed to send push notification:', error);

            // Log the delivery failure
            await this.logPushDelivery(
              payload.data?.notificationId,
              subscription.id,
              'failed',
              error instanceof Error ? error.message : 'Unknown error'
            );

            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      const successCount = results.filter(
        result => result.status === 'fulfilled' && result.value.success
      ).length;

      logger.debug(
        `Push notification sent to ${successCount}/${subscriptions.length} subscriptions`
      );

      return {
        success: successCount > 0,
        results: results.map(result =>
          result.status === 'fulfilled'
            ? result.value
            : { success: false, error: result.reason }
        ),
      };
    } catch (error) {
      logger.error('Error sending push notification:', error);
      return { success: false, results: [] };
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendBulkPushNotifications(
    userIds: string[],
    payload: PushNotificationPayload,
    options?: {
      ttl?: number;
      urgency?: 'very-low' | 'low' | 'normal' | 'high';
      topic?: string;
    }
  ): Promise<{ totalSent: number; totalFailed: number; results: any[] }> {
    try {
      const results = await Promise.allSettled(
        userIds.map(userId =>
          this.sendPushNotification(userId, payload, options)
        )
      );

      let totalSent = 0;
      let totalFailed = 0;
      const allResults: any[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const userResult = result.value;
          allResults.push({ userId: userIds[index], ...userResult });

          userResult.results.forEach(r => {
            if (r.success) totalSent++;
            else totalFailed++;
          });
        } else {
          totalFailed++;
          allResults.push({
            userId: userIds[index],
            success: false,
            error: result.reason,
          });
        }
      });

      return { totalSent, totalFailed, results: allResults };
    } catch (error) {
      logger.error('Error sending bulk push notifications:', error);
      return { totalSent: 0, totalFailed: userIds.length, results: [] };
    }
  }

  /**
   * Clean up expired or invalid subscriptions
   */
  async cleanupExpiredSubscriptions(): Promise<number> {
    try {
      // Remove subscriptions older than 90 days with no recent activity
      const { data, error } = await this.supabase
        .from('push_subscriptions')
        .delete()
        .lt(
          'updated_at',
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        )
        .select('id');

      if (error) {
        logger.error('Error cleaning up expired subscriptions:', error);
        return 0;
      }

      logger.debug(`Cleaned up ${data.length} expired push subscriptions`);
      return data.length;
    } catch (error) {
      logger.error('Error cleaning up expired subscriptions:', error);
      return 0;
    }
  }

  /**
   * Log push notification delivery attempt
   */
  private async logPushDelivery(
    notificationId: string | undefined,
    subscriptionId: string,
    status: 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked',
    errorMessage: string | null = null
  ): Promise<void> {
    try {
      if (!notificationId) return;

      const logData: any = {
        notification_id: notificationId,
        channel: 'push',
        status,
        error_message: errorMessage,
        provider_id: subscriptionId,
      };

      switch (status) {
        case 'sent':
          logData.sent_at = new Date().toISOString();
          break;
        case 'delivered':
          logData.delivered_at = new Date().toISOString();
          break;
        case 'failed':
          logData.failed_at = new Date().toISOString();
          break;
        case 'opened':
          logData.opened_at = new Date().toISOString();
          break;
        case 'clicked':
          logData.clicked_at = new Date().toISOString();
          break;
      }

      await this.supabase.from('notification_delivery_logs').insert([logData]);
    } catch (error) {
      logger.error('Error logging push delivery:', error);
    }
  }

  /**
   * Map database subscription to interface
   */
  private mapDatabaseSubscription(data: any): PushSubscription {
    return {
      id: data.id,
      userId: data.user_id,
      endpoint: data.endpoint,
      keys: {
        p256dh: data.p256dh_key,
        auth: data.auth_key,
      },
      userAgent: data.user_agent,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Check if push notifications are supported
   */
  static isPushSupported(): boolean {
    if (typeof window === 'undefined') return false;

    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Get notification permission status
   */
  static getNotificationPermission(): NotificationPermission {
    if (typeof window === 'undefined') return 'default';
    return Notification.permission;
  }

  /**
   * Request notification permission
   */
  static async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined') return 'denied';

    if (!this.isPushSupported()) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }
}
