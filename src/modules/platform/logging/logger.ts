/**
 * @fileoverview Centralized structured logging utilities that bridge console output
 * and Sentry reporting. Application code can use the exported `logger` instance
 * or create scoped loggers with default metadata for richer observability while
 * keeping implementation details encapsulated in a single module.
 */

import * as Sentry from '@sentry/nextjs';
import type { SeverityLevel } from '@sentry/nextjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogMetadata = {
  /** Logical component or feature name associated with the log entry. */
  context?: string;
  /** Optional feature flag for filtering in observability tools. */
  feature?: string;
  /** Error instance captured alongside the message when present. */
  error?: unknown;
  /** Additional structured information appended to the log. */
  [key: string]: unknown;
};

const formatPrefix = (level: LogLevel, context?: string): string => {
  const timestamp = new Date().toISOString();
  const scope = context ? context.toUpperCase() : 'APP';
  return `[${timestamp}] [${scope}] [${level.toUpperCase()}]`;
};

const toSentryLevel = (level: LogLevel): SeverityLevel =>
  level === 'warn' ? 'warning' : level;

const addBreadcrumb = (
  level: LogLevel,
  message: string,
  metadata?: LogMetadata
): void => {
  Sentry.addBreadcrumb({
    category: metadata?.context ?? 'application',
    message,
    level: toSentryLevel(level),
    data: metadata ? { ...metadata, error: undefined } : undefined,
  });
};

const captureWithSentry = (
  level: LogLevel,
  message: string,
  metadata?: LogMetadata
): void => {
  if (level === 'error') {
    const candidate = metadata?.error;
    if (candidate instanceof Error) {
      Sentry.captureException(candidate, scope => {
        scope.setExtra('logger_message', message);
        if (metadata?.context) {
          scope.setTag('context', metadata.context);
        }
        if (metadata?.feature) {
          scope.setTag('feature', metadata.feature);
        }
        const extras = { ...metadata };
        delete (extras as Record<string, unknown>).error;
        scope.setExtras(extras);
        scope.setLevel('error');
        return scope;
      });
      return;
    }

    Sentry.captureMessage(message, 'error');
    return;
  }

  if (level === 'warn') {
    Sentry.captureMessage(message, 'warning');
  } else {
    addBreadcrumb(level, message, metadata);
  }
};

const logToConsole = (
  level: LogLevel,
  message: string,
  metadata?: LogMetadata
): void => {
  const prefix = formatPrefix(level, metadata?.context);
  const extras = { ...metadata };
  if ('error' in extras) {
    delete (extras as Record<string, unknown>).error;
  }

  const payload = Object.keys(extras).length > 0 ? extras : undefined;
  const errorCandidate = metadata?.error;

  if (level === 'error') {
    if (errorCandidate instanceof Error) {
      console.error(prefix, message, payload, errorCandidate);
      return;
    }
    console.error(prefix, message, payload, errorCandidate);
    return;
  }

  if (level === 'warn') {
    console.warn(prefix, message, payload);
    return;
  }

  if (level === 'info') {
    console.info(prefix, message, payload);
    return;
  }

  console.debug(prefix, message, payload);
};

const dispatchLog = (
  level: LogLevel,
  message: string,
  metadata?: LogMetadata
): void => {
  logToConsole(level, message, metadata);
  captureWithSentry(level, message, metadata);
};

export const logger = {
  debug: (message: string, metadata?: LogMetadata) =>
    dispatchLog('debug', message, metadata),
  info: (message: string, metadata?: LogMetadata) =>
    dispatchLog('info', message, metadata),
  warn: (message: string, metadata?: LogMetadata) =>
    dispatchLog('warn', message, metadata),
  error: (message: string, metadata?: LogMetadata) =>
    dispatchLog('error', message, metadata),
};

/**
 * Creates a scoped logger with default metadata applied to every log entry.
 *
 * @param defaults Base metadata merged into each invocation.
 * @returns Logger helpers with contextual defaults applied.
 */
export const createLogger = (defaults: LogMetadata = {}) => ({
  debug: (message: string, metadata?: LogMetadata) =>
    logger.debug(message, { ...defaults, ...metadata }),
  info: (message: string, metadata?: LogMetadata) =>
    logger.info(message, { ...defaults, ...metadata }),
  warn: (message: string, metadata?: LogMetadata) =>
    logger.warn(message, { ...defaults, ...metadata }),
  error: (message: string, metadata?: LogMetadata) =>
    logger.error(message, { ...defaults, ...metadata }),
});

export type ScopedLogger = ReturnType<typeof createLogger>;
