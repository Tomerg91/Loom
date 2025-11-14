/**
 * Anomaly Detection & Alerting System
 *
 * Monitors and alerts on anomalies including:
 * - Sudden engagement drops
 * - Authentication failure spikes
 * - Notification disconnect patterns
 * - Performance degradation
 * - Unusual user behavior
 */

import * as Sentry from '@sentry/nextjs';
import { triggerAlert } from './alerting';
import { createAdminClient } from '@/modules/platform/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface AnomalyThreshold {
  metricName: string;
  windowMinutes: number;
  threshold: number;
  comparison: 'above' | 'below' | 'change_percent';
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface AnomalyDetection {
  id: string;
  metricName: string;
  currentValue: number;
  expectedValue: number;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  detectedAt: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// ENGAGEMENT ANOMALY DETECTION
// ============================================================================

/**
 * Detect sudden drop in user engagement
 */
export async function detectEngagementDrop(options: {
  windowMinutes?: number;
  dropThresholdPercent?: number;
}): Promise<AnomalyDetection | null> {
  const { windowMinutes = 60, dropThresholdPercent = 30 } = options;

  try {
    const supabase = await createAdminClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
    const previousWindowStart = new Date(
      windowStart.getTime() - windowMinutes * 60 * 1000
    );

    // Get current window engagement
    const { count: currentCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .in('category', ['engagement', 'session', 'task', 'goal'])
      .gte('created_at', windowStart.toISOString());

    // Get previous window engagement
    const { count: previousCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .in('category', ['engagement', 'session', 'task', 'goal'])
      .gte('created_at', previousWindowStart.toISOString())
      .lt('created_at', windowStart.toISOString());

    if (previousCount && currentCount !== null) {
      const dropPercent = ((previousCount - currentCount) / previousCount) * 100;

      if (dropPercent >= dropThresholdPercent) {
        const anomaly: AnomalyDetection = {
          id: `engagement_drop_${Date.now()}`,
          metricName: 'user_engagement',
          currentValue: currentCount,
          expectedValue: previousCount,
          threshold: dropThresholdPercent,
          severity: dropPercent >= 50 ? 'critical' : dropPercent >= 40 ? 'error' : 'warning',
          detectedAt: now,
          metadata: {
            dropPercent,
            windowMinutes,
            currentCount,
            previousCount,
          },
        };

        // Trigger alert
        await triggerAlert({
          name: 'Engagement Drop Detected',
          type: 'engagement_drop',
          severity: anomaly.severity,
          metric: 'user_engagement',
          currentValue: currentCount,
          threshold: previousCount,
          message: `User engagement dropped by ${dropPercent.toFixed(1)}% in the last ${windowMinutes} minutes`,
          metadata: anomaly.metadata,
        });

        // Track in Sentry
        Sentry.captureMessage('Engagement drop detected', {
          level: anomaly.severity === 'critical' ? 'error' : 'warning',
          tags: {
            anomaly_type: 'engagement_drop',
            severity: anomaly.severity,
          },
          extra: anomaly.metadata,
        });

        // Track metric
        Sentry.metrics.increment('anomalies_detected', 1, {
          tags: {
            type: 'engagement_drop',
            severity: anomaly.severity,
          },
        });

        return anomaly;
      }
    }

    return null;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { anomaly_detection: 'engagement_drop' },
    });
    return null;
  }
}

/**
 * Detect sudden spike in authentication failures
 */
export async function detectAuthFailureSpike(options: {
  windowMinutes?: number;
  spikeThreshold?: number;
}): Promise<AnomalyDetection | null> {
  const { windowMinutes = 15, spikeThreshold = 10 } = options;

  try {
    const supabase = await createAdminClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

    // Get authentication failures in current window
    const { count: failureCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'authentication')
      .eq('action', 'login')
      .eq('metadata->>success', 'false')
      .gte('created_at', windowStart.toISOString());

    // Get MFA failures
    const { count: mfaFailureCount } = await supabase
      .from('mfa_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'mfa_verification_failed')
      .gte('created_at', windowStart.toISOString());

    const totalFailures = (failureCount || 0) + (mfaFailureCount || 0);

    if (totalFailures >= spikeThreshold) {
      const anomaly: AnomalyDetection = {
        id: `auth_failure_spike_${Date.now()}`,
        metricName: 'auth_failures',
        currentValue: totalFailures,
        expectedValue: spikeThreshold,
        threshold: spikeThreshold,
        severity: totalFailures >= 50 ? 'critical' : totalFailures >= 25 ? 'error' : 'warning',
        detectedAt: now,
        metadata: {
          windowMinutes,
          failureCount,
          mfaFailureCount,
          totalFailures,
        },
      };

      // Trigger alert
      await triggerAlert({
        name: 'Authentication Failure Spike',
        type: 'auth_failure_spike',
        severity: anomaly.severity,
        metric: 'auth_failures',
        currentValue: totalFailures,
        threshold: spikeThreshold,
        message: `${totalFailures} authentication failures detected in the last ${windowMinutes} minutes`,
        metadata: anomaly.metadata,
      });

      // Track in Sentry
      Sentry.captureMessage('Authentication failure spike detected', {
        level: anomaly.severity === 'critical' ? 'error' : 'warning',
        tags: {
          anomaly_type: 'auth_failure_spike',
          severity: anomaly.severity,
        },
        extra: anomaly.metadata,
      });

      // Track metric
      Sentry.metrics.increment('anomalies_detected', 1, {
        tags: {
          type: 'auth_failure_spike',
          severity: anomaly.severity,
        },
      });

      return anomaly;
    }

    return null;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { anomaly_detection: 'auth_failure_spike' },
    });
    return null;
  }
}

