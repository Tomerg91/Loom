/**
 * Realtime Connection Monitoring
 *
 * Monitors and tracks realtime connections including:
 * - WebSocket connection status
 * - Server-Sent Events (SSE) connections
 * - Connection failures and reconnections
 * - Fallback polling activations
 * - Connection latency and performance
 */

import { trackEvent, posthogEvent } from './analytics';
import * as Sentry from '@sentry/nextjs';

export type ConnectionType = 'websocket' | 'sse' | 'polling' | 'long_polling';
export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'failed'
  | 'degraded';

export interface ConnectionEvent {
  userId?: string;
  connectionId: string;
  connectionType: ConnectionType;
  status: ConnectionStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Track connection attempt
 */
export const trackConnectionAttempt = (data: {
  userId?: string;
  connectionId: string;
  connectionType: ConnectionType;
  endpoint?: string;
  attempt: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'connection_attempt',
    category: 'realtime_connection',
    label: data.connectionType,
    value: data.attempt,
    userId: data.userId,
    properties: {
      connectionId: data.connectionId,
      connectionType: data.connectionType,
      endpoint: data.endpoint,
      attempt: data.attempt,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('connection_attempt', eventData.properties);

  // Track connection attempts
  Sentry.metrics.increment('connection_attempts', 1, {
    tags: {
      type: data.connectionType,
      attempt: `${data.attempt}`,
    },
  });

  if (data.attempt > 1) {
    Sentry.captureMessage('Connection retry attempt', {
      level: 'info',
      tags: {
        connection_type: data.connectionType,
        attempt: data.attempt,
      },
    });
  }
};

/**
 * Track successful connection
 */
export const trackConnectionEstablished = (data: {
  userId?: string;
  connectionId: string;
  connectionType: ConnectionType;
  connectTimeMs: number;
  attemptCount: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'connection_established',
    category: 'realtime_connection',
    label: data.connectionType,
    value: data.connectTimeMs,
    userId: data.userId,
    properties: {
      connectionId: data.connectionId,
      connectionType: data.connectionType,
      connectTimeMs: data.connectTimeMs,
      attemptCount: data.attemptCount,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('connection_established', eventData.properties);

  // Track successful connections
  Sentry.metrics.increment('connections_established', 1, {
    tags: {
      type: data.connectionType,
      attempts: `${data.attemptCount}`,
    },
  });

  // Track connection time
  Sentry.metrics.distribution('connection_time', data.connectTimeMs, {
    tags: {
      type: data.connectionType,
    },
    unit: 'millisecond',
  });
};

/**
 * Track connection disconnection
 */
export const trackConnectionDisconnected = (data: {
  userId?: string;
  connectionId: string;
  connectionType: ConnectionType;
  reason:
    | 'user_action'
    | 'network_error'
    | 'server_error'
    | 'timeout'
    | 'idle'
    | 'unknown';
  durationSeconds?: number;
  wasClean: boolean;
  errorCode?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'connection_disconnected',
    category: 'realtime_connection',
    label: `${data.connectionType}:${data.reason}`,
    value: data.durationSeconds,
    userId: data.userId,
    properties: {
      connectionId: data.connectionId,
      connectionType: data.connectionType,
      reason: data.reason,
      durationSeconds: data.durationSeconds,
      wasClean: data.wasClean,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('connection_disconnected', eventData.properties);

  // Track disconnections
  Sentry.metrics.increment('connections_disconnected', 1, {
    tags: {
      type: data.connectionType,
      reason: data.reason,
      clean: data.wasClean ? 'yes' : 'no',
    },
  });

  // Track connection duration
  if (data.durationSeconds) {
    Sentry.metrics.distribution('connection_duration', data.durationSeconds, {
      tags: {
        type: data.connectionType,
      },
      unit: 'second',
    });
  }

  // Capture unexpected disconnections
  if (!data.wasClean && data.reason !== 'user_action') {
    Sentry.captureMessage('Unexpected connection disconnect', {
      level: 'warning',
      tags: {
        connection_type: data.connectionType,
        reason: data.reason,
      },
      extra: {
        connectionId: data.connectionId,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
      },
    });
  }
};

/**
 * Track connection error
 */
export const trackConnectionError = (data: {
  userId?: string;
  connectionId: string;
  connectionType: ConnectionType;
  errorType:
    | 'network'
    | 'authentication'
    | 'authorization'
    | 'server'
    | 'client'
    | 'timeout'
    | 'protocol'
    | 'unknown';
  errorMessage: string;
  errorCode?: number | string;
  willRetry: boolean;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'connection_error',
    category: 'realtime_connection',
    label: `${data.connectionType}:${data.errorType}`,
    userId: data.userId,
    properties: {
      connectionId: data.connectionId,
      connectionType: data.connectionType,
      errorType: data.errorType,
      errorMessage: data.errorMessage,
      errorCode: data.errorCode,
      willRetry: data.willRetry,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('connection_error', eventData.properties);

  // Track connection errors
  Sentry.metrics.increment('connection_errors', 1, {
    tags: {
      type: data.connectionType,
      error_type: data.errorType,
      will_retry: data.willRetry ? 'yes' : 'no',
    },
  });

  // Capture error in Sentry
  Sentry.captureException(new Error(data.errorMessage), {
    tags: {
      connection_type: data.connectionType,
      error_type: data.errorType,
    },
    extra: {
      connectionId: data.connectionId,
      errorCode: data.errorCode,
      willRetry: data.willRetry,
    },
  });
};

/**
 * Track fallback to polling
 */
export const trackFallbackPollingActivated = (data: {
  userId?: string;
  connectionId: string;
  previousType: ConnectionType;
  reason:
    | 'connection_failed'
    | 'reconnect_failed'
    | 'not_supported'
    | 'manual'
    | 'network_degraded';
  attemptCount: number;
  pollingInterval: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'fallback_polling_activated',
    category: 'realtime_connection',
    label: data.reason,
    userId: data.userId,
    properties: {
      connectionId: data.connectionId,
      previousType: data.previousType,
      reason: data.reason,
      attemptCount: data.attemptCount,
      pollingInterval: data.pollingInterval,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('fallback_polling_activated', eventData.properties);

  // Track fallback activations
  Sentry.metrics.increment('fallback_polling_activations', 1, {
    tags: {
      previous_type: data.previousType,
      reason: data.reason,
    },
  });

  // Alert on fallback activation
  Sentry.captureMessage('Fallback polling activated', {
    level: 'warning',
    tags: {
      previous_type: data.previousType,
      reason: data.reason,
    },
    extra: {
      connectionId: data.connectionId,
      attemptCount: data.attemptCount,
      pollingInterval: data.pollingInterval,
    },
  });
};

/**
 * Track connection latency/ping
 */
export const trackConnectionLatency = (data: {
  userId?: string;
  connectionId: string;
  connectionType: ConnectionType;
  latencyMs: number;
  isHealthy: boolean;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'connection_latency',
    category: 'realtime_performance',
    label: data.connectionType,
    value: data.latencyMs,
    userId: data.userId,
    properties: {
      connectionId: data.connectionId,
      connectionType: data.connectionType,
      latencyMs: data.latencyMs,
      isHealthy: data.isHealthy,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('connection_latency', eventData.properties);

  // Track latency distribution
  Sentry.metrics.distribution('connection_latency', data.latencyMs, {
    tags: {
      type: data.connectionType,
      healthy: data.isHealthy ? 'yes' : 'no',
    },
    unit: 'millisecond',
  });

  // Alert on high latency
  if (!data.isHealthy) {
    Sentry.captureMessage('High connection latency detected', {
      level: 'warning',
      tags: {
        connection_type: data.connectionType,
      },
      extra: {
        connectionId: data.connectionId,
        latencyMs: data.latencyMs,
      },
    });
  }
};

/**
 * Track message received over realtime connection
 */
export const trackRealtimeMessage = (data: {
  userId?: string;
  connectionId: string;
  connectionType: ConnectionType;
  messageType: string;
  messageSize?: number;
  processingTimeMs?: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'realtime_message',
    category: 'realtime_performance',
    label: data.messageType,
    userId: data.userId,
    properties: {
      connectionId: data.connectionId,
      connectionType: data.connectionType,
      messageType: data.messageType,
      messageSize: data.messageSize,
      processingTimeMs: data.processingTimeMs,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('realtime_message', eventData.properties);

  // Track message count
  Sentry.metrics.increment('realtime_messages', 1, {
    tags: {
      type: data.connectionType,
      message_type: data.messageType,
    },
  });

  // Track message processing time
  if (data.processingTimeMs) {
    Sentry.metrics.distribution(
      'message_processing_time',
      data.processingTimeMs,
      {
        tags: {
          type: data.connectionType,
          message_type: data.messageType,
        },
        unit: 'millisecond',
      }
    );
  }
};

/**
 * Track connection health check
 */
export const trackConnectionHealthCheck = (data: {
  userId?: string;
  connectionId: string;
  connectionType: ConnectionType;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  messagesInLast60s?: number;
  errorCount?: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'connection_health_check',
    category: 'realtime_monitoring',
    label: data.status,
    userId: data.userId,
    properties: {
      connectionId: data.connectionId,
      connectionType: data.connectionType,
      status: data.status,
      latencyMs: data.latencyMs,
      messagesInLast60s: data.messagesInLast60s,
      errorCount: data.errorCount,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('connection_health_check', eventData.properties);

  // Track health status
  Sentry.metrics.increment('connection_health_checks', 1, {
    tags: {
      type: data.connectionType,
      status: data.status,
    },
  });

  // Alert on unhealthy connections
  if (data.status === 'unhealthy') {
    Sentry.captureMessage('Unhealthy connection detected', {
      level: 'error',
      tags: {
        connection_type: data.connectionType,
      },
      extra: {
        connectionId: data.connectionId,
        latencyMs: data.latencyMs,
        errorCount: data.errorCount,
      },
    });
  }
};

/**
 * Track connection upgrade (e.g., polling to WebSocket)
 */
export const trackConnectionUpgrade = (data: {
  userId?: string;
  connectionId: string;
  fromType: ConnectionType;
  toType: ConnectionType;
  reason: 'network_improved' | 'manual' | 'automatic';
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'connection_upgrade',
    category: 'realtime_connection',
    label: `${data.fromType}_to_${data.toType}`,
    userId: data.userId,
    properties: {
      connectionId: data.connectionId,
      fromType: data.fromType,
      toType: data.toType,
      reason: data.reason,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('connection_upgrade', eventData.properties);

  // Track upgrades
  Sentry.metrics.increment('connection_upgrades', 1, {
    tags: {
      from: data.fromType,
      to: data.toType,
      reason: data.reason,
    },
  });
};

/**
 * Connection monitor class for managing connection state
 */
export class RealtimeConnectionMonitor {
  private connectionId: string;
  private connectionType: ConnectionType;
  private userId?: string;
  private connectStartTime?: number;
  private connectionStartTime?: number;
  private messageCount = 0;
  private errorCount = 0;

  constructor(connectionId: string, connectionType: ConnectionType, userId?: string) {
    this.connectionId = connectionId;
    this.connectionType = connectionType;
    this.userId = userId;
  }

  startConnection() {
    this.connectStartTime = Date.now();
    trackConnectionAttempt({
      userId: this.userId,
      connectionId: this.connectionId,
      connectionType: this.connectionType,
      attempt: 1,
    });
  }

  connectionEstablished() {
    if (this.connectStartTime) {
      const connectTimeMs = Date.now() - this.connectStartTime;
      this.connectionStartTime = Date.now();

      trackConnectionEstablished({
        userId: this.userId,
        connectionId: this.connectionId,
        connectionType: this.connectionType,
        connectTimeMs,
        attemptCount: 1,
      });
    }
  }

  connectionDisconnected(reason: string, wasClean: boolean, errorCode?: number) {
    const durationSeconds = this.connectionStartTime
      ? (Date.now() - this.connectionStartTime) / 1000
      : undefined;

    trackConnectionDisconnected({
      userId: this.userId,
      connectionId: this.connectionId,
      connectionType: this.connectionType,
      reason: reason as any,
      durationSeconds,
      wasClean,
      errorCode,
    });
  }

  messageReceived(messageType: string, messageSize?: number) {
    this.messageCount++;
    trackRealtimeMessage({
      userId: this.userId,
      connectionId: this.connectionId,
      connectionType: this.connectionType,
      messageType,
      messageSize,
    });
  }

  errorOccurred(errorType: string, errorMessage: string, willRetry: boolean) {
    this.errorCount++;
    trackConnectionError({
      userId: this.userId,
      connectionId: this.connectionId,
      connectionType: this.connectionType,
      errorType: errorType as any,
      errorMessage,
      willRetry,
    });
  }

  recordLatency(latencyMs: number) {
    const isHealthy = latencyMs < 1000; // Consider < 1s healthy
    trackConnectionLatency({
      userId: this.userId,
      connectionId: this.connectionId,
      connectionType: this.connectionType,
      latencyMs,
      isHealthy,
    });
  }

  performHealthCheck() {
    const latencyMs = 0; // Would be measured separately
    const status: 'healthy' | 'degraded' | 'unhealthy' =
      this.errorCount === 0 ? 'healthy' : this.errorCount < 5 ? 'degraded' : 'unhealthy';

    trackConnectionHealthCheck({
      userId: this.userId,
      connectionId: this.connectionId,
      connectionType: this.connectionType,
      status,
      messagesInLast60s: this.messageCount,
      errorCount: this.errorCount,
    });
  }
}
