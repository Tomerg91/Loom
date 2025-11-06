/**
 * API Error Handling Utilities
 *
 * Provides utilities for sanitizing and logging errors in API routes:
 * - Prevents exposure of internal error details to clients
 * - Provides structured logging for debugging
 * - Maps common error types to user-friendly messages
 *
 * @module lib/utils/api-errors
 */

/**
 * Error types and their user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Authentication required. Please sign in.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Invalid input. Please check your data and try again.',
  UPLOAD_ERROR: 'Failed to upload file. Please try again.',
  DATABASE_ERROR: 'A database error occurred. Please try again later.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  RATE_LIMIT: 'Too many requests. Please try again later.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
};

/**
 * Error codes mapped to HTTP status codes
 */
const ERROR_STATUS_CODES: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  UPLOAD_ERROR: 400,
  DATABASE_ERROR: 500,
  NETWORK_ERROR: 503,
  RATE_LIMIT: 429,
  INTERNAL_ERROR: 500,
};

/**
 * Sanitized error response
 */
export interface SanitizedError {
  success: false;
  error: string;
  code?: string;
}

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
  /** Context for logging (e.g., "POST /api/resources") */
  context: string;
  /** Custom user-friendly message */
  userMessage?: string;
  /** Additional data to log (not sent to client) */
  metadata?: Record<string, unknown>;
}

/**
 * Sanitize an error for client response
 *
 * This function:
 * 1. Logs the full error details server-side
 * 2. Returns a sanitized error message to the client
 * 3. Never exposes internal error details, stack traces, or database info
 *
 * @param error - The error to sanitize
 * @param options - Options for error handling
 * @returns Sanitized error object
 */
export function sanitizeError(
  error: unknown,
  options: ErrorHandlerOptions
): { response: SanitizedError; statusCode: number } {
  const { context, userMessage, metadata } = options;

  // Log full error details server-side
  logError(error, context, metadata);

  // Determine error type and message
  let errorCode = 'INTERNAL_ERROR';
  let sanitizedMessage = ERROR_MESSAGES.INTERNAL_ERROR;

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Map common error patterns to error codes
    if (message.includes('unauthorized') || message.includes('unauthenticated')) {
      errorCode = 'UNAUTHORIZED';
    } else if (message.includes('forbidden') || message.includes('permission')) {
      errorCode = 'FORBIDDEN';
    } else if (message.includes('not found')) {
      errorCode = 'NOT_FOUND';
    } else if (message.includes('validation') || message.includes('invalid')) {
      errorCode = 'VALIDATION_ERROR';
    } else if (message.includes('upload') || message.includes('file')) {
      errorCode = 'UPLOAD_ERROR';
    } else if (message.includes('database') || message.includes('query')) {
      errorCode = 'DATABASE_ERROR';
    } else if (message.includes('network') || message.includes('connection')) {
      errorCode = 'NETWORK_ERROR';
    } else if (message.includes('rate limit') || message.includes('too many')) {
      errorCode = 'RATE_LIMIT';
    }

    sanitizedMessage = ERROR_MESSAGES[errorCode];
  }

  // Use custom user message if provided
  const finalMessage = userMessage || sanitizedMessage;

  return {
    response: {
      success: false,
      error: finalMessage,
      code: errorCode,
    },
    statusCode: ERROR_STATUS_CODES[errorCode],
  };
}

/**
 * Log error details server-side
 *
 * @param error - The error to log
 * @param context - Context (e.g., API route)
 * @param metadata - Additional metadata
 */
function logError(error: unknown, context: string, metadata?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // In production, this should be sent to a logging service like Sentry
  // For now, we use console.error with structured format
  logger.error(JSON.stringify({
    timestamp,
    context,
    error: errorMessage,
    stack: errorStack,
    metadata,
  }, null, 2));

  // TODO: Send to Sentry or other error tracking service
  // Example: Sentry.captureException(error, { tags: { context }, extra: metadata });
}

/**
 * Create a validation error response
 *
 * @param message - User-friendly validation error message
 * @returns Sanitized validation error
 */
export function validationError(message: string): { response: SanitizedError; statusCode: number } {
  return {
    response: {
      success: false,
      error: message,
      code: 'VALIDATION_ERROR',
    },
    statusCode: 400,
  };
}

/**
 * Create an unauthorized error response
 *
 * @param message - Optional custom message
 * @returns Sanitized unauthorized error
 */
export function unauthorizedError(message?: string): { response: SanitizedError; statusCode: number } {
  return {
    response: {
      success: false,
      error: message || ERROR_MESSAGES.UNAUTHORIZED,
      code: 'UNAUTHORIZED',
    },
    statusCode: 401,
  };
}

/**
 * Create a forbidden error response
 *
 * @param message - Optional custom message
 * @returns Sanitized forbidden error
 */
export function forbiddenError(message?: string): { response: SanitizedError; statusCode: number } {
  return {
    response: {
      success: false,
      error: message || ERROR_MESSAGES.FORBIDDEN,
      code: 'FORBIDDEN',
    },
    statusCode: 403,
  };
}

/**
 * Create a not found error response
 *
 * @param resource - Resource type (e.g., "Resource", "Collection")
 * @returns Sanitized not found error
 */
export function notFoundError(resource: string): { response: SanitizedError; statusCode: number } {
  return {
    response: {
      success: false,
      error: `${resource} not found.`,
      code: 'NOT_FOUND',
    },
    statusCode: 404,
  };
}
