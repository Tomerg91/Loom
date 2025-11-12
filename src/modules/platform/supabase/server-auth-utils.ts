/**
 * @fileoverview Server-side authentication utilities for retry/backoff,
 * circuit breaker patterns, environment validation, and telemetry.
 * Hardens Supabase auth operations with comprehensive error handling.
 */

import { captureError, captureMetric } from '@/lib/monitoring/sentry';
import { PLACEHOLDER_SUPABASE_ANON_KEY, PLACEHOLDER_SUPABASE_URL } from '@/env/server';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/** Maximum number of retry attempts for auth operations */
const MAX_AUTH_RETRIES = parseInt(process.env.MAX_AUTH_RETRIES || '3', 10);

/** Base delay in milliseconds for exponential backoff */
const AUTH_RETRY_DELAY_MS = parseInt(process.env.AUTH_RETRY_DELAY_MS || '1000', 10);

/** Circuit breaker failure threshold before opening circuit */
const CIRCUIT_BREAKER_THRESHOLD = parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10);

/** Circuit breaker timeout before attempting to close circuit (ms) */
const CIRCUIT_BREAKER_TIMEOUT_MS = parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS || '60000', 10);

/** Circuit breaker half-open state success threshold */
const CIRCUIT_BREAKER_SUCCESS_THRESHOLD = parseInt(process.env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD || '2', 10);

// ============================================================================
// TYPES
// ============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelay?: number;
  /** Maximum delay cap in milliseconds */
  maxDelay?: number;
  /** Operation name for telemetry */
  operation?: string;
  /** Whether to use circuit breaker */
  useCircuitBreaker?: boolean;
  /** Custom retry condition */
  shouldRetry?: (error: unknown) => boolean;
}

export interface CircuitBreakerStats {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastStateChange: number;
}

export interface AuthValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange = Date.now();
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async execute<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Check circuit state
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);

      if (timeSinceLastFailure < CIRCUIT_BREAKER_TIMEOUT_MS) {
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        captureError(error, {
          level: 'warning',
          tags: {
            circuit_breaker: this.name,
            state: this.state,
            operation: operationName
          },
          extra: this.getStats()
        });
        throw error;
      }

      // Transition to half-open
      this.transitionTo('half-open');
    }

    try {
      const result = await operation();
      this.onSuccess(operationName);
      return result;
    } catch (error) {
      this.onFailure(error, operationName);
      throw error;
    }
  }

  private onSuccess(operationName: string): void {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;

      if (this.successCount >= CIRCUIT_BREAKER_SUCCESS_THRESHOLD) {
        this.transitionTo('closed');
        this.successCount = 0;
      }

      captureMetric('circuit_breaker.success', 1, {
        tags: {
          circuit: this.name,
          state: this.state,
          operation: operationName
        }
      });
    }
  }

  private onFailure(error: unknown, operationName: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    captureMetric('circuit_breaker.failure', 1, {
      tags: {
        circuit: this.name,
        state: this.state,
        operation: operationName
      }
    });

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (this.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      this.transitionTo('open');
    }

    captureError(error as Error, {
      level: 'error',
      tags: {
        circuit_breaker: this.name,
        state: this.state,
        operation: operationName
      },
      extra: this.getStats()
    });
  }

  private transitionTo(newState: 'closed' | 'open' | 'half-open'): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    console.warn(
      `[CircuitBreaker:${this.name}] State transition: ${oldState} -> ${newState}`
    );

    captureMetric('circuit_breaker.state_change', 1, {
      tags: {
        circuit: this.name,
        from_state: oldState,
        to_state: newState
      }
    });
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
  }
}

// Global circuit breaker instances
const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(name: string): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name));
  }
  return circuitBreakers.get(name)!;
}

// ============================================================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================================================

