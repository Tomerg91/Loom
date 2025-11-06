import * as Sentry from '@sentry/nextjs';
import React from 'react';
import { logger } from '@/lib/logger';

// Direct access to client-safe environment variables
const NODE_ENV = process.env.NODE_ENV;
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Sentry configuration (shared between client and server)
export const sentryConfig = {
  dsn: SENTRY_DSN,
  environment: NODE_ENV,
  tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: NODE_ENV === 'development',
  
  // Note: Browser-specific integrations are now in sentry.client.config.js
  // Server-specific configuration is in sentry.server.config.js
  integrations: [],
  beforeSend(event: Sentry.Event) {
    // Don't send events for non-error console logs
    if (event.level === 'info' || event.level === 'warning') {
      return null;
    }
    return event;
  },
};

// Initialize Sentry
export const initSentry = () => {
  if (SENTRY_DSN) {
    Sentry.init(sentryConfig);
  }
};

// Error tracking utilities
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach((key) => {
          scope.setContext(key, context[key] as Sentry.Context);
        });
      }
      Sentry.captureException(error);
    });
  }
  logger.error('Error captured:', error, context);
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
  logger.debug(`[${level}] ${message}`);
};

// User context
export const setUserContext = (user: {
  id: string;
  email?: string;
  role?: string;
}) => {
  if (SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
};

// Performance monitoring with enhanced business context
export const startTransaction = (name: string, operation: string, context?: Record<string, unknown>) => {
  if (SENTRY_DSN) {
    return Sentry.startSpan({
      name,
      op: operation,
      attributes: context,
    }, (span) => {
      // Return a span-like object for compatibility
      return {
        finish: () => {
          if (span) {
            span.end();
          }
        },
        setTag: (key: string, value: string) => {
          if (span) {
            span.setAttributes({ [key]: value });
          }
        },
        setData: (key: string, value: unknown) => {
          if (span) {
            span.setAttributes({ [key]: value });
          }
        },
        setStatus: (status: 'ok' | 'error' | 'cancelled') => {
          if (span) {
            span.setStatus({ code: status === 'ok' ? 1 : 2 });
          }
        },
      };
    });
  }
  return {
    finish: () => {},
    setTag: () => {},
    setData: () => {},
    setStatus: () => {},
  };
};

// Business metrics tracking
export const trackBusinessMetric = (metricName: string, value: number, tags?: Record<string, string>) => {
  if (SENTRY_DSN && typeof window !== 'undefined' && 'Sentry' in window) {
    try {
      // Use Sentry metrics API if available
      if ('metrics' in Sentry && Sentry.metrics) {
        Sentry.metrics.gauge(metricName, value, {
          tags,
          timestamp: Date.now(),
        });
      }
      
      // Also add as breadcrumb for context
      addBreadcrumb({
        category: 'business_metric',
        message: `${metricName}: ${value}`,
        level: 'info',
        data: { metric: metricName, value, tags },
      });
    } catch (error) {
      logger.warn('Failed to track business metric:', error);
    }
  }
};

// User engagement tracking
export const trackUserEngagement = (action: string, feature: string, userId?: string, metadata?: Record<string, unknown>) => {
  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setTag('engagement_action', action);
      scope.setTag('feature', feature);
      if (userId) scope.setUser({ id: userId });
      
      scope.setContext('engagement', {
        action,
        feature,
        timestamp: new Date().toISOString(),
        ...metadata,
      });
      
      Sentry.captureMessage(`User engagement: ${action} in ${feature}`, 'info');
    });
  }
};

// API performance monitoring
export const monitorAPICall = async <T>(
  endpoint: string,
  operation: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> => {
  const transaction = startTransaction(`API ${endpoint}`, 'http.server', {
    endpoint,
    ...context,
  });
  
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    transaction.setTag('status', 'success');
    transaction.setData('response_time', duration);
    
    // Track API performance metric
    trackBusinessMetric('api_response_time', duration, {
      endpoint,
      status: 'success',
    });
    
    transaction.finish();
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    transaction.setTag('status', 'error');
    transaction.setData('response_time', duration);
    transaction.setData('error', error instanceof Error ? error.message : 'Unknown error');
    
    // Track API error metric
    trackBusinessMetric('api_error_rate', 1, {
      endpoint,
      status: 'error',
      error_type: error instanceof Error ? error.name : 'unknown',
    });
    
    captureError(error as Error, {
      endpoint,
      duration,
      operation: 'api_call',
    });
    
    transaction.finish();
    throw error;
  }
};

export const addBreadcrumb = (breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
}) => {
  if (SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
  }
};

// API error boundary
export const withSentryErrorBoundary = <T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  options?: {
    fallback?: React.ComponentType<{ error?: Error }>;
    beforeCapture?: (scope: Sentry.Scope) => void;
  }
): React.ComponentType<T> => {
  if (SENTRY_DSN) {
    return Sentry.withErrorBoundary(Component, {
      fallback: options?.fallback || (({ error }: { error?: Error }) => React.createElement('div', null, 'Something went wrong')),
      beforeCapture: options?.beforeCapture,
    });
  }
  return Component;
};

// Custom error classes
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
    public method: string
  ) {
    super(message);
    this.name = 'APIError';
    captureError(this, {
      statusCode,
      endpoint,
      method,
    });
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field: string, public value: unknown) {
    super(message);
    this.name = 'ValidationError';
    captureError(this, {
      field,
      value,
    });
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public reason: string) {
    super(message);
    this.name = 'AuthenticationError';
    captureError(this, {
      reason,
    });
  }
}