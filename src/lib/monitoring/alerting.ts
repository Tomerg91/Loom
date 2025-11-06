import { captureError, captureMessage, trackBusinessMetric } from './sentry';
import { logger } from '@/lib/logger';

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

// Alert types
export type AlertType = 
  | 'performance_degradation'
  | 'error_rate_spike'
  | 'system_health'
  | 'business_metric'
  | 'security_incident'
  | 'dependency_failure';

// Alert configuration
export interface AlertConfig {
  type: AlertType;
  severity: AlertSeverity;
  threshold: number;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  timeWindow: number; // in minutes
  enabled: boolean;
  description: string;
}

// Alert instance
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  environment: string;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

// Alert notification channels
export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sentry';
  config: Record<string, unknown>;
  enabled: boolean;
}

// Production alert configurations
export const ALERT_CONFIGS: AlertConfig[] = [
  // Performance Alerts
  {
    type: 'performance_degradation',
    severity: 'critical',
    threshold: 4000,
    metric: 'lcp',
    operator: 'gt',
    timeWindow: 5,
    enabled: true,
    description: 'Largest Contentful Paint exceeds 4 seconds',
  },
  {
    type: 'performance_degradation',
    severity: 'warning',
    threshold: 2500,
    metric: 'lcp',
    operator: 'gt',
    timeWindow: 15,
    enabled: true,
    description: 'Largest Contentful Paint needs improvement',
  },
  {
    type: 'performance_degradation',
    severity: 'critical',
    threshold: 500,
    metric: 'inp',
    operator: 'gt',
    timeWindow: 5,
    enabled: true,
    description: 'Interaction to Next Paint is critically slow',
  },
  {
    type: 'performance_degradation',
    severity: 'critical',
    threshold: 0.25,
    metric: 'cls',
    operator: 'gt',
    timeWindow: 10,
    enabled: true,
    description: 'Cumulative Layout Shift causing poor UX',
  },
  {
    type: 'performance_degradation',
    severity: 'warning',
    threshold: 2000,
    metric: 'api_response_time',
    operator: 'gt',
    timeWindow: 10,
    enabled: true,
    description: 'API response times are slow',
  },
  
  // Error Rate Alerts
  {
    type: 'error_rate_spike',
    severity: 'critical',
    threshold: 5,
    metric: 'error_rate_percentage',
    operator: 'gt',
    timeWindow: 5,
    enabled: true,
    description: 'Error rate spike detected',
  },
  {
    type: 'error_rate_spike',
    severity: 'warning',
    threshold: 2,
    metric: 'error_rate_percentage',
    operator: 'gt',
    timeWindow: 15,
    enabled: true,
    description: 'Elevated error rate',
  },
  
  // System Health Alerts
  {
    type: 'system_health',
    severity: 'critical',
    threshold: 90,
    metric: 'memory_usage_percentage',
    operator: 'gt',
    timeWindow: 5,
    enabled: true,
    description: 'Critical memory usage',
  },
  {
    type: 'system_health',
    severity: 'warning',
    threshold: 75,
    metric: 'memory_usage_percentage',
    operator: 'gt',
    timeWindow: 10,
    enabled: true,
    description: 'High memory usage',
  },
  {
    type: 'system_health',
    severity: 'critical',
    threshold: 95,
    metric: 'uptime_percentage',
    operator: 'lt',
    timeWindow: 15,
    enabled: true,
    description: 'Service availability below threshold',
  },
  {
    type: 'dependency_failure',
    severity: 'critical',
    threshold: 1000,
    metric: 'database_latency',
    operator: 'gt',
    timeWindow: 5,
    enabled: true,
    description: 'Database latency critically high',
  },
  
  // Business Metric Alerts
  {
    type: 'business_metric',
    severity: 'warning',
    threshold: 30,
    metric: 'session_cancellation_rate',
    operator: 'gt',
    timeWindow: 30,
    enabled: true,
    description: 'High session cancellation rate',
  },
  {
    type: 'business_metric',
    severity: 'warning',
    threshold: 50,
    metric: 'user_retention_rate',
    operator: 'lt',
    timeWindow: 60,
    enabled: true,
    description: 'Low user retention rate',
  },
];

