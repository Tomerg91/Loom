/**
 * Centralized logging service for the application
 * Provides environment-aware logging with Sentry integration for production
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Debug logging - only appears in development
   * Use for verbose debugging information
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Info logging - appears in all environments
   * Use for general informational messages
   */
  info(message: string, context?: LogContext): void {
    console.info(`[INFO] ${message}`, context || '');

    if (this.isProduction && context) {
      Sentry.addBreadcrumb({
        category: 'info',
        message,
        data: context,
        level: 'info',
      });
    }
  }

  /**
   * Warning logging - appears in all environments
   * Use for recoverable issues that should be monitored
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');

    if (this.isProduction) {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: context,
      });
    }
  }

  /**
   * Error logging - appears in all environments and sends to Sentry in production
   * Use for errors that need attention
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    console.error(`[ERROR] ${message}`, error || '', context || '');

    if (this.isProduction) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          extra: {
            message,
            ...context,
          },
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: {
            error,
            ...context,
          },
        });
      }
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; email?: string; username?: string }): void {
    if (this.isProduction) {
      Sentry.setUser(user);
    }
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (this.isProduction) {
      Sentry.setUser(null);
    }
  }

  /**
   * Add custom context to error tracking
   */
  setContext(key: string, context: LogContext): void {
    if (this.isProduction) {
      Sentry.setContext(key, context);
    }
  }

  /**
   * Start a performance measurement
   */
  startMeasure(name: string): void {
    if (this.isDevelopment && typeof performance !== 'undefined') {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * End a performance measurement and log the duration
   */
  endMeasure(name: string): void {
    if (this.isDevelopment && typeof performance !== 'undefined') {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measure = performance.getEntriesByName(name)[0];
        this.debug(`Performance: ${name}`, { duration: `${measure.duration.toFixed(2)}ms` });
      } catch (error) {
        // Ignore measurement errors
      }
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for external use
export type { LogContext, LogLevel };
