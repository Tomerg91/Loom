/**
 * Uptime Monitoring System
 * Monitors critical services for 99.5% uptime target
 */

import type {
  UptimeMonitorConfig,
  UptimeCheckResult,
  ServiceUptimeMetrics,
} from '@/types/analytics';

// =====================================================================
// UPTIME MONITOR CONFIGURATION
// =====================================================================

/**
 * Critical services to monitor for 99.5% uptime target
 */
export const CRITICAL_SERVICES: UptimeMonitorConfig[] = [
  {
    serviceName: 'realtime_notifications',
    endpoint: '/api/health/realtime',
    method: 'GET',
    expectedStatusCode: 200,
    timeout: 5000, // 5 seconds
    checkInterval: 5, // Check every 5 minutes
    alertThreshold: 3, // Alert after 3 consecutive failures
    enabled: true,
  },
  {
    serviceName: 'mfa_flows',
    endpoint: '/api/health/mfa',
    method: 'GET',
    expectedStatusCode: 200,
    timeout: 5000,
    checkInterval: 5,
    alertThreshold: 2, // MFA is critical, alert faster
    enabled: true,
  },
  {
    serviceName: 'payment_callbacks',
    endpoint: '/api/health/payments',
    method: 'GET',
    expectedStatusCode: 200,
    timeout: 10000, // Payment systems may be slower
    checkInterval: 5,
    alertThreshold: 2,
    enabled: true,
  },
  {
    serviceName: 'database',
    endpoint: '/api/health/database',
    method: 'GET',
    expectedStatusCode: 200,
    timeout: 5000,
    checkInterval: 2, // Check database more frequently
    alertThreshold: 2,
    enabled: true,
  },
  {
    serviceName: 'authentication',
    endpoint: '/api/health/auth',
    method: 'GET',
    expectedStatusCode: 200,
    timeout: 5000,
    checkInterval: 5,
    alertThreshold: 2,
    enabled: true,
  },
];

/**
 * Uptime target (99.5%)
 */
export const UPTIME_TARGET = 99.5;

/**
 * Minimum uptime percentage that triggers alerting
 */
export const UPTIME_ALERT_THRESHOLD = 99.0;

// =====================================================================
// UPTIME CHECK FUNCTIONS
// =====================================================================

/**
 * Perform uptime check for a service
 */
export async function checkServiceUptime(
  config: UptimeMonitorConfig
): Promise<UptimeCheckResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    const response = await fetch(config.endpoint, {
      method: config.method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Loom-Uptime-Monitor/1.0',
        'X-Monitor-Check': 'true',
      },
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const isUp = response.status === config.expectedStatusCode;

    return {
      serviceName: config.serviceName,
      timestamp: new Date().toISOString(),
      isUp,
      responseTime,
      statusCode: response.status,
      error: isUp ? undefined : `Unexpected status code: ${response.status}`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      serviceName: config.serviceName,
      timestamp: new Date().toISOString(),
      isUp: false,
      responseTime,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during health check',
    };
  }
}

/**
 * Check all critical services
 */
export async function checkAllServices(): Promise<UptimeCheckResult[]> {
  const enabledServices = CRITICAL_SERVICES.filter((s) => s.enabled);

  const results = await Promise.all(
    enabledServices.map((config) => checkServiceUptime(config))
  );

  return results;
}

/**
 * Calculate uptime percentage from check results
 */
export function calculateUptimePercentage(
  totalChecks: number,
  failedChecks: number
): number {
  if (totalChecks === 0) return 100;

  const successfulChecks = totalChecks - failedChecks;
  return (successfulChecks / totalChecks) * 100;
}

/**
 * Get service uptime metrics from stored check results
 * This would typically query a database or time-series store
 */
export async function getServiceUptimeMetrics(
  serviceName: string,
  startDate: Date,
  endDate: Date
): Promise<ServiceUptimeMetrics> {
  // TODO: In production, this would query actual stored uptime check results
  // For now, returning mock data structure

  return {
    serviceName,
    uptime: 99.7, // Percentage
    avgResponseTime: 250, // milliseconds
    totalChecks: 1000,
    failedChecks: 3,
    lastCheckTime: new Date().toISOString(),
    lastDowntime: undefined,
  };
}

/**
 * Check if uptime meets target
 */
export function meetsUptimeTarget(uptime: number): boolean {
  return uptime >= UPTIME_TARGET;
}

/**
 * Check if uptime requires alerting
 */
export function requiresUptimeAlert(uptime: number): boolean {
  return uptime < UPTIME_ALERT_THRESHOLD;
}

// =====================================================================
// ALERTING INTEGRATION
// =====================================================================

/**
 * Send uptime alert using existing alert manager
 */
export async function sendUptimeAlert(
  serviceName: string,
  uptime: number,
  details?: string
): Promise<void> {
  try {
    // Use existing alerting system
    const { AlertManager } = await import('./alerting');

    const alert = {
      type: 'system_health' as const,
      message: `Service ${serviceName} uptime (${uptime.toFixed(2)}%) below target (${UPTIME_TARGET}%)`,
      severity: uptime < UPTIME_TARGET - 1 ? ('critical' as const) : ('high' as const),
      metadata: {
        serviceName,
        currentUptime: uptime,
        targetUptime: UPTIME_TARGET,
        details,
      },
    };

    await AlertManager.sendAlert(alert);
  } catch (error) {
    console.error('Failed to send uptime alert:', error);
  }
}

/**
 * Store uptime check result
 * In production, this would store to a time-series database or monitoring service
 */
export async function storeUptimeCheck(result: UptimeCheckResult): Promise<void> {
  try {
    // TODO: Store to database or monitoring service
    // For now, just log to console
    if (!result.isUp) {
      console.warn('Service down:', {
        service: result.serviceName,
        timestamp: result.timestamp,
        error: result.error,
        responseTime: result.responseTime,
      });

      // Send to Sentry for critical services
      if (typeof window === 'undefined') {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureMessage(`Service ${result.serviceName} is down`, {
          level: 'error',
          extra: result,
        });
      }
    }
  } catch (error) {
    console.error('Failed to store uptime check:', error);
  }
}

// =====================================================================
// MONITORING SCHEDULER
// =====================================================================

/**
 * Schedule uptime checks for all services
 * This should be called from a cron job or background worker
 */
export async function scheduleUptimeChecks(): Promise<void> {
  console.log('Running scheduled uptime checks...');

  const results = await checkAllServices();

  // Store results
  await Promise.all(results.map((result) => storeUptimeCheck(result)));

  // Check for services that are down
  const downServices = results.filter((r) => !r.isUp);

  if (downServices.length > 0) {
    console.error('Services down:', downServices);

    // Alert for each down service
    for (const service of downServices) {
      await sendUptimeAlert(
        service.serviceName,
        0, // 0% uptime for current check
        service.error
      );
    }
  }

  console.log('Uptime checks completed:', {
    total: results.length,
    up: results.filter((r) => r.isUp).length,
    down: downServices.length,
  });
}