// Alert manager class
export class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private notificationChannels: NotificationChannel[] = [];
  
  constructor() {
    this.initializeNotificationChannels();
  }
  
  private initializeNotificationChannels() {
    // Sentry notifications
    if (process.env.SENTRY_DSN) {
      this.notificationChannels.push({
        type: 'sentry',
        config: { dsn: process.env.SENTRY_DSN },
        enabled: true,
      });
    }
    
    // Email notifications (if configured)
    if (process.env.ALERT_EMAIL_WEBHOOK) {
      this.notificationChannels.push({
        type: 'email',
        config: { webhook: process.env.ALERT_EMAIL_WEBHOOK },
        enabled: true,
      });
    }
    
    // Slack notifications (if configured)
    if (process.env.SLACK_WEBHOOK_URL) {
      this.notificationChannels.push({
        type: 'slack',
        config: { webhookUrl: process.env.SLACK_WEBHOOK_URL },
        enabled: true,
      });
    }
    
    // Custom webhook notifications
    if (process.env.ALERT_WEBHOOK_URL) {
      this.notificationChannels.push({
        type: 'webhook',
        config: { url: process.env.ALERT_WEBHOOK_URL },
        enabled: true,
      });
    }
  }
  
  // Check metric against alert configurations
  public checkMetric(metricName: string, value: number, metadata?: Record<string, unknown>) {
    const relevantConfigs = ALERT_CONFIGS.filter(config => 
      config.metric === metricName && config.enabled
    );
    
    for (const config of relevantConfigs) {
      if (this.shouldTriggerAlert(config, value)) {
        const alert = this.createAlert(config, value, metadata);
        this.triggerAlert(alert);
      }
    }
  }
  
  private shouldTriggerAlert(config: AlertConfig, value: number): boolean {
    switch (config.operator) {
      case 'gt': return value > config.threshold;
      case 'gte': return value >= config.threshold;
      case 'lt': return value < config.threshold;
      case 'lte': return value <= config.threshold;
      case 'eq': return value === config.threshold;
      default: return false;
    }
  }
  
  private createAlert(config: AlertConfig, value: number, metadata?: Record<string, unknown>): Alert {
    const alertId = `${config.type}_${config.metric}_${Date.now()}`;
    
    return {
      id: alertId,
      type: config.type,
      severity: config.severity,
      title: this.generateAlertTitle(config),
      message: this.generateAlertMessage(config, value),
      metric: config.metric,
      value,
      threshold: config.threshold,
      timestamp: new Date(),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      resolved: false,
      metadata,
    };
  }
  
  private generateAlertTitle(config: AlertConfig): string {
    const severityEmoji = {
      info: '📋',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };
    
    return `${severityEmoji[config.severity]} ${config.description}`;
  }
  
  private generateAlertMessage(config: AlertConfig, value: number): string {
    const formatted = this.formatValue(config.metric, value);
    const thresholdFormatted = this.formatValue(config.metric, config.threshold);
    
    return `Metric "${config.metric}" is ${formatted}, which ${config.operator} threshold of ${thresholdFormatted}. This indicates: ${config.description}`;
  }
  
  private formatValue(metric: string, value: number): string {
    if (metric.includes('percentage') || metric.includes('rate')) {
      return `${value.toFixed(1)}%`;
    }
    if (metric.includes('time') || metric.includes('latency')) {
      return `${value.toFixed(0)}ms`;
    }
    if (metric.includes('memory') || metric.includes('size')) {
      return `${value.toFixed(0)}MB`;
    }
    return value.toString();
  }
  
  // Trigger alert and send notifications
  private async triggerAlert(alert: Alert) {
    // Store alert
    this.alerts.set(alert.id, alert);
    
    // Log alert
    logger.warn(`🚨 Alert triggered: ${alert.title}`, {
      id: alert.id,
      severity: alert.severity,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      environment: alert.environment,
    });
    
    // Track alert as business metric
    trackBusinessMetric('alert_triggered', 1, {
      alert_type: alert.type,
      severity: alert.severity,
      metric: alert.metric,
      environment: alert.environment,
    });
    
    // Send notifications
    await this.sendNotifications(alert);
    
    // For critical alerts, also capture in Sentry
    if (alert.severity === 'critical' || alert.severity === 'error') {
      captureError(new Error(alert.message), {
        alert_id: alert.id,
        alert_type: alert.type,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        ...alert.metadata,
      });
    } else {
      captureMessage(alert.message, alert.severity as any);
    }
  }
  
  // Send notifications to configured channels
  private async sendNotifications(alert: Alert) {
    const notifications = this.notificationChannels
      .filter(channel => channel.enabled)
      .map(channel => this.sendNotification(channel, alert));
    
    await Promise.allSettled(notifications);
  }
  
  private async sendNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    try {
      switch (channel.type) {
        case 'sentry':
          // Already handled in triggerAlert
          break;
          
        case 'email':
          await this.sendEmailNotification(channel.config, alert);
          break;
          
        case 'slack':
          await this.sendSlackNotification(channel.config, alert);
          break;
          
        case 'webhook':
          await this.sendWebhookNotification(channel.config, alert);
          break;
      }
    } catch (error) {
      logger.error(`Failed to send ${channel.type} notification:`, error);
    }
  }
  
  private async sendEmailNotification(config: Record<string, unknown>, alert: Alert) {
    if (!config.webhook) return;
    
    const payload = {
      to: process.env.ALERT_EMAIL_RECIPIENTS || 'admin@example.com',
      subject: `[${alert.environment.toUpperCase()}] ${alert.title}`,
      body: this.generateEmailBody(alert),
      priority: alert.severity === 'critical' ? 'high' : 'normal',
    };
    
    await fetch(config.webhook as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  
  private async sendSlackNotification(config: Record<string, unknown>, alert: Alert) {
    if (!config.webhookUrl) return;
    
    const color = {
      info: '#36a64f',
      warning: '#ff9500',
      error: '#ff0000',
      critical: '#990000',
    };
    
    const payload = {
      text: `Alert: ${alert.title}`,
      attachments: [{
        color: color[alert.severity],
        fields: [
          { title: 'Environment', value: alert.environment, short: true },
          { title: 'Metric', value: alert.metric, short: true },
          { title: 'Value', value: this.formatValue(alert.metric, alert.value), short: true },
          { title: 'Threshold', value: this.formatValue(alert.metric, alert.threshold), short: true },
          { title: 'Time', value: alert.timestamp.toISOString(), short: false },
        ],
        footer: 'Loom App Monitoring',
        ts: Math.floor(alert.timestamp.getTime() / 1000),
      }],
    };
    
    await fetch(config.webhookUrl as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  
  private async sendWebhookNotification(config: Record<string, unknown>, alert: Alert) {
    if (!config.url) return;
    
    await fetch(config.url as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert,
        timestamp: new Date().toISOString(),
        source: 'loom-app-monitoring',
      }),
    });
  }
  
  private generateEmailBody(alert: Alert): string {
    return `
Alert Details:
- Environment: ${alert.environment}
- Severity: ${alert.severity.toUpperCase()}
- Type: ${alert.type}
- Metric: ${alert.metric}
- Current Value: ${this.formatValue(alert.metric, alert.value)}
- Threshold: ${this.formatValue(alert.metric, alert.threshold)}
- Time: ${alert.timestamp.toISOString()}

Description: ${alert.message}

${alert.metadata ? `Additional Context:\n${JSON.stringify(alert.metadata, null, 2)}` : ''}

---
Loom App Monitoring System
    `.trim();
  }
  
  // Resolve alert
  public resolveAlert(alertId: string, reason?: string) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.alerts.set(alertId, alert);
      
      captureMessage(`Alert resolved: ${alert.title}`, 'info');
      
      trackBusinessMetric('alert_resolved', 1, {
        alert_type: alert.type,
        severity: alert.severity,
        metric: alert.metric,
        environment: alert.environment,
        resolution_reason: reason || 'manual',
      });
    }
  }
  
  // Get active alerts
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }
  
  // Get alert history
  public getAlertHistory(hours: number = 24): Alert[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.alerts.values())
      .filter(alert => alert.timestamp >= cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}

