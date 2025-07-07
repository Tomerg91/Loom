import * as Sentry from '@sentry/nextjs';
import React from 'react';
import { env } from '@/env.mjs';

// Sentry configuration
export const sentryConfig = {
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: env.NODE_ENV === 'development',
  integrations: [
    Sentry.browserTracingIntegration({
      tracingOrigins: ['localhost', /^https:\/\/yourapp\.com/],
    }),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event, _hint) {
    // Don't send events for non-error console logs
    if (event.level === 'info' || event.level === 'warning') {
      return null;
    }
    return event;
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
          scope.setContext(key, context[key]);
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
    return Sentry.startTransaction({
      name,
      op: operation,
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
      fallback: options?.fallback || (() => React.createElement('div', null, 'Something went wrong')),
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