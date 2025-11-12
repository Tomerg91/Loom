/**
 * @fileoverview MFA telemetry and audit logging module
 * Tracks all MFA-related events with comprehensive telemetry and audit trails
 */

import { captureError, captureMetric } from '@/lib/monitoring/sentry';
import { createAdminClient } from '@/modules/platform/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface MfaEventMetadata {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  timestamp?: Date;
  [key: string]: unknown;
}

export interface MfaAuditLog {
  user_id: string;
  event_type: MfaEventType;
  event_data: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  device_id?: string;
  success: boolean;
  error_message?: string;
  created_at?: Date;
}

export type MfaEventType =
  | 'mfa_setup_started'
  | 'mfa_setup_completed'
  | 'mfa_setup_failed'
  | 'mfa_setup_cancelled'
  | 'mfa_verification_started'
  | 'mfa_verification_success'
  | 'mfa_verification_failed'
  | 'mfa_verification_blocked'
  | 'mfa_backup_code_used'
  | 'mfa_backup_code_regenerated'
  | 'mfa_device_trusted'
  | 'mfa_device_untrusted'
  | 'mfa_disabled'
  | 'mfa_method_changed'
  | 'mfa_recovery_initiated'
  | 'mfa_rate_limit_hit';

// ============================================================================
// MFA EVENT TRACKING
// ============================================================================

/**
 * Tracks MFA setup initiation
 */