/**
 * Detect unusual MFA verification failures
 */
export async function detectMfaAnomalies(options: {
  windowMinutes?: number;
  failureThreshold?: number;
}): Promise<AnomalyDetection | null> {
  const { windowMinutes = 15, failureThreshold = 5 } = options;

  try {
    const supabase = await createAdminClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

    // Check for rate limit hits
    const { count: rateLimitHits } = await supabase
      .from('mfa_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'mfa_rate_limit_hit')
      .gte('created_at', windowStart.toISOString());

    // Check for verification blocks
    const { count: blockedVerifications } = await supabase
      .from('mfa_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'mfa_verification_blocked')
      .gte('created_at', windowStart.toISOString());

    const totalIssues = (rateLimitHits || 0) + (blockedVerifications || 0);

    if (totalIssues >= failureThreshold) {
      const anomaly: AnomalyDetection = {
        id: `mfa_anomaly_${Date.now()}`,
        metricName: 'mfa_issues',
        currentValue: totalIssues,
        expectedValue: failureThreshold,
        threshold: failureThreshold,
        severity: totalIssues >= 20 ? 'critical' : totalIssues >= 10 ? 'error' : 'warning',
        detectedAt: now,
        metadata: {
          windowMinutes,
          rateLimitHits,
          blockedVerifications,
          totalIssues,
        },
      };

      // Trigger alert
      await triggerAlert({
        name: 'MFA Verification Issues',
        type: 'mfa_anomaly',
        severity: anomaly.severity,
        metric: 'mfa_issues',
        currentValue: totalIssues,
        threshold: failureThreshold,
        message: `${totalIssues} MFA verification issues detected in the last ${windowMinutes} minutes`,
        metadata: anomaly.metadata,
      });

      // Track in Sentry
      Sentry.captureMessage('MFA anomaly detected', {
        level: anomaly.severity === 'critical' ? 'error' : 'warning',
        tags: {
          anomaly_type: 'mfa_issues',
          severity: anomaly.severity,
        },
        extra: anomaly.metadata,
      });

      // Track metric
      Sentry.metrics.increment('anomalies_detected', 1, {
        tags: {
          type: 'mfa_anomaly',
          severity: anomaly.severity,
        },
      });

      return anomaly;
    }

    return null;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { anomaly_detection: 'mfa_anomaly' },
    });
    return null;
  }
}

/**
 * Detect notification delivery failures
 */
