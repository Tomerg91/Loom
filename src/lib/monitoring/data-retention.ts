/**
 * Data Retention Policies
 *
 * Manages automated cleanup of analytics data according to retention policies:
 * - Analytics events: 90 days
 * - Audit logs: 1 year
 * - Security events: 2 years
 * - Performance metrics: 30 days
 * - Temporary session data: 7 days
 */

import { createAdminClient } from '@/modules/platform/supabase/server';
import * as Sentry from '@sentry/nextjs';

// ============================================================================
// RETENTION POLICY CONFIGURATION
// ============================================================================

export const RETENTION_POLICIES = {
  // Analytics and event data
  ANALYTICS_EVENTS: 90, // days
  ONBOARDING_FUNNEL: 180, // days
  GOAL_PROGRESS: 365, // days
  DOWNLOAD_LOGS: 90, // days

  // Security and audit data
  MFA_AUDIT_LOGS: 730, // 2 years
  SECURITY_EVENTS: 730, // 2 years

  // Performance data
  PERFORMANCE_METRICS: 30, // days

  // Temporary data
  SESSION_DATA: 7, // days
  TEMPORARY_TOKENS: 1, // days
} as const;

// ============================================================================
// DATA CLEANUP FUNCTIONS
// ============================================================================

/**
 * Clean up old analytics events
 */