export function trackMfaSetupStarted(metadata: MfaEventMetadata = {}): void {
  const { userId, ...rest } = metadata;

  captureMetric('mfa.setup.started', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.log('[MFA] Setup started', {
    userId,
    timestamp: new Date().toISOString(),
    ...rest
  });
}

/**
 * Tracks successful MFA setup completion
 */
export async function trackMfaSetupCompleted(
  metadata: MfaEventMetadata & { method?: string }
): Promise<void> {
  const { userId, method = 'totp', ...rest } = metadata;

  captureMetric('mfa.setup.completed', 1, {
    tags: {
      method,
      has_user_id: userId ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.log('[MFA] Setup completed', {
    userId,
    method,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  if (userId) {
    await storeMfaAuditLog({
      user_id: userId,
      event_type: 'mfa_setup_completed',
      event_data: { method, ...rest },
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
      device_id: metadata.deviceId,
      success: true
    });
  }
}

/**
 * Tracks failed MFA setup
 */
export async function trackMfaSetupFailed(
  error: Error | string,
  metadata: MfaEventMetadata = {}
): Promise<void> {
  const { userId, ...rest } = metadata;
  const errorMessage = error instanceof Error ? error.message : error;

  captureMetric('mfa.setup.failed', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      error_type: error instanceof Error ? error.name : 'unknown',
      ...extractTags(rest)
    }
  });

  captureError(error instanceof Error ? error : new Error(errorMessage), {
    level: 'error',
    tags: {
      component: 'mfa_setup',
      operation: 'setup_failed'
    },
    extra: {
      userId,
      ...rest
    }
  });

  // Store audit log
  if (userId) {
    await storeMfaAuditLog({
      user_id: userId,
      event_type: 'mfa_setup_failed',
      event_data: rest,
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
      device_id: metadata.deviceId,
      success: false,
      error_message: errorMessage
    });
  }
}

/**
 * Tracks MFA setup cancellation
 */
export function trackMfaSetupCancelled(metadata: MfaEventMetadata = {}): void {
  const { userId, ...rest } = metadata;

  captureMetric('mfa.setup.cancelled', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.log('[MFA] Setup cancelled', {
    userId,
    timestamp: new Date().toISOString(),
    ...rest
  });
}

/**
 * Tracks MFA verification initiation
 */
export function trackMfaVerificationStarted(metadata: MfaEventMetadata & { method?: string } = {}): void {
  const { userId, method = 'totp', ...rest } = metadata;

  captureMetric('mfa.verification.started', 1, {
    tags: {
      method,
      has_user_id: userId ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.log('[MFA] Verification started', {
    userId,
    method,
    timestamp: new Date().toISOString(),
    ...rest
  });
}

/**
 * Tracks successful MFA verification
 */
export async function trackMfaVerificationSuccess(
  metadata: MfaEventMetadata & { method?: string; attemptCount?: number }
): Promise<void> {
  const { userId, method = 'totp', attemptCount = 1, ...rest } = metadata;

  captureMetric('mfa.verification.success', 1, {
    tags: {
      method,
      attempts: attemptCount.toString(),
      has_user_id: userId ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.log('[MFA] Verification succeeded', {
    userId,
    method,
    attemptCount,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  if (userId) {
    await storeMfaAuditLog({
      user_id: userId,
      event_type: 'mfa_verification_success',
      event_data: { method, attemptCount, ...rest },
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
      device_id: metadata.deviceId,
      success: true
    });
  }
}

/**
 * Tracks failed MFA verification
 */
export async function trackMfaVerificationFailed(
  error: Error | string,
  metadata: MfaEventMetadata & { method?: string; attemptCount?: number }
): Promise<void> {
  const { userId, method = 'totp', attemptCount = 1, ...rest } = metadata;
  const errorMessage = error instanceof Error ? error.message : error;

  captureMetric('mfa.verification.failed', 1, {
    tags: {
      method,
      attempts: attemptCount.toString(),
      has_user_id: userId ? 'true' : 'false',
      error_type: error instanceof Error ? error.name : 'unknown',
      ...extractTags(rest)
    }
  });

  captureError(error instanceof Error ? error : new Error(errorMessage), {
    level: 'warning',
    tags: {
      component: 'mfa_verification',
      operation: 'verification_failed'
    },
    extra: {
      userId,
      method,
      attemptCount,
      ...rest
    }
  });

  // Store audit log
  if (userId) {
    await storeMfaAuditLog({
      user_id: userId,
      event_type: 'mfa_verification_failed',
      event_data: { method, attemptCount, ...rest },
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
      device_id: metadata.deviceId,
      success: false,
      error_message: errorMessage
    });
  }
}

/**
 * Tracks MFA verification being blocked (rate limit, account lock, etc.)
 */
export async function trackMfaVerificationBlocked(
  reason: string,
  metadata: MfaEventMetadata = {}
): Promise<void> {
  const { userId, ...rest } = metadata;

  captureMetric('mfa.verification.blocked', 1, {
    tags: {
      reason,
      has_user_id: userId ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.warn('[MFA] Verification blocked', {
    userId,
    reason,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  if (userId) {
    await storeMfaAuditLog({
      user_id: userId,
      event_type: 'mfa_verification_blocked',
      event_data: { reason, ...rest },
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
      device_id: metadata.deviceId,
      success: false,
      error_message: `Verification blocked: ${reason}`
    });
  }
}

/**
 * Tracks backup code usage
 */
export async function trackMfaBackupCodeUsed(
  metadata: MfaEventMetadata & { codesRemaining?: number }
): Promise<void> {
  const { userId, codesRemaining, ...rest } = metadata;

  captureMetric('mfa.backup_code.used', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      codes_remaining: codesRemaining?.toString() || 'unknown',
      ...extractTags(rest)
    }
  });

  console.log('[MFA] Backup code used', {
    userId,
    codesRemaining,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  if (userId) {
    await storeMfaAuditLog({
      user_id: userId,
      event_type: 'mfa_backup_code_used',
      event_data: { codesRemaining, ...rest },
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
      device_id: metadata.deviceId,
      success: true
    });
  }

  // Warn if running low on backup codes
  if (codesRemaining !== undefined && codesRemaining <= 2) {
    console.warn(`[MFA] User ${userId} has only ${codesRemaining} backup codes remaining`);
    captureMetric('mfa.backup_code.low_warning', 1, {
      tags: { codes_remaining: codesRemaining.toString() }
    });
  }
}

/**
 * Tracks rate limit hits during MFA operations
 */
export async function trackMfaRateLimitHit(
  operation: string,
  metadata: MfaEventMetadata = {}
): Promise<void> {
  const { userId, ...rest } = metadata;

  captureMetric('mfa.rate_limit.hit', 1, {
    tags: {
      operation,
      has_user_id: userId ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.warn('[MFA] Rate limit hit', {
    userId,
    operation,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  if (userId) {
    await storeMfaAuditLog({
      user_id: userId,
      event_type: 'mfa_rate_limit_hit',
      event_data: { operation, ...rest },
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
      device_id: metadata.deviceId,
      success: false,
      error_message: `Rate limit exceeded for ${operation}`
    });
  }
}

/**
 * Tracks device trust events
 */
export async function trackMfaDeviceTrusted(
  metadata: MfaEventMetadata & { deviceName?: string; expiresAt?: Date }
): Promise<void> {
  const { userId, deviceName, expiresAt, ...rest } = metadata;

  captureMetric('mfa.device.trusted', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      has_device_name: deviceName ? 'true' : 'false',
      ...extractTags(rest)
    }
  });

  console.log('[MFA] Device trusted', {
    userId,
    deviceName,
    expiresAt,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  if (userId) {
    await storeMfaAuditLog({
      user_id: userId,
      event_type: 'mfa_device_trusted',
      event_data: { deviceName, expiresAt, ...rest },
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
      device_id: metadata.deviceId,
      success: true
    });
  }
}

/**
 * Tracks MFA disable events
 */
export async function trackMfaDisabled(
  metadata: MfaEventMetadata & { reason?: string }
): Promise<void> {
  const { userId, reason, ...rest } = metadata;

  captureMetric('mfa.disabled', 1, {
    tags: {
      has_user_id: userId ? 'true' : 'false',
      reason: reason || 'user_initiated',
      ...extractTags(rest)
    }
  });

  console.warn('[MFA] MFA disabled for user', {
    userId,
    reason,
    timestamp: new Date().toISOString(),
    ...rest
  });

  // Store audit log
  if (userId) {
    await storeMfaAuditLog({
      user_id: userId,
      event_type: 'mfa_disabled',
      event_data: { reason, ...rest },
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
      device_id: metadata.deviceId,
      success: true
    });
  }
}

// ============================================================================
// AUDIT LOG STORAGE
// ============================================================================

/**
 * Stores MFA audit log entry in the database using admin client.
 * Uses service_role privileges to bypass RLS policies.
 */
async function storeMfaAuditLog(log: MfaAuditLog): Promise<void> {
  try {
    // Use admin client with service_role to bypass RLS
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('mfa_audit_logs')
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
      console.error('[MFA] Failed to store audit log:', error);
      captureError(error as Error, {
        level: 'error',
        tags: {
          component: 'mfa_audit_log',
          operation: 'store_log'
        },
        extra: { log }
      });
    }
  } catch (error) {
    console.error('[MFA] Error storing audit log:', error);
    captureError(error as Error, {
      level: 'error',
      tags: {
        component: 'mfa_audit_log',
        operation: 'store_log'
      }
    });
  }
}

/**
 * Retrieves MFA audit logs for a user using admin client.
 * Uses service_role to ensure access regardless of caller context.
 */
export async function getMfaAuditLogs(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    eventTypes?: MfaEventType[];
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<MfaAuditLog[]> {
  try {
    // Use admin client to bypass RLS and ensure consistent access
    const supabase = createAdminClient();
    const { limit = 50, offset = 0, eventTypes, startDate, endDate } = options;

    let query = supabase
      .from('mfa_audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
      console.error('[MFA] Failed to retrieve audit logs:', error);
      captureError(error as Error, {
        level: 'error',
        tags: {
          component: 'mfa_audit_log',
          operation: 'retrieve_logs'
        },
        extra: { userId, options }
      });
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[MFA] Error retrieving audit logs:', error);
    captureError(error as Error, {
      level: 'error',
      tags: {
        component: 'mfa_audit_log',
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
export function getRequestMetadata(request?: Request): Pick<MfaEventMetadata, 'ipAddress' | 'userAgent'> {
  if (!request) {
    return {};
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}