// Global alert manager instance
export const alertManager = new AlertManager();

// Convenience functions for common alert checks
export const checkPerformanceMetric = (metric: string, value: number, metadata?: Record<string, unknown>) => {
  alertManager.checkMetric(metric, value, metadata);
};

export const checkErrorRate = (errorRate: number, metadata?: Record<string, unknown>) => {
  alertManager.checkMetric('error_rate_percentage', errorRate, metadata);
};

export const checkSystemHealth = (metric: string, value: number, metadata?: Record<string, unknown>) => {
  alertManager.checkMetric(metric, value, metadata);
};

export const checkBusinessMetric = (metric: string, value: number, metadata?: Record<string, unknown>) => {
  alertManager.checkMetric(metric, value, metadata);
};

// Alert configuration for specific metrics
export const performanceAlerts = {
  lcp: (value: number) => checkPerformanceMetric('lcp', value),
  fid: (value: number) => checkPerformanceMetric('fid', value),
  inp: (value: number) => checkPerformanceMetric('inp', value),
  cls: (value: number) => checkPerformanceMetric('cls', value),
  ttfb: (value: number) => checkPerformanceMetric('ttfb', value),
  apiResponseTime: (value: number) => checkPerformanceMetric('api_response_time', value),
};

export const systemAlerts = {
  memoryUsage: (percentage: number) => checkSystemHealth('memory_usage_percentage', percentage),
  databaseLatency: (ms: number) => checkSystemHealth('database_latency', ms),
  uptime: (percentage: number) => checkSystemHealth('uptime_percentage', percentage),
};

export const businessAlerts = {
  sessionCancellationRate: (rate: number) => checkBusinessMetric('session_cancellation_rate', rate),
  userRetentionRate: (rate: number) => checkBusinessMetric('user_retention_rate', rate),
  errorRate: (rate: number) => checkErrorRate(rate),
};