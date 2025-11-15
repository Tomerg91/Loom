/**
 * @fileoverview Authentication telemetry and audit logging module
 * Tracks all authentication and session-related events with comprehensive telemetry and audit trails
 */

import { captureError, captureMetric } from '@/lib/monitoring/sentry';
import { createAdminClient } from '@/modules/platform/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthEventMetadata {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  timestamp?: Date;
  [key: string]: unknown;
}

export interface AuthAuditLog {
  user_id?: string;
  event_type: AuthEventType;
  event_data: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  device_id?: string;
  success: boolean;
  error_message?: string;
  created_at?: Date;
}

export type AuthEventType =
  | 'session_refresh_started'
  | 'session_refresh_success'
  | 'session_refresh_failed'
  | 'session_refresh_retry'
  | 'forced_signout'
  | 'auth_token_expired'
  | 'auth_token_refresh_retry'
  | 'auth_circuit_breaker_opened'
  | 'auth_circuit_breaker_closed'
  | 'supabase_client_initialized'
  | 'supabase_validation_failed';

// ============================================================================
// SESSION REFRESH TRACKING
// ============================================================================

/**
 * Tracks session refresh initiation
 */
export async function trackSessionRefreshStarted(
  metadata: AuthEventMetadata = {}
): Promise<void> {
  const { userId, sessionId, ...rest } = metadata;

  captureMetric('auth.session_refresh.started', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      has_session_id: sessionId ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.log('[Auth] Session refresh started', {
    userId,
    sessionId,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  await storeAuthAuditLog({
    user_id: userId,
    event_type: 'session_refresh_started',
    event_data: { sessionId, ...rest },
    ip_address: metadata.ipAddress,
    user_agent: metadata.userAgent,
    device_id: metadata.deviceId,
    success: true
  });
}

/**
 * Tracks successful session refresh
 */
export async function trackSessionRefreshSuccess(
  metadata: AuthEventMetadata & { attemptCount?: number; durationMs?: number }
): Promise<void> {
  const { userId, sessionId, attemptCount = 1, durationMs, ...rest } = metadata;

  captureMetric('auth.session_refresh.success', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      attempts: attemptCount.toString(),
      ...extractTags(rest)
    }
  });

  console.log('[Auth] Session refresh succeeded', {
    userId,
    sessionId,
    attemptCount,
    durationMs,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  await storeAuthAuditLog({
    user_id: userId,
    event_type: 'session_refresh_success',
    event_data: { sessionId, attemptCount, durationMs, ...rest },
    ip_address: metadata.ipAddress,
    user_agent: metadata.userAgent,
    device_id: metadata.deviceId,
    success: true
  });
}

/**
 * Tracks failed session refresh
 */
export async function trackSessionRefreshFailed(
  error: Error | string,
  metadata: AuthEventMetadata & { attemptCount?: number; willRetry?: boolean }
): Promise<void> {
  const { userId, sessionId, attemptCount = 1, willRetry = false, ...rest } = metadata;
  const errorMessage = error instanceof Error ? error.message : error;

  captureMetric('auth.session_refresh.failed', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      attempts: attemptCount.toString(),
      will_retry: willRetry.toString(),
      error_type: error instanceof Error ? error.name : 'unknown',
      ...extractTags(rest)
    }
  });

  captureError(error instanceof Error ? error : new Error(errorMessage), {
    level: willRetry ? 'warning' : 'error',
    tags: {
      component: 'session_refresh',
      operation: 'refresh_failed'
    },
    extra: {
      userId,
      sessionId,
      attemptCount,
      willRetry,
      ...rest
    }
  });

  // Store audit log
  await storeAuthAuditLog({
    user_id: userId,
    event_type: 'session_refresh_failed',
    event_data: { sessionId, attemptCount, willRetry, ...rest },
    ip_address: metadata.ipAddress,
    user_agent: metadata.userAgent,
    device_id: metadata.deviceId,
    success: false,
    error_message: errorMessage
  });
}

/**
 * Tracks session refresh retry attempt
 */
export async function trackSessionRefreshRetry(
  metadata: AuthEventMetadata & { attemptNumber: number; maxAttempts: number; delayMs: number }
): Promise<void> {
  const { userId, sessionId, attemptNumber, maxAttempts, delayMs, ...rest } = metadata;

  captureMetric('auth.session_refresh.retry', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      attempt: attemptNumber.toString(),
      max_attempts: maxAttempts.toString(),
      ...extractTags(rest)
    }
  });

  console.log('[Auth] Session refresh retry', {
    userId,
    sessionId,
    attemptNumber,
    maxAttempts,
    delayMs,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  await storeAuthAuditLog({
    user_id: userId,
    event_type: 'session_refresh_retry',
    event_data: { sessionId, attemptNumber, maxAttempts, delayMs, ...rest },
    ip_address: metadata.ipAddress,
    user_agent: metadata.userAgent,
    device_id: metadata.deviceId,
    success: true
  });
}

// ============================================================================
// FORCED SIGNOUT TRACKING
// ============================================================================

/**
 * Tracks forced signout events
 */
export async function trackForcedSignout(
  reason: string,
  metadata: AuthEventMetadata = {}
): Promise<void> {
  const { userId, sessionId, ...rest } = metadata;

  captureMetric('auth.forced_signout', 1, {
    tags: {
      reason,
      has_user_id: userId ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.warn('[Auth] Forced signout', {
    userId,
    sessionId,
    reason,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  await storeAuthAuditLog({
    user_id: userId,
    event_type: 'forced_signout',
    event_data: { sessionId, reason, ...rest },
    ip_address: metadata.ipAddress,
    user_agent: metadata.userAgent,
    device_id: metadata.deviceId,
    success: true
  });
}

// ============================================================================
// TOKEN TRACKING
// ============================================================================

/**
 * Tracks auth token expiration
 */
export async function trackAuthTokenExpired(
  metadata: AuthEventMetadata = {}
): Promise<void> {
  const { userId, sessionId, ...rest } = metadata;

  captureMetric('auth.token.expired', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.log('[Auth] Auth token expired', {
    userId,
    sessionId,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  await storeAuthAuditLog({
    user_id: userId,
    event_type: 'auth_token_expired',
    event_data: { sessionId, ...rest },
    ip_address: metadata.ipAddress,
    user_agent: metadata.userAgent,
    device_id: metadata.deviceId,
    success: true
  });
}

// ============================================================================
// CIRCUIT BREAKER TRACKING
// ============================================================================

/**
 * Tracks circuit breaker state changes
 */
export async function trackCircuitBreakerOpened(
  metadata: AuthEventMetadata & { failureCount: number }
): Promise<void> {
  const { userId, failureCount, ...rest } = metadata;

  captureMetric('auth.circuit_breaker.opened', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      failure_count: failureCount.toString(),
      ...extractTags(rest)
    }
  });

  console.warn('[Auth] Circuit breaker opened', {
    userId,
    failureCount,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  await storeAuthAuditLog({
    user_id: userId,
    event_type: 'auth_circuit_breaker_opened',
    event_data: { failureCount, ...rest },
    ip_address: metadata.ipAddress,
    user_agent: metadata.userAgent,
    device_id: metadata.deviceId,
    success: false,
    error_message: `Circuit breaker opened after ${failureCount} failures`
  });
}

/**
 * Tracks circuit breaker closing
 */
export async function trackCircuitBreakerClosed(
  metadata: AuthEventMetadata = {}
): Promise<void> {
  const { userId, ...rest } = metadata;

  captureMetric('auth.circuit_breaker.closed', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.log('[Auth] Circuit breaker closed', {
    userId,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  await storeAuthAuditLog({
    user_id: userId,
    event_type: 'auth_circuit_breaker_closed',
    event_data: rest,
    ip_address: metadata.ipAddress,
    user_agent: metadata.userAgent,
    device_id: metadata.deviceId,
    success: true
  });
}

// ============================================================================
// SUPABASE CLIENT TRACKING
// ============================================================================

/**
 * Tracks Supabase client initialization
 */
export function trackSupabaseClientInitialized(
  metadata: AuthEventMetadata = {}
): void {
  captureMetric('auth.supabase.initialized', 1, {
    tags: extractTags(metadata)
  });

  console.log('[Auth] Supabase client initialized', {
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Tracks Supabase environment validation failures
 */
export async function trackSupabaseValidationFailed(
  reason: string,
  metadata: AuthEventMetadata = {}
): Promise<void> {
  captureMetric('auth.supabase.validation_failed', 1, {
    tags: {
      reason,
      ...extractTags(metadata)
    }
  });

  console.error('[Auth] Supabase validation failed', {
    reason,
    timestamp: new Date().toISOString(),
    ...metadata
  });

  // Store audit log
  await storeAuthAuditLog({
    user_id: undefined,
    event_type: 'supabase_validation_failed',
    event_data: { reason, ...metadata },
    ip_address: metadata.ipAddress,
    user_agent: metadata.userAgent,
    device_id: metadata.deviceId,
    success: false,
    error_message: `Supabase validation failed: ${reason}`
  });
}

// ============================================================================
// AUDIT LOG STORAGE
// ============================================================================

/**
 * Stores auth audit log entry in the database using admin client.
 * Uses service_role privileges to bypass RLS policies.
 */
async function storeAuthAuditLog(log: AuthAuditLog): Promise<void> {
  try {
    // Use admin client with service_role to bypass RLS
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('auth_audit_logs')
      .insert({
        user_id: log.user_id,
        event_type: log.event_type,
        event_data: log.event_data,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        device_id: log.device_id,
        success: log.success,
        error_message: log.error_message,
        created_at: log.created_at || new Date().toISOString()
      });

    if (error) {
      console.error('[Auth] Failed to store audit log:', error);
      captureError(error as Error, {
        level: 'error',
        tags: {
          component: 'auth_audit_log',
          operation: 'store_log'
        },
        extra: { log }
      });
    }
  } catch (error) {
    console.error('[Auth] Error storing audit log:', error);
    captureError(error as Error, {
      level: 'error',
      tags: {
        component: 'auth_audit_log',
        operation: 'store_log'
      }
    });
  }
}

/**
 * Retrieves auth audit logs using admin client.
 * Uses service_role to ensure access regardless of caller context.
 */
export async function getAuthAuditLogs(
  options: {
    userId?: string;
    limit?: number;
    offset?: number;
    eventTypes?: AuthEventType[];
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<AuthAuditLog[]> {
  try {
    // Use admin client to bypass RLS and ensure consistent access
    const supabase = createAdminClient();
    const { userId, limit = 50, offset = 0, eventTypes, startDate, endDate } = options;

    let query = supabase
      .from('auth_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (eventTypes && eventTypes.length > 0) {
      query = query.in('event_type', eventTypes);
    }

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Auth] Failed to retrieve audit logs:', error);
      captureError(error as Error, {
        level: 'error',
        tags: {
          component: 'auth_audit_log',
          operation: 'retrieve_logs'
        },
        extra: { options }
      });
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Auth] Error retrieving audit logs:', error);
    captureError(error as Error, {
      level: 'error',
      tags: {
        component: 'auth_audit_log',
        operation: 'retrieve_logs'
      }
    });
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts tags from metadata for metric tracking
 */
function extractTags(metadata: Record<string, unknown>): Record<string, string> {
  const tags: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      tags[key] = String(value);
    }
  }

  return tags;
}

/**
 * Gets current request metadata for audit logging
 */
export function getRequestMetadata(request?: Request): Pick<AuthEventMetadata, 'ipAddress' | 'userAgent'> {
  if (!request) {
    return {};
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}
