import * as Sentry from '@sentry/nextjs';
import React from 'react';

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
  console.error('Error captured:', error, context);
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (SENTRY_DSN) {
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
  if (SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
};

// Performance monitoring
export const startTransaction = (name: string, operation: string) => {
  if (SENTRY_DSN) {
    return Sentry.startSpan({
      name,
      op: operation,
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
      };
    });
  }
  return {
    finish: () => {},
    setTag: () => {},
    setData: () => {},
  };
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