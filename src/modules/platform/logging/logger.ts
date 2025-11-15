/**
 * @fileoverview Centralized structured logging utilities that bridge console output
 * and Sentry reporting. Application code can use the exported `logger` instance
 * or create scoped loggers with default metadata for richer observability while
 * keeping implementation details encapsulated in a single module.
 *
 * Features:
 * - Automatic PII sanitization (emails, phones, tokens, credit cards)
 * - Sentry integration for errors and warnings
 * - Structured metadata support
 * - Environment-aware logging (strips debug in production)
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

// ============================================================================
// PII SANITIZATION UTILITIES
// ============================================================================

/**
 * Masks email addresses to show only first character and domain.
 * Example: user@example.com -> u***@example.com
 */
const sanitizeEmail = (email: string): string => {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  return `${local.charAt(0)}${'*'.repeat(Math.min(local.length - 1, 3))}@${domain}`;
};

/**
 * Masks phone numbers to show only last 4 digits.
 * Example: +1234567890 -> ***7890
 */
const sanitizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-4)}`;
};

/**
 * Masks credit card numbers to show only last 4 digits.
 * Example: 4532-1234-5678-9010 -> ****-****-****-9010
 */
const sanitizeCreditCard = (cc: string): string => {
  const digits = cc.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `****-****-****-${digits.slice(-4)}`;
};

/**
 * Masks tokens and API keys to show only first 4 characters.
 * Example: sk_live_abcdef123456 -> sk_l***
 */
const sanitizeToken = (token: string): string => {
  if (token.length < 8) return '***';
  return `${token.slice(0, 4)}${'*'.repeat(Math.min(token.length - 4, 8))}`;
};

/**
 * Sanitizes a value that might contain PII.
 * Automatically detects and masks emails, phones, credit cards, and tokens.
 */
const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    // Email pattern
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return sanitizeEmail(value);
    }

    // Phone pattern (various formats)
    if (/^[\d\s\-\+\(\)]{8,}$/.test(value) && /\d{3,}/.test(value)) {
      return sanitizePhone(value);
    }

    // Credit card pattern (13-19 digits with optional separators)
    if (
      /^[\d\s\-]{13,19}$/.test(value) &&
      /\d{13,19}/.test(value.replace(/\D/g, ''))
    ) {
      return sanitizeCreditCard(value);
    }

    // Token/API key pattern (long alphanumeric strings)
    if (
      /^(sk_|pk_|tok_|key_|api_|auth_|bearer_)/i.test(value) ||
      (value.length > 20 && /^[A-Za-z0-9_\-\.]+$/.test(value))
    ) {
      return sanitizeToken(value);
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Check if key suggests sensitive data
      const sensitiveKeys = [
        'email',
        'phone',
        'password',
        'token',
        'apiKey',
        'api_key',
        'creditCard',
        'credit_card',
        'ssn',
        'secret',
      ];
      if (
        sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))
      ) {
        sanitized[key] =
          typeof val === 'string' ? sanitizeValue(val) : '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(val);
      }
    }
    return sanitized;
  }

  return value;
};

/**
 * Sanitizes log metadata to remove or mask PII.
 */
const sanitizeMetadata = (metadata?: LogMetadata): LogMetadata | undefined => {
  if (!metadata) return undefined;

  const sanitized: LogMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (key === 'error') {
      // Don't sanitize error objects
      sanitized[key] = value;
    } else {
      sanitized[key] = sanitizeValue(value);
    }
  }

  return sanitized;
};

/**
 * Sanitizes a log message to remove or mask PII.
 */
const sanitizeMessage = (message: string): string => {
  let sanitized = message;

  // Sanitize emails in message
  sanitized = sanitized.replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, match =>
    sanitizeEmail(match)
  );

  // Sanitize phone numbers in message
  sanitized = sanitized.replace(/\b[\d\s\-\+\(\)]{8,}\b/g, match => {
    if (/\d{3,}/.test(match)) {
      return sanitizePhone(match);
    }
    return match;
  });

  // Sanitize tokens in message
  sanitized = sanitized.replace(
    /\b(sk_|pk_|tok_|key_|api_|auth_|bearer_)[A-Za-z0-9_\-\.]+\b/gi,
    match => sanitizeToken(match)
  );

  return sanitized;
};

// ============================================================================
// LOGGING CORE
// ============================================================================

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

  // Skip debug logs in production to reduce noise
  if (level === 'debug' && process.env.NODE_ENV === 'production') {
    return;
  }

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
  const sanitizedMessage = sanitizeMessage(message);
  const sanitizedMetadata = sanitizeMetadata(metadata);

  logToConsole(level, sanitizedMessage, sanitizedMetadata);
  captureWithSentry(level, sanitizedMessage, sanitizedMetadata);
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

// ============================================================================
// SANITIZATION UTILITIES EXPORT
// ============================================================================

/**
 * Exported sanitization utilities for manual use when needed.
 * These are automatically applied by the logger, but can be used
 * directly for custom logging scenarios.
 */
export const sanitize = {
  /** Sanitize any value (auto-detects PII) */
  value: sanitizeValue,
  /** Sanitize email addresses */
  email: sanitizeEmail,
  /** Sanitize phone numbers */
  phone: sanitizePhone,
  /** Sanitize credit card numbers */
  creditCard: sanitizeCreditCard,
  /** Sanitize tokens and API keys */
  token: sanitizeToken,
  /** Sanitize log messages */
  message: sanitizeMessage,
  /** Sanitize metadata objects */
  metadata: sanitizeMetadata,
} as const;