export async function detectNotificationDisconnects(options: {
  windowMinutes?: number;
  failureThresholdPercent?: number;
}): Promise<AnomalyDetection | null> {
  const { windowMinutes = 30, failureThresholdPercent = 25 } = options;

  try {
    const supabase = await createAdminClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

    // Get total notification attempts
    const { count: totalAttempts } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'notification')
      .eq('action', 'delivery_attempt')
      .gte('created_at', windowStart.toISOString());

    // Get failed deliveries
    const { count: failedDeliveries } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'notification')
      .eq('action', 'delivery_failed')
      .gte('created_at', windowStart.toISOString());

    if (totalAttempts && failedDeliveries !== null && totalAttempts > 0) {
      const failurePercent = (failedDeliveries / totalAttempts) * 100;

      if (failurePercent >= failureThresholdPercent) {
        const anomaly: AnomalyDetection = {
          id: `notification_disconnect_${Date.now()}`,
          metricName: 'notification_delivery_failures',
          currentValue: failedDeliveries,
          expectedValue: totalAttempts,
          threshold: failureThresholdPercent,
          severity: failurePercent >= 50 ? 'critical' : failurePercent >= 40 ? 'error' : 'warning',
          detectedAt: now,
          metadata: {
            windowMinutes,
            totalAttempts,
            failedDeliveries,
            failurePercent,
          },
        };

        // Trigger alert
        await triggerAlert({
          name: 'Notification Delivery Failures',
          type: 'notification_disconnect',
          severity: anomaly.severity,
          metric: 'notification_failures',
          currentValue: failedDeliveries,
          threshold: totalAttempts,
          message: `${failurePercent.toFixed(1)}% of notifications failed to deliver in the last ${windowMinutes} minutes`,
          metadata: anomaly.metadata,
        });

        // Track in Sentry
        Sentry.captureMessage('Notification disconnect detected', {
          level: anomaly.severity === 'critical' ? 'error' : 'warning',
          tags: {
            anomaly_type: 'notification_disconnect',
            severity: anomaly.severity,
          },
          extra: anomaly.metadata,
        });

        // Track metric
        Sentry.metrics.increment('anomalies_detected', 1, {
          tags: {
            type: 'notification_disconnect',
            severity: anomaly.severity,
          },
        });

        return anomaly;
      }
    }

    return null;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { anomaly_detection: 'notification_disconnect' },
    });
    return null;
  }
}

/**
 * Detect performance degradation
 */
export async function detectPerformanceDegradation(options: {
  windowMinutes?: number;
  latencyThresholdMs?: number;
}): Promise<AnomalyDetection | null> {
  const { windowMinutes = 15, latencyThresholdMs = 3000 } = options;

  try {
    const supabase = await createAdminClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

    // Get slow API responses
    const { count: slowRequests } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'performance')
      .eq('action', 'api_response')
      .gte('metadata->>durationMs', latencyThresholdMs.toString())
      .gte('created_at', windowStart.toISOString());

    const threshold = 10; // More than 10 slow requests

    if (slowRequests && slowRequests >= threshold) {
      const anomaly: AnomalyDetection = {
        id: `performance_degradation_${Date.now()}`,
        metricName: 'slow_requests',
        currentValue: slowRequests,
        expectedValue: threshold,
        threshold: latencyThresholdMs,
        severity: slowRequests >= 50 ? 'critical' : slowRequests >= 25 ? 'error' : 'warning',
        detectedAt: now,
        metadata: {
          windowMinutes,
          slowRequests,
          latencyThresholdMs,
        },
      };

      // Trigger alert
      await triggerAlert({
        name: 'Performance Degradation',
        type: 'performance_degradation',
        severity: anomaly.severity,
        metric: 'slow_requests',
        currentValue: slowRequests,
        threshold: threshold,
        message: `${slowRequests} slow API requests (>${latencyThresholdMs}ms) detected in the last ${windowMinutes} minutes`,
        metadata: anomaly.metadata,
      });

      // Track in Sentry
      Sentry.captureMessage('Performance degradation detected', {
        level: anomaly.severity === 'critical' ? 'error' : 'warning',
        tags: {
          anomaly_type: 'performance_degradation',
          severity: anomaly.severity,
        },
        extra: anomaly.metadata,
      });

      // Track metric
      Sentry.metrics.increment('anomalies_detected', 1, {
        tags: {
          type: 'performance_degradation',
          severity: anomaly.severity,
        },
      });

      return anomaly;
    }

    return null;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { anomaly_detection: 'performance_degradation' },
    });
    return null;
  }
}

