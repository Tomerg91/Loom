/**
 * Notification Interaction Analytics
 *
 * Tracks notification-related user interactions including:
 * - Notification delivery and display
 * - Notification clicks and dismissals
 * - Notification preferences and settings
 * - Push notification permissions
 * - Notification engagement metrics
 */

import { trackEvent, posthogEvent } from './analytics';
import * as Sentry from '@sentry/nextjs';

export interface NotificationEvent {
  userId: string;
  notificationId: string;
  notificationType:
    | 'session_reminder'
    | 'task_due'
    | 'goal_milestone'
    | 'message'
    | 'system'
    | 'marketing'
    | 'update';
  metadata?: Record<string, unknown>;
}

/**
 * Track notification delivered
 */
export const trackNotificationDelivered = (
  data: NotificationEvent & {
    channel: 'push' | 'email' | 'in_app' | 'sms';
    priority: 'high' | 'medium' | 'low';
  }
) => {
  const eventData = {
    action: 'notification_delivered',
    category: 'notification_engagement',
    label: data.notificationType,
    userId: data.userId,
    properties: {
      notificationId: data.notificationId,
      notificationType: data.notificationType,
      channel: data.channel,
      priority: data.priority,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('notification_delivered', eventData.properties);

  // Track delivery metrics
  Sentry.metrics.increment('notifications_delivered', 1, {
    tags: {
      type: data.notificationType,
      channel: data.channel,
      priority: data.priority,
    },
  });
};

/**
 * Track notification displayed (seen by user)
 */
export const trackNotificationDisplayed = (
  data: NotificationEvent & {
    channel: 'push' | 'email' | 'in_app' | 'sms';
    displayTimeMs?: number;
  }
) => {
  const eventData = {
    action: 'notification_displayed',
    category: 'notification_engagement',
    label: data.notificationType,
    userId: data.userId,
    properties: {
      notificationId: data.notificationId,
      notificationType: data.notificationType,
      channel: data.channel,
      displayTimeMs: data.displayTimeMs,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('notification_displayed', eventData.properties);

  // Track display metrics
  Sentry.metrics.increment('notifications_displayed', 1, {
    tags: {
      type: data.notificationType,
      channel: data.channel,
    },
  });

  // Track time to display
  if (data.displayTimeMs) {
    Sentry.metrics.distribution(
      'notification_display_latency',
      data.displayTimeMs,
      {
        tags: {
          channel: data.channel,
        },
        unit: 'millisecond',
      }
    );
  }
};

/**
 * Track notification clicked
 */
export const trackNotificationClicked = (
  data: NotificationEvent & {
    channel: 'push' | 'email' | 'in_app' | 'sms';
    clickAction?: string;
    clickDestination?: string;
    timeSinceDeliverySeconds?: number;
  }
) => {
  const eventData = {
    action: 'notification_clicked',
    category: 'notification_engagement',
    label: data.notificationType,
    userId: data.userId,
    properties: {
      notificationId: data.notificationId,
      notificationType: data.notificationType,
      channel: data.channel,
      clickAction: data.clickAction,
      clickDestination: data.clickDestination,
      timeSinceDeliverySeconds: data.timeSinceDeliverySeconds,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('notification_clicked', eventData.properties);

  // Track click metrics
  Sentry.metrics.increment('notifications_clicked', 1, {
    tags: {
      type: data.notificationType,
      channel: data.channel,
      action: data.clickAction || 'default',
    },
  });

  // Track time to click
  if (data.timeSinceDeliverySeconds) {
    Sentry.metrics.distribution(
      'notification_click_latency',
      data.timeSinceDeliverySeconds,
      {
        tags: {
          type: data.notificationType,
          channel: data.channel,
        },
        unit: 'second',
      }
    );
  }
};

/**
 * Track notification dismissed
 */
export const trackNotificationDismissed = (
  data: NotificationEvent & {
    channel: 'push' | 'email' | 'in_app' | 'sms';
    dismissMethod: 'swipe' | 'click' | 'auto' | 'clear_all';
    timeSinceDeliverySeconds?: number;
  }
) => {
  const eventData = {
    action: 'notification_dismissed',
    category: 'notification_engagement',
    label: data.notificationType,
    userId: data.userId,
    properties: {
      notificationId: data.notificationId,
      notificationType: data.notificationType,
      channel: data.channel,
      dismissMethod: data.dismissMethod,
      timeSinceDeliverySeconds: data.timeSinceDeliverySeconds,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('notification_dismissed', eventData.properties);

  // Track dismissal metrics
  Sentry.metrics.increment('notifications_dismissed', 1, {
    tags: {
      type: data.notificationType,
      channel: data.channel,
      method: data.dismissMethod,
    },
  });
};

/**
 * Track push notification permission request
 */
export const trackPushPermissionRequest = (data: {
  userId: string;
  trigger: 'onboarding' | 'settings' | 'prompt' | 'feature_gate';
  result: 'granted' | 'denied' | 'dismissed' | 'error';
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'push_permission_request',
    category: 'notification_settings',
    label: data.result,
    userId: data.userId,
    properties: {
      trigger: data.trigger,
      result: data.result,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('push_permission_request', eventData.properties);

  // Track permission metrics
  Sentry.metrics.increment('push_permission_requests', 1, {
    tags: {
      trigger: data.trigger,
      result: data.result,
    },
  });

  // Update user properties
  if (typeof window !== 'undefined' && window.posthog && data.result === 'granted') {
    window.posthog.identify(data.userId, {
      push_notifications_enabled: true,
      push_permission_granted_at: new Date().toISOString(),
    });
  }
};

/**
 * Track notification preferences update
 */
export const trackNotificationPreferencesUpdate = (data: {
  userId: string;
  preferences: {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    smsEnabled?: boolean;
    inAppEnabled?: boolean;
    notificationTypes?: string[];
    frequency?: 'realtime' | 'digest' | 'off';
  };
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'notification_preferences_update',
    category: 'notification_settings',
    label: 'preferences',
    userId: data.userId,
    properties: {
      ...data.preferences,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('notification_preferences_update', eventData.properties);

  // Update user properties for segmentation
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.identify(data.userId, {
      notification_email_enabled: data.preferences.emailEnabled,
      notification_push_enabled: data.preferences.pushEnabled,
      notification_sms_enabled: data.preferences.smsEnabled,
      notification_frequency: data.preferences.frequency,
    });
  }

  // Track preference changes
  Sentry.metrics.increment('notification_preference_changes', 1, {
    tags: {
      frequency: data.preferences.frequency || 'unknown',
    },
  });
};

/**
 * Track notification opt-out
 */
export const trackNotificationOptOut = (data: {
  userId: string;
  channel: 'push' | 'email' | 'sms' | 'all';
  reason?: 'too_many' | 'not_relevant' | 'privacy' | 'spam' | 'other';
  notificationType?: string;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'notification_opt_out',
    category: 'notification_settings',
    label: data.channel,
    userId: data.userId,
    properties: {
      channel: data.channel,
      reason: data.reason,
      notificationType: data.notificationType,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('notification_opt_out', eventData.properties);

  // Track opt-out metrics
  Sentry.metrics.increment('notification_opt_outs', 1, {
    tags: {
      channel: data.channel,
      reason: data.reason || 'unknown',
    },
  });
};

/**
 * Track notification engagement rate
 */
export const trackNotificationEngagementRate = (data: {
  userId: string;
  notificationType: string;
  channel: string;
  deliveredCount: number;
  clickedCount: number;
  dismissedCount: number;
  engagementRate: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'notification_engagement_rate',
    category: 'notification_metrics',
    label: data.notificationType,
    value: data.engagementRate,
    userId: data.userId,
    properties: {
      notificationType: data.notificationType,
      channel: data.channel,
      deliveredCount: data.deliveredCount,
      clickedCount: data.clickedCount,
      dismissedCount: data.dismissedCount,
      engagementRate: data.engagementRate,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('notification_engagement_rate', eventData.properties);

  // Track engagement rate distribution
  Sentry.metrics.distribution(
    'notification_engagement_rate',
    data.engagementRate,
    {
      tags: {
        type: data.notificationType,
        channel: data.channel,
      },
      unit: 'percent',
    }
  );
};

/**
 * Track notification action button click
 */
export const trackNotificationActionClick = (
  data: NotificationEvent & {
    actionId: string;
    actionLabel: string;
    actionType: 'primary' | 'secondary' | 'dismiss';
  }
) => {
  const eventData = {
    action: 'notification_action_click',
    category: 'notification_engagement',
    label: `${data.notificationType}:${data.actionLabel}`,
    userId: data.userId,
    properties: {
      notificationId: data.notificationId,
      notificationType: data.notificationType,
      actionId: data.actionId,
      actionLabel: data.actionLabel,
      actionType: data.actionType,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('notification_action_click', eventData.properties);

  // Track action clicks
  Sentry.metrics.increment('notification_action_clicks', 1, {
    tags: {
      type: data.notificationType,
      action: data.actionId,
      action_type: data.actionType,
    },
  });
};

/**
 * Track notification delivery failure
 */
export const trackNotificationDeliveryFailure = (
  data: NotificationEvent & {
    channel: 'push' | 'email' | 'sms';
    errorType: 'network' | 'permission' | 'invalid_token' | 'rate_limit' | 'unknown';
    errorMessage?: string;
    retryCount?: number;
  }
) => {
  const eventData = {
    action: 'notification_delivery_failure',
    category: 'notification_errors',
    label: data.errorType,
    userId: data.userId,
    properties: {
      notificationId: data.notificationId,
      notificationType: data.notificationType,
      channel: data.channel,
      errorType: data.errorType,
      errorMessage: data.errorMessage,
      retryCount: data.retryCount,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('notification_delivery_failure', eventData.properties);

  // Track delivery failures
  Sentry.metrics.increment('notification_delivery_failures', 1, {
    tags: {
      type: data.notificationType,
      channel: data.channel,
      error: data.errorType,
    },
  });

  // Capture error in Sentry
  Sentry.captureMessage('Notification delivery failed', {
    level: 'warning',
    tags: {
      notification_type: data.notificationType,
      channel: data.channel,
      error_type: data.errorType,
    },
    extra: {
      notificationId: data.notificationId,
      errorMessage: data.errorMessage,
      retryCount: data.retryCount,
    },
  });
};

/**
 * Track notification batch operation
 */
export const trackNotificationBatchOperation = (data: {
  userId: string;
  operation: 'mark_all_read' | 'clear_all' | 'archive_all';
  notificationCount: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'notification_batch_operation',
    category: 'notification_management',
    label: data.operation,
    value: data.notificationCount,
    userId: data.userId,
    properties: {
      operation: data.operation,
      notificationCount: data.notificationCount,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('notification_batch_operation', eventData.properties);

  // Track batch operations
  Sentry.metrics.increment('notification_batch_operations', 1, {
    tags: {
      operation: data.operation,
    },
  });

  Sentry.metrics.distribution(
    'notification_batch_size',
    data.notificationCount,
    {
      tags: {
        operation: data.operation,
      },
    }
  );
};