export async function cleanupAnalyticsEvents(): Promise<{
  deleted: number;
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.ANALYTICS_EVENTS);

    const { count, error } = await supabase
      .from('events')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    // Track cleanup
    Sentry.metrics.increment('data_cleanup', count || 0, {
      tags: {
        type: 'analytics_events',
      },
    });

    Sentry.captureMessage('Analytics events cleaned up', {
      level: 'info',
      tags: {
        cleanup_type: 'analytics_events',
      },
      extra: {
        deletedCount: count,
        cutoffDate: cutoffDate.toISOString(),
      },
    });

    return { deleted: count || 0 };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        cleanup_type: 'analytics_events',
      },
    });

    return {
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up old onboarding funnel data
 */
export async function cleanupOnboardingFunnel(): Promise<{
  deleted: number;
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.ONBOARDING_FUNNEL);

    const { count, error } = await supabase
      .from('onboarding_funnel')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    Sentry.metrics.increment('data_cleanup', count || 0, {
      tags: {
        type: 'onboarding_funnel',
      },
    });

    return { deleted: count || 0 };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        cleanup_type: 'onboarding_funnel',
      },
    });

    return {
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up old download logs
 */
export async function cleanupDownloadLogs(): Promise<{
  deleted: number;
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.DOWNLOAD_LOGS);

    const { count, error } = await supabase
      .from('download_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    Sentry.metrics.increment('data_cleanup', count || 0, {
      tags: {
        type: 'download_logs',
      },
    });

    return { deleted: count || 0 };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        cleanup_type: 'download_logs',
      },
    });

    return {
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up old MFA audit logs
 */
export async function cleanupMfaAuditLogs(): Promise<{
  deleted: number;
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.MFA_AUDIT_LOGS);

    const { count, error } = await supabase
      .from('mfa_audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    Sentry.metrics.increment('data_cleanup', count || 0, {
      tags: {
        type: 'mfa_audit_logs',
      },
    });

    return { deleted: count || 0 };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        cleanup_type: 'mfa_audit_logs',
      },
    });

    return {
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up old security events
 */
export async function cleanupSecurityEvents(): Promise<{
  deleted: number;
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.SECURITY_EVENTS);

    const { count, error } = await supabase
      .from('security_events')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    Sentry.metrics.increment('data_cleanup', count || 0, {
      tags: {
        type: 'security_events',
      },
    });

    return { deleted: count || 0 };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        cleanup_type: 'security_events',
      },
    });

    return {
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up expired trusted devices
 */
export async function cleanupExpiredTrustedDevices(): Promise<{
  deleted: number;
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();
    const now = new Date();

    const { count, error } = await supabase
      .from('trusted_devices')
      .delete()
      .lt('expires_at', now.toISOString())
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    Sentry.metrics.increment('data_cleanup', count || 0, {
      tags: {
        type: 'trusted_devices',
      },
    });

    return { deleted: count || 0 };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        cleanup_type: 'trusted_devices',
      },
    });

    return {
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run all data cleanup tasks
 */
export async function cleanupOldAnalyticsData(): Promise<{
  totalDeleted: number;
  results: Record<string, { deleted: number; error?: string }>;
}> {
  console.log('[Data Retention] Starting cleanup...');

  const results = {
    analyticsEvents: await cleanupAnalyticsEvents(),
    onboardingFunnel: await cleanupOnboardingFunnel(),
    downloadLogs: await cleanupDownloadLogs(),
    mfaAuditLogs: await cleanupMfaAuditLogs(),
    securityEvents: await cleanupSecurityEvents(),
    trustedDevices: await cleanupExpiredTrustedDevices(),
  };

  const totalDeleted = Object.values(results).reduce(
    (sum, result) => sum + result.deleted,
    0
  );

  const errors = Object.entries(results)
    .filter(([_, result]) => result.error)
    .map(([type, result]) => `${type}: ${result.error}`);

  console.log(`[Data Retention] Cleanup completed. Total deleted: ${totalDeleted}`);

  if (errors.length > 0) {
    console.error('[Data Retention] Errors:', errors);
    Sentry.captureMessage('Data cleanup completed with errors', {
      level: 'warning',
      extra: {
        totalDeleted,
        errors,
      },
    });
  } else {
    Sentry.captureMessage('Data cleanup completed successfully', {
      level: 'info',
      extra: {
        totalDeleted,
        results,
      },
    });
  }

  // Track total cleanup metric
  Sentry.metrics.increment('data_cleanup_total', totalDeleted);

  return { totalDeleted, results };
}

/**
 * Get retention policy summary
 */
export function getRetentionPolicySummary() {
  return {
    policies: RETENTION_POLICIES,
    descriptions: {
      ANALYTICS_EVENTS: 'General analytics and event tracking data',
      ONBOARDING_FUNNEL: 'User onboarding progress and completion data',
      GOAL_PROGRESS: 'User goal tracking and milestone data',
      DOWNLOAD_LOGS: 'Resource download activity logs',
      MFA_AUDIT_LOGS: 'Multi-factor authentication audit trails',
      SECURITY_EVENTS: 'Security-related events and incidents',
      PERFORMANCE_METRICS: 'Application performance measurements',
      SESSION_DATA: 'Temporary session-related data',
      TEMPORARY_TOKENS: 'One-time use tokens and temporary credentials',
    },
    lastCleanup: null, // Would be fetched from database
    nextScheduledCleanup: null, // Would be calculated based on cron schedule
  };
}

/**
 * Validate retention policy compliance
 */
export async function validateRetentionCompliance(): Promise<{
  compliant: boolean;
  issues: Array<{
    table: string;
    oldestRecord: Date;
    expectedCutoff: Date;
    violationDays: number;
  }>;
}> {
  const issues: Array<{
    table: string;
    oldestRecord: Date;
    expectedCutoff: Date;
    violationDays: number;
  }> = [];

  try {
    const supabase = await createAdminClient();

    // Check each table for compliance
    const checks = [
      { table: 'events', policy: RETENTION_POLICIES.ANALYTICS_EVENTS },
      { table: 'onboarding_funnel', policy: RETENTION_POLICIES.ONBOARDING_FUNNEL },
      { table: 'download_logs', policy: RETENTION_POLICIES.DOWNLOAD_LOGS },
      { table: 'mfa_audit_logs', policy: RETENTION_POLICIES.MFA_AUDIT_LOGS },
      { table: 'security_events', policy: RETENTION_POLICIES.SECURITY_EVENTS },
    ];

    for (const check of checks) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - check.policy);

      const { data, error } = await supabase
        .from(check.table)
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error(`Error checking ${check.table}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        const oldestRecord = new Date(data[0].created_at);

        if (oldestRecord < cutoffDate) {
          const violationDays = Math.floor(
            (cutoffDate.getTime() - oldestRecord.getTime()) / (1000 * 60 * 60 * 24)
          );

          issues.push({
            table: check.table,
            oldestRecord,
            expectedCutoff: cutoffDate,
            violationDays,
          });
        }
      }
    }

    const compliant = issues.length === 0;

    if (!compliant) {
      Sentry.captureMessage('Data retention policy violations detected', {
        level: 'warning',
        extra: {
          issueCount: issues.length,
          issues,
        },
      });
    }

    return { compliant, issues };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        compliance_check: 'retention_policy',
      },
    });

    return { compliant: false, issues: [] };
  }
}