/**
 * Executes an async operation with retry logic and exponential backoff.
 * Includes telemetry for all attempts and failures.
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = MAX_AUTH_RETRIES,
    baseDelay = AUTH_RETRY_DELAY_MS,
    maxDelay = 30000,
    operation: operationName = 'auth_operation',
    useCircuitBreaker = false,
    shouldRetry = defaultShouldRetry,
  } = options;

  const startTime = Date.now();
  let lastError: unknown;

  const executeOperation = async (): Promise<T> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();

        // Track successful operation
        if (attempt > 0) {
          captureMetric('auth.retry.success', 1, {
            tags: {
              operation: operationName,
              attempts: attempt + 1
            }
          });
        }

        // Track operation duration
        const duration = Date.now() - startTime;
        captureMetric('auth.operation.duration', duration, {
          tags: { operation: operationName, success: 'true' }
        });

        return result;
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (!shouldRetry(error) || attempt === maxRetries) {
          // Final failure - capture comprehensive telemetry
          captureMetric('auth.operation.failure', 1, {
            tags: {
              operation: operationName,
              attempts: attempt + 1,
              error_type: error instanceof Error ? error.name : 'unknown'
            }
          });

          captureError(error as Error, {
            level: 'error',
            tags: {
              operation: operationName,
              attempts: attempt + 1,
              retry_exhausted: 'true'
            },
            extra: {
              attemptCount: attempt + 1,
              maxRetries,
              duration: Date.now() - startTime
            }
          });

          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt),
          maxDelay
        );

        // Track retry attempt
        captureMetric('auth.retry.attempt', 1, {
          tags: {
            operation: operationName,
            attempt: attempt + 1,
            delay_ms: delay
          }
        });

        console.warn(
          `[${operationName}] Attempt ${attempt + 1}/${maxRetries + 1} failed. ` +
          `Retrying in ${delay}ms...`,
          error instanceof Error ? error.message : error
        );

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  };

  // Execute with or without circuit breaker
  if (useCircuitBreaker) {
    const circuitBreaker = getCircuitBreaker(operationName);
    return circuitBreaker.execute(executeOperation, operationName);
  }

  return executeOperation();
}

/**
 * Default retry condition - retries on network errors and 5xx status codes
 */
function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Retry on network errors
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return true;
    }

    // Retry on 5xx errors
    if (message.includes('500') || message.includes('502') ||
        message.includes('503') || message.includes('504')) {
      return true;
    }

    // Don't retry on auth errors (401, 403)
    if (message.includes('401') || message.includes('403') ||
        message.includes('unauthorized') || message.includes('forbidden')) {
      return false;
    }
  }

  return false;
}

// ============================================================================
// ENHANCED ENVIRONMENT VALIDATION
// ============================================================================

/**
 * Validates all server-side authentication environment variables
 * with comprehensive checks and telemetry.
 */
