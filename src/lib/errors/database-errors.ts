/**
 * Centralized Database Error Definitions
 *
 * This file provides standardized error codes, messages, and types for the entire
 * database layer. All database operations should use these error definitions to
 * ensure consistent error handling and actionable client-side error messages.
 *
 * Usage:
 * ```typescript
 * import { DatabaseError, DB_ERROR_CODES } from '@/lib/errors/database-errors';
 *
 * // Creating errors
 * const error = DatabaseError.notFound('User', userId);
 * const error = DatabaseError.create(DB_ERROR_CODES.VALIDATION_ERROR, 'Invalid email format');
 *
 * // In database functions
 * if (error) {
 *   return Result.error(DatabaseError.fromSupabaseError(error));
 * }
 * ```
 */

/**
 * Standard database error codes for client-side handling
 * These codes are stable and can be used for programmatic error handling
 */
export const DB_ERROR_CODES = {
  // Authentication & Authorization (1xxx)
  UNAUTHORIZED: 'DB_1001',
  FORBIDDEN: 'DB_1002',
  INVALID_CREDENTIALS: 'DB_1003',
  SESSION_EXPIRED: 'DB_1004',
  MFA_REQUIRED: 'DB_1005',

  // Resource Not Found (2xxx)
  NOT_FOUND: 'DB_2001',
  USER_NOT_FOUND: 'DB_2002',
  SESSION_NOT_FOUND: 'DB_2003',
  FILE_NOT_FOUND: 'DB_2004',
  MESSAGE_NOT_FOUND: 'DB_2005',
  NOTIFICATION_NOT_FOUND: 'DB_2006',
  RESOURCE_NOT_FOUND: 'DB_2007',

  // Validation Errors (3xxx)
  VALIDATION_ERROR: 'DB_3001',
  INVALID_INPUT: 'DB_3002',
  MISSING_REQUIRED_FIELD: 'DB_3003',
  INVALID_EMAIL: 'DB_3004',
  INVALID_PHONE: 'DB_3005',
  INVALID_TIMEZONE: 'DB_3006',
  INVALID_LANGUAGE: 'DB_3007',
  INVALID_DATE_RANGE: 'DB_3008',
  INVALID_FILE_TYPE: 'DB_3009',
  FILE_TOO_LARGE: 'DB_3010',

  // Conflict & Constraint Violations (4xxx)
  CONFLICT: 'DB_4001',
  DUPLICATE_ENTRY: 'DB_4002',
  FOREIGN_KEY_VIOLATION: 'DB_4003',
  UNIQUE_VIOLATION: 'DB_4004',
  CHECK_VIOLATION: 'DB_4005',
  SESSION_CONFLICT: 'DB_4006',
  AVAILABILITY_CONFLICT: 'DB_4007',

  // Operation Errors (5xxx)
  OPERATION_FAILED: 'DB_5001',
  CREATE_FAILED: 'DB_5002',
  UPDATE_FAILED: 'DB_5003',
  DELETE_FAILED: 'DB_5004',
  QUERY_FAILED: 'DB_5005',
  TRANSACTION_FAILED: 'DB_5006',
  RPC_FAILED: 'DB_5007',

  // Connection & Network (6xxx)
  CONNECTION_ERROR: 'DB_6001',
  TIMEOUT: 'DB_6002',
  NETWORK_ERROR: 'DB_6003',
  SERVICE_UNAVAILABLE: 'DB_6004',

  // Rate Limiting & Quotas (7xxx)
  RATE_LIMIT_EXCEEDED: 'DB_7001',
  QUOTA_EXCEEDED: 'DB_7002',
  TOO_MANY_REQUESTS: 'DB_7003',

  // File & Storage (8xxx)
  STORAGE_ERROR: 'DB_8001',
  UPLOAD_FAILED: 'DB_8002',
  DOWNLOAD_FAILED: 'DB_8003',
  DELETE_FILE_FAILED: 'DB_8004',
  VIRUS_DETECTED: 'DB_8005',
  FILE_QUARANTINED: 'DB_8006',

  // Business Logic (9xxx)
  BUSINESS_RULE_VIOLATION: 'DB_9001',
  INSUFFICIENT_PERMISSIONS: 'DB_9002',
  ACCOUNT_SUSPENDED: 'DB_9003',
  ACCOUNT_DELETED: 'DB_9004',
  SESSION_CANCELLED: 'DB_9005',
  SESSION_COMPLETED: 'DB_9006',
  PAYMENT_REQUIRED: 'DB_9007',

  // Row-Level Security (9xxx)
  RLS_VIOLATION: 'DB_9008',
  RLS_INSERT_DENIED: 'DB_9009',
  RLS_UPDATE_DENIED: 'DB_9010',
  RLS_DELETE_DENIED: 'DB_9011',
  RLS_SELECT_DENIED: 'DB_9012',

  // Unknown & Unexpected (9999)
  UNKNOWN_ERROR: 'DB_9999',
} as const;

export type DatabaseErrorCode =
  (typeof DB_ERROR_CODES)[keyof typeof DB_ERROR_CODES];

/**
 * Structured error object for database operations
 */
export interface DatabaseErrorDetails {
  code: DatabaseErrorCode;
  message: string;
  userMessage?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
  resourceType?: string;
  resourceId?: string;
  operation?: string;
  retryable?: boolean;
}

/**
 * Database error class with enhanced error information
 */
export class DatabaseError extends Error {
  public readonly code: DatabaseErrorCode;
  public readonly userMessage: string;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly resourceType?: string;
  public readonly resourceId?: string;
  public readonly operation?: string;
  public readonly retryable: boolean;

  constructor(errorDetails: DatabaseErrorDetails) {
    super(errorDetails.message);
    this.name = 'DatabaseError';
    this.code = errorDetails.code;
    this.userMessage =
      errorDetails.userMessage || this.getDefaultUserMessage(errorDetails.code);
    this.details = errorDetails.details;
    this.timestamp = errorDetails.timestamp || new Date().toISOString();
    this.resourceType = errorDetails.resourceType;
    this.resourceId = errorDetails.resourceId;
    this.operation = errorDetails.operation;
    this.retryable =
      errorDetails.retryable ?? this.isRetryableByDefault(errorDetails.code);

    // Maintain proper stack trace for where error was thrown (V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }

  /**
   * Convert to JSON for logging or API responses
   */
  toJSON(): DatabaseErrorDetails {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      details: this.details,
      timestamp: this.timestamp,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      operation: this.operation,
      retryable: this.retryable,
    };
  }

  /**
   * Convert to string representation for Result.error
   */
  toString(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Get default user-friendly message based on error code
   */
  private getDefaultUserMessage(code: DatabaseErrorCode): string {
    const messages: Record<DatabaseErrorCode, string> = {
      [DB_ERROR_CODES.UNAUTHORIZED]:
        'You are not authenticated. Please sign in.',
      [DB_ERROR_CODES.FORBIDDEN]:
        'You do not have permission to perform this action.',
      [DB_ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password.',
      [DB_ERROR_CODES.SESSION_EXPIRED]:
        'Your session has expired. Please sign in again.',
      [DB_ERROR_CODES.MFA_REQUIRED]: 'Multi-factor authentication is required.',

      [DB_ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
      [DB_ERROR_CODES.USER_NOT_FOUND]: 'User not found.',
      [DB_ERROR_CODES.SESSION_NOT_FOUND]: 'Session not found.',
      [DB_ERROR_CODES.FILE_NOT_FOUND]: 'File not found.',
      [DB_ERROR_CODES.MESSAGE_NOT_FOUND]: 'Message not found.',
      [DB_ERROR_CODES.NOTIFICATION_NOT_FOUND]: 'Notification not found.',
      [DB_ERROR_CODES.RESOURCE_NOT_FOUND]: 'Resource not found.',

      [DB_ERROR_CODES.VALIDATION_ERROR]: 'The provided data is invalid.',
      [DB_ERROR_CODES.INVALID_INPUT]: 'Invalid input provided.',
      [DB_ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Required field is missing.',
      [DB_ERROR_CODES.INVALID_EMAIL]: 'Invalid email address.',
      [DB_ERROR_CODES.INVALID_PHONE]: 'Invalid phone number.',
      [DB_ERROR_CODES.INVALID_TIMEZONE]: 'Invalid timezone.',
      [DB_ERROR_CODES.INVALID_LANGUAGE]: 'Invalid language code.',
      [DB_ERROR_CODES.INVALID_DATE_RANGE]: 'Invalid date range.',
      [DB_ERROR_CODES.INVALID_FILE_TYPE]: 'Invalid file type.',
      [DB_ERROR_CODES.FILE_TOO_LARGE]: 'File is too large.',

      [DB_ERROR_CODES.CONFLICT]:
        'A conflict occurred while processing your request.',
      [DB_ERROR_CODES.DUPLICATE_ENTRY]: 'This entry already exists.',
      [DB_ERROR_CODES.FOREIGN_KEY_VIOLATION]:
        'Cannot delete because other records depend on this.',
      [DB_ERROR_CODES.UNIQUE_VIOLATION]: 'This value must be unique.',
      [DB_ERROR_CODES.CHECK_VIOLATION]: 'Data constraint violation.',
      [DB_ERROR_CODES.SESSION_CONFLICT]: 'Session scheduling conflict.',
      [DB_ERROR_CODES.AVAILABILITY_CONFLICT]: 'Time slot is not available.',

      [DB_ERROR_CODES.OPERATION_FAILED]: 'Operation failed. Please try again.',
      [DB_ERROR_CODES.CREATE_FAILED]: 'Failed to create record.',
      [DB_ERROR_CODES.UPDATE_FAILED]: 'Failed to update record.',
      [DB_ERROR_CODES.DELETE_FAILED]: 'Failed to delete record.',
      [DB_ERROR_CODES.QUERY_FAILED]: 'Failed to retrieve data.',
      [DB_ERROR_CODES.TRANSACTION_FAILED]: 'Transaction failed.',
      [DB_ERROR_CODES.RPC_FAILED]: 'Remote procedure call failed.',

      [DB_ERROR_CODES.CONNECTION_ERROR]: 'Unable to connect to the database.',
      [DB_ERROR_CODES.TIMEOUT]: 'Request timed out. Please try again.',
      [DB_ERROR_CODES.NETWORK_ERROR]: 'Network error occurred.',
      [DB_ERROR_CODES.SERVICE_UNAVAILABLE]:
        'Service is temporarily unavailable.',

      [DB_ERROR_CODES.RATE_LIMIT_EXCEEDED]:
        'Too many requests. Please slow down.',
      [DB_ERROR_CODES.QUOTA_EXCEEDED]: 'Quota exceeded.',
      [DB_ERROR_CODES.TOO_MANY_REQUESTS]:
        'Too many requests. Please try again later.',

      [DB_ERROR_CODES.STORAGE_ERROR]: 'Storage error occurred.',
      [DB_ERROR_CODES.UPLOAD_FAILED]: 'File upload failed.',
      [DB_ERROR_CODES.DOWNLOAD_FAILED]: 'File download failed.',
      [DB_ERROR_CODES.DELETE_FILE_FAILED]: 'Failed to delete file.',
      [DB_ERROR_CODES.VIRUS_DETECTED]:
        'File contains malware and has been blocked.',
      [DB_ERROR_CODES.FILE_QUARANTINED]:
        'File has been quarantined for security review.',

      [DB_ERROR_CODES.BUSINESS_RULE_VIOLATION]: 'Business rule violation.',
      [DB_ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions.',
      [DB_ERROR_CODES.ACCOUNT_SUSPENDED]: 'Your account has been suspended.',
      [DB_ERROR_CODES.ACCOUNT_DELETED]: 'This account has been deleted.',
      [DB_ERROR_CODES.SESSION_CANCELLED]: 'This session has been cancelled.',
      [DB_ERROR_CODES.SESSION_COMPLETED]: 'This session is already completed.',
      [DB_ERROR_CODES.PAYMENT_REQUIRED]: 'Payment is required to continue.',

      [DB_ERROR_CODES.RLS_VIOLATION]:
        'You do not have permission to perform this action.',
      [DB_ERROR_CODES.RLS_INSERT_DENIED]:
        'You do not have permission to create this resource.',
      [DB_ERROR_CODES.RLS_UPDATE_DENIED]:
        'You do not have permission to modify this resource.',
      [DB_ERROR_CODES.RLS_DELETE_DENIED]:
        'You do not have permission to delete this resource.',
      [DB_ERROR_CODES.RLS_SELECT_DENIED]:
        'You do not have permission to access this resource.',

      [DB_ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred.',
    };

    return messages[code] || 'An error occurred.';
  }

  /**
   * Determine if error is retryable by default
   */
  private isRetryableByDefault(code: DatabaseErrorCode): boolean {
    const retryableCodes: DatabaseErrorCode[] = [
      DB_ERROR_CODES.TIMEOUT,
      DB_ERROR_CODES.NETWORK_ERROR,
      DB_ERROR_CODES.SERVICE_UNAVAILABLE,
      DB_ERROR_CODES.CONNECTION_ERROR,
      DB_ERROR_CODES.TRANSACTION_FAILED,
    ];

    return retryableCodes.includes(code);
  }

  /**
   * Static factory methods for common error scenarios
   */

  static create(
    code: DatabaseErrorCode,
    message: string,
    userMessage?: string,
    details?: Record<string, unknown>
  ): DatabaseError {
    return new DatabaseError({ code, message, userMessage, details });
  }

  static notFound(resourceType: string, resourceId?: string): DatabaseError {
    return new DatabaseError({
      code: DB_ERROR_CODES.NOT_FOUND,
      message: `${resourceType} not found${resourceId ? `: ${resourceId}` : ''}`,
      resourceType,
      resourceId,
    });
  }

  static unauthorized(operation?: string): DatabaseError {
    return new DatabaseError({
      code: DB_ERROR_CODES.UNAUTHORIZED,
      message: 'Unauthorized access attempt',
      operation,
    });
  }

  static forbidden(resourceType?: string, operation?: string): DatabaseError {
    return new DatabaseError({
      code: DB_ERROR_CODES.FORBIDDEN,
      message: `Forbidden: Cannot ${operation || 'access'} ${resourceType || 'resource'}`,
      resourceType,
      operation,
    });
  }

  static validation(
    message: string,
    details?: Record<string, unknown>
  ): DatabaseError {
    return new DatabaseError({
      code: DB_ERROR_CODES.VALIDATION_ERROR,
      message,
      details,
    });
  }

  static conflict(message: string, resourceType?: string): DatabaseError {
    return new DatabaseError({
      code: DB_ERROR_CODES.CONFLICT,
      message,
      resourceType,
    });
  }

  static operationFailed(
    operation: string,
    resourceType?: string,
    details?: Record<string, unknown>
  ): DatabaseError {
    return new DatabaseError({
      code: DB_ERROR_CODES.OPERATION_FAILED,
      message: `Failed to ${operation}${resourceType ? ` ${resourceType}` : ''}`,
      operation,
      resourceType,
      details,
    });
  }

  /**
   * Convert Supabase error to DatabaseError
   */
  static fromSupabaseError(
    error: unknown,
    operation?: string,
    resourceType?: string
  ): DatabaseError {
    if (!error) {
      return new DatabaseError({
        code: DB_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Unknown error occurred',
        operation,
        resourceType,
      });
    }

    // Handle Supabase error object
    const supabaseError = error as {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
    };

    // Map Supabase error codes to our error codes
    const code = mapSupabaseErrorCode(supabaseError.code);
    const message = supabaseError.message || 'Database operation failed';
    const details = {
      supabaseCode: supabaseError.code,
      supabaseDetails: supabaseError.details,
      supabaseHint: supabaseError.hint,
    };

    return new DatabaseError({
      code,
      message,
      operation,
      resourceType,
      details,
    });
  }

  /**
   * Parse DatabaseError from Result error string
   */
  static fromResultError(errorString: string): DatabaseError | null {
    try {
      const parsed = JSON.parse(errorString);
      if (parsed.code && Object.values(DB_ERROR_CODES).includes(parsed.code)) {
        return new DatabaseError(parsed);
      }
    } catch {
      // Not a DatabaseError JSON string
    }
    return null;
  }
}

/**
 * Map Supabase PostgreSQL error codes to our standardized codes
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
function mapSupabaseErrorCode(pgCode?: string): DatabaseErrorCode {
  if (!pgCode) return DB_ERROR_CODES.UNKNOWN_ERROR;

  // Class 23 — Integrity Constraint Violation
  if (pgCode.startsWith('23')) {
    if (pgCode === '23505') return DB_ERROR_CODES.UNIQUE_VIOLATION;
    if (pgCode === '23503') return DB_ERROR_CODES.FOREIGN_KEY_VIOLATION;
    if (pgCode === '23514') return DB_ERROR_CODES.CHECK_VIOLATION;
    return DB_ERROR_CODES.CONFLICT;
  }

  // Class 42 — Syntax Error or Access Rule Violation
  if (pgCode.startsWith('42')) {
    if (pgCode === '42501') return DB_ERROR_CODES.FORBIDDEN;
    return DB_ERROR_CODES.VALIDATION_ERROR;
  }

  // Class 28 — Invalid Authorization Specification
  if (pgCode.startsWith('28')) {
    return DB_ERROR_CODES.UNAUTHORIZED;
  }

  // Class 08 — Connection Exception
  if (pgCode.startsWith('08')) {
    return DB_ERROR_CODES.CONNECTION_ERROR;
  }

  // Class 57 — Operator Intervention
  if (pgCode.startsWith('57')) {
    return DB_ERROR_CODES.SERVICE_UNAVAILABLE;
  }

  // PGRST error codes (PostgREST)
  if (pgCode === 'PGRST116') return DB_ERROR_CODES.NOT_FOUND;
  if (pgCode === 'PGRST301') return DB_ERROR_CODES.FORBIDDEN;

  return DB_ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Type guard to check if error is DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * Helper to safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isDatabaseError(error)) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}