/**
 * Detect signup/conversion funnel drops
 */
export async function detectFunnelDrop(options: {
  windowMinutes?: number;
  dropThresholdPercent?: number;
}): Promise<AnomalyDetection | null> {
  const { windowMinutes = 120, dropThresholdPercent = 40 } = options;

  try {
    const supabase = await createAdminClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
    const previousWindowStart = new Date(
      windowStart.getTime() - windowMinutes * 60 * 1000
    );

    // Get current window signups
    const { count: currentSignups } = await supabase
      .from('onboarding_funnel')
      .select('*', { count: 'exact', head: true })
      .eq('step', 'signup_completed')
      .gte('created_at', windowStart.toISOString());

    // Get previous window signups
    const { count: previousSignups } = await supabase
      .from('onboarding_funnel')
      .select('*', { count: 'exact', head: true })
      .eq('step', 'signup_completed')
      .gte('created_at', previousWindowStart.toISOString())
      .lt('created_at', windowStart.toISOString());

    if (previousSignups && currentSignups !== null && previousSignups > 0) {
      const dropPercent = ((previousSignups - currentSignups) / previousSignups) * 100;

      if (dropPercent >= dropThresholdPercent) {
        const anomaly: AnomalyDetection = {
          id: `funnel_drop_${Date.now()}`,
          metricName: 'signup_conversions',
          currentValue: currentSignups,
          expectedValue: previousSignups,
          threshold: dropThresholdPercent,
          severity: dropPercent >= 60 ? 'critical' : dropPercent >= 50 ? 'error' : 'warning',
          detectedAt: now,
          metadata: {
            dropPercent,
            windowMinutes,
            currentSignups,
            previousSignups,
          },
        };

        // Trigger alert
        await triggerAlert({
          name: 'Signup Funnel Drop',
          type: 'funnel_drop',
          severity: anomaly.severity,
          metric: 'signup_conversions',
          currentValue: currentSignups,
          threshold: previousSignups,
          message: `Signup conversions dropped by ${dropPercent.toFixed(1)}% in the last ${windowMinutes} minutes`,
          metadata: anomaly.metadata,
        });

        // Track in Sentry
        Sentry.captureMessage('Funnel drop detected', {
          level: anomaly.severity === 'critical' ? 'error' : 'warning',
          tags: {
            anomaly_type: 'funnel_drop',
            severity: anomaly.severity,
          },
          extra: anomaly.metadata,
        });

        // Track metric
        Sentry.metrics.increment('anomalies_detected', 1, {
          tags: {
            type: 'funnel_drop',
            severity: anomaly.severity,
          },
        });

        return anomaly;
      }
    }

    return null;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { anomaly_detection: 'funnel_drop' },
    });
    return null;
  }
}

/**
 * Run all anomaly detections
 */
export async function runAnomalyDetection(): Promise<AnomalyDetection[]> {
  const detections = await Promise.allSettled([
    detectEngagementDrop({ windowMinutes: 60, dropThresholdPercent: 30 }),
    detectAuthFailureSpike({ windowMinutes: 15, spikeThreshold: 10 }),
    detectMfaAnomalies({ windowMinutes: 15, failureThreshold: 5 }),
    detectNotificationDisconnects({ windowMinutes: 30, failureThresholdPercent: 25 }),
    detectPerformanceDegradation({ windowMinutes: 15, latencyThresholdMs: 3000 }),
    detectFunnelDrop({ windowMinutes: 120, dropThresholdPercent: 40 }),
  ]);

  const anomalies: AnomalyDetection[] = [];

  for (const result of detections) {
    if (result.status === 'fulfilled' && result.value) {
      anomalies.push(result.value);
    }
  }

  return anomalies;
}