export function validateAuthEnvironment(): AuthValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const startTime = Date.now();

  try {
    // Validate Supabase URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      errors.push('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    } else if (
      supabaseUrl === PLACEHOLDER_SUPABASE_URL ||
      supabaseUrl.startsWith('MISSING_') ||
      supabaseUrl.startsWith('INVALID_')
    ) {
      errors.push(`Invalid Supabase URL: ${supabaseUrl}. Replace with actual project URL.`);
    } else {
      try {
        const url = new URL(supabaseUrl);
        if (!url.hostname.includes('supabase')) {
          warnings.push(`Supabase URL does not contain 'supabase': ${url.hostname}`);
        }
      } catch {
        errors.push(`Invalid URL format: ${supabaseUrl}`);
      }
    }

    // Validate Supabase anon key
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!anonKey) {
      errors.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
    } else if (anonKey === PLACEHOLDER_SUPABASE_ANON_KEY) {
      errors.push('Supabase anon key is a placeholder value');
    } else {
      const looksLegacyJwt = anonKey.startsWith('eyJ');
      const looksNewKey = anonKey.startsWith('sb_');
      if (!looksLegacyJwt && !looksNewKey) {
        errors.push(`Invalid anon key prefix. Expected 'eyJ' or 'sb_', got: ${anonKey.substring(0, 8)}`);
      }
    }

    // Validate service role key (optional but recommended)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      warnings.push('SUPABASE_SERVICE_ROLE_KEY not set. Admin operations will fail.');
    } else {
      const looksLegacyJwt = serviceRoleKey.startsWith('eyJ');
      const looksNewKey = serviceRoleKey.startsWith('sb_');
      if (!looksLegacyJwt && !looksNewKey) {
        errors.push(`Invalid service role key prefix. Expected 'eyJ' or 'sb_'`);
      }
    }

    // Validate MFA encryption keys (if MFA is enabled)
    const mfaEnabled = process.env.NEXT_PUBLIC_ENABLE_MFA === 'true';

    if (mfaEnabled) {
      const mfaEncryptionKey = process.env.MFA_ENCRYPTION_KEY;
      const mfaSigningKey = process.env.MFA_SIGNING_KEY;

      if (!mfaEncryptionKey || mfaEncryptionKey.length < 32) {
        errors.push('MFA_ENCRYPTION_KEY must be at least 32 characters');
      }

      if (!mfaSigningKey || mfaSigningKey.length < 32) {
        errors.push('MFA_SIGNING_KEY must be at least 32 characters');
      }
    }

    // Validate retry configuration
    if (isNaN(MAX_AUTH_RETRIES) || MAX_AUTH_RETRIES < 0 || MAX_AUTH_RETRIES > 10) {
      warnings.push(`MAX_AUTH_RETRIES should be between 0 and 10, got: ${MAX_AUTH_RETRIES}`);
    }

    if (isNaN(AUTH_RETRY_DELAY_MS) || AUTH_RETRY_DELAY_MS < 100) {
      warnings.push(`AUTH_RETRY_DELAY_MS should be at least 100ms, got: ${AUTH_RETRY_DELAY_MS}`);
    }

    // Validate circuit breaker configuration
    if (isNaN(CIRCUIT_BREAKER_THRESHOLD) || CIRCUIT_BREAKER_THRESHOLD < 1) {
      warnings.push(`CIRCUIT_BREAKER_THRESHOLD should be at least 1, got: ${CIRCUIT_BREAKER_THRESHOLD}`);
    }

    const validationDuration = Date.now() - startTime;
    const valid = errors.length === 0;

    // Track validation results
    captureMetric('auth.env_validation.duration', validationDuration, {
      tags: { valid: valid.toString() }
    });

    if (!valid) {
      captureError(new Error('Auth environment validation failed'), {
        level: 'error',
        tags: { validation: 'failed' },
        extra: { errors, warnings }
      });
    } else if (warnings.length > 0) {
      console.warn('[Auth] Environment validation warnings:', warnings);
      captureMetric('auth.env_validation.warnings', warnings.length);
    }

    return { valid, errors, warnings };
  } catch (error) {
    captureError(error as Error, {
      level: 'error',
      tags: { component: 'auth_env_validation' }
    });

    return {
      valid: false,
      errors: [`Environment validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings
    };
  }
}

/**
 * Validates environment and throws if invalid.
 * Call this at server startup or in API route handlers.
 */
export function ensureValidAuthEnvironment(): void {
  const result = validateAuthEnvironment();

  if (!result.valid) {
    const errorMessage =
      'Authentication environment validation failed:\n' +
      result.errors.map(e => `  - ${e}`).join('\n');

    throw new Error(errorMessage);
  }

  if (result.warnings.length > 0) {
    console.warn(
      '[Auth] Environment validation passed with warnings:\n' +
      result.warnings.map(w => `  - ${w}`).join('\n')
    );
  }
}

// ============================================================================
// FORCED SIGN-OUT WITH TELEMETRY
// ============================================================================

export interface ForceSignOutOptions {
  reason: 'token_expired' | 'invalid_session' | 'security_violation' | 'mfa_required' | 'manual';
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tracks forced sign-out events with comprehensive telemetry
 */
export function trackForceSignOut(options: ForceSignOutOptions): void {
  const { reason, userId, metadata = {} } = options;

  // Capture metric
  captureMetric('auth.force_signout', 1, {
    tags: {
      reason,
      has_user_id: userId ? 'true' : 'false'
    }
  });

  // Log event
  console.warn(
    `[Auth] Forced sign-out triggered`,
    { reason, userId, timestamp: new Date().toISOString(), ...metadata }
  );

  // Capture to Sentry for tracking
  captureError(new Error(`Forced sign-out: ${reason}`), {
    level: 'warning',
    tags: {
      auth_event: 'force_signout',
      reason
    },
    extra: {
      userId,
      timestamp: new Date().toISOString(),
      ...metadata
    }
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MAX_AUTH_RETRIES,
  AUTH_RETRY_DELAY_MS,
  CIRCUIT_BREAKER_THRESHOLD,
  CIRCUIT_BREAKER_TIMEOUT_MS,
  getCircuitBreaker,
};
