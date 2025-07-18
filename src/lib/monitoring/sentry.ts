import * as Sentry from '@sentry/nextjs';
import React from 'react';
import { env } from '@/env.mjs';

// Sentry configuration (shared between client and server)
export const sentryConfig = {
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: env.NODE_ENV === 'development',
  
  // Note: Browser-specific integrations are now in sentry.client.config.js
  // Server-specific configuration is in sentry.server.config.js
  integrations: [],
  beforeSend(event: unknown) {
    // Don't send events for non-error console logs
    const eventObj = event as { level?: string };
    if (eventObj.level === 'info' || eventObj.level === 'warning') {
      return null;
    }
    return event as never;
  },
};

// Initialize Sentry
export const initSentry = () => {
  if (env.SENTRY_DSN) {
    Sentry.init(sentryConfig);
  }
};

// Error tracking utilities
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  if (env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach((key) => {
          scope.setContext(key, context[key] as never);
        });
      }
      Sentry.captureException(error);
    });
  }
  console.error('Error captured:', error, context);
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
  console.log(`[${level}] ${message}`);
};

// User context
export const setUserContext = (user: {
  id: string;
  email?: string;
  role?: string;
}) => {
  if (env.SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
};

// Performance monitoring
export const startTransaction = (name: string, operation: string) => {
  if (env.SENTRY_DSN) {
    return Sentry.startSpan({
      name,
      op: operation,
    }, () => {
      // Return a span-like object for compatibility
      return {
        finish: () => {},
        setTag: () => {},
        setData: () => {},
      };
    });
  }
  return null;
};

export const addBreadcrumb = (breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
}) => {
  if (env.SENTRY_DSN) {
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
  if (env.SENTRY_DSN) {
    return Sentry.withErrorBoundary(Component, {
      fallback: (options?.fallback || (({ error: _error }: { error: unknown }) => React.createElement('div', null, 'Something went wrong'))) as never,
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