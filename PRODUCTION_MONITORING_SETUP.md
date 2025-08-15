# Production Monitoring & Observability Setup

This document provides comprehensive guidance for setting up and maintaining production monitoring for the Loom coaching application.

## 🎯 Overview

The Loom app now includes a complete production-ready monitoring and observability stack:

- **Error Tracking**: Comprehensive Sentry integration with business context
- **Performance Monitoring**: Core Web Vitals and custom performance metrics
- **Business Intelligence**: User engagement, session, and file metrics
- **Health Monitoring**: Multi-layer system health checks
- **Alerting System**: Configurable thresholds with multiple notification channels
- **Real-time Dashboard**: Admin observability interface

## 🚀 Quick Start

### 1. Environment Configuration

Set up the following environment variables for production:

```bash
# Required - Sentry Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Optional - Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID

# Optional - Alerting Channels
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
ALERT_EMAIL_WEBHOOK=https://your-email-service.com/webhook
ALERT_EMAIL_RECIPIENTS=admin@yourcompany.com,alerts@yourcompany.com

# Deployment Info (automatically set by Vercel)
VERCEL_ENV=production
VERCEL_REGION=auto
VERCEL_GIT_COMMIT_SHA=auto
VERCEL_DEPLOYMENT_ID=auto
```

### 2. Test Monitoring Systems

Run the comprehensive test suite:

```bash
# Test locally
npm run dev
node scripts/test-monitoring-systems.js

# Test production deployment
TEST_BASE_URL=https://your-app.vercel.app node scripts/test-monitoring-systems.js
```

### 3. Access Monitoring Dashboard

Navigate to `/admin` in your application to access the real-time monitoring dashboard.

## 📊 Monitoring Components

### Error Tracking (Sentry)

**Files:**
- `sentry.client.config.js` - Client-side error tracking
- `sentry.server.config.js` - Server-side error tracking  
- `src/lib/monitoring/sentry.ts` - Enhanced monitoring utilities
- `src/components/monitoring/production-error-boundary.tsx` - Error boundaries

**Features:**
- Production error filtering and enrichment
- Business context attachment
- User session tracking
- Performance transaction monitoring
- Custom error classes with automatic reporting

**Configuration:**
```javascript
// Enhanced error context
captureError(error, {
  feature: 'sessions',
  component: 'booking-form',
  userId: 'user-123',
  sessionId: 'session-456',
});

// Business metric tracking
trackBusinessMetric('session_completion_rate', 85.5, {
  timeframe: '24h',
  user_segment: 'premium',
});
```

### Performance Monitoring

**Files:**
- `src/lib/performance/web-vitals-monitor.ts` - Core Web Vitals tracking
- `src/app/api/monitoring/performance/route.ts` - Performance API

**Metrics Tracked:**
- **Core Web Vitals**: LCP, FID/INP, CLS, TTFB, FCP
- **Custom Metrics**: Route changes, API response times, resource loading
- **Thresholds**: Google-recommended performance budgets

**Integration:**
```javascript
// Automatic tracking for all pages
import { webVitalsMonitor } from '@/lib/performance/web-vitals-monitor';

// Manual performance tracking
const { measurePerformance } = webVitalsMonitor;
await measurePerformance('database_query', async () => {
  return await complexDatabaseOperation();
});
```

### Business Metrics

**Files:**
- `src/app/api/monitoring/business-metrics/route.ts` - Business metrics API

**Metrics Collected:**
- **User Engagement**: Active users, session duration, retention rates
- **Session Analytics**: Booking rates, completion rates, ratings
- **File Activity**: Uploads, downloads, storage usage
- **Authentication**: Login attempts, MFA adoption

**API Usage:**
```bash
# Get current business metrics
GET /api/monitoring/business-metrics

# Submit custom metrics
POST /api/monitoring/business-metrics
{
  "metrics": [
    {
      "name": "custom_conversion_rate",
      "value": 12.5,
      "tags": { "source": "landing_page" }
    }
  ]
}
```

### Health Monitoring

**Files:**
- `src/app/api/health/route.ts` - Comprehensive health checks

**Health Checks:**
- **Database**: Connectivity, latency, pool stats
- **External Services**: Sentry, Analytics, third-party APIs
- **System Resources**: Memory, CPU, load averages
- **Environment**: Required/optional configuration
- **Cache**: In-memory or external cache health

**Usage:**
```bash
# Basic health check
curl https://your-app.com/api/health

# Response format
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "abc123",
  "environment": "production",
  "checks": {
    "database": { "status": "healthy", "latency": "45ms" },
    "external_services": { "status": "healthy" },
    "system": { "status": "healthy", "memory": {...} },
    "environment": { "status": "healthy" },
    "cache": { "status": "healthy" }
  },
  "performance": {
    "responseTime": "123ms",
    "uptime": "5d 12h 30m 45s"
  }
}
```

### Alerting System

**Files:**
- `src/lib/monitoring/alerting.ts` - Alert management and notifications

**Alert Types:**
- **Performance Degradation**: Slow LCP, high INP, poor CLS
- **Error Rate Spikes**: Increased error percentages
- **System Health**: Memory/CPU thresholds, database latency
- **Business Metrics**: Low retention, high cancellation rates

**Notification Channels:**
- **Sentry**: Error-level alerts automatically captured
- **Slack**: Webhook notifications with rich formatting
- **Email**: SMTP or webhook-based email alerts
- **Webhooks**: Custom integrations

**Configuration:**
```javascript
// Check performance metrics against thresholds
performanceAlerts.lcp(3500); // Triggers warning if LCP > 2.5s, critical if > 4s

// Check business metrics
businessAlerts.sessionCancellationRate(35); // Alert if > 30%

// Custom alert thresholds
alertManager.checkMetric('custom_metric', value, metadata);
```

### Monitoring Dashboard

**Files:**
- `src/components/admin/monitoring-dashboard.tsx` - Real-time dashboard

**Dashboard Features:**
- **Overview Tab**: System health summary, quick metrics
- **Performance Tab**: Core Web Vitals, custom metrics, performance score
- **Business Tab**: User engagement, session analytics, file metrics
- **System Tab**: Detailed health checks, resource usage

**Access:**
Navigate to `/admin` (requires admin authentication)

## 🔧 Production Setup

### 1. Sentry Configuration

1. Create a Sentry account and project
2. Copy your DSN from Project Settings
3. Set environment variables:
   ```bash
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```
4. Configure release tracking in Vercel:
   ```bash
   # Automatically set by Vercel
   VERCEL_GIT_COMMIT_SHA=auto
   ```

### 2. Performance Budget Setup

Configure performance budgets in your CI/CD:

```json
{
  "budgets": [
    {
      "path": "/**",
      "timings": [
        { "metric": "LCP", "budget": 2500 },
        { "metric": "FID", "budget": 100 },
        { "metric": "CLS", "budget": 0.1 }
      ]
    }
  ]
}
```

### 3. External Monitoring Setup

Set up external health check monitoring:

**Uptime Robot / Pingdom:**
- Monitor: `https://your-app.com/api/health`
- Frequency: Every 1-5 minutes
- Alert on: HTTP status != 200 or response time > 5s

**Vercel Analytics:**
- Enable Web Vitals monitoring in Vercel dashboard
- Set up Core Web Vitals alerts

### 4. Log Aggregation

For production log analysis:

**Vercel:**
- Logs automatically collected in Vercel dashboard
- Set up log drains for external services

**External Services:**
- DataDog, LogRocket, or similar for log aggregation
- Configure structured logging format

## 📈 Alerting Configuration

### Critical Alerts (Immediate Response)

```javascript
// Performance - immediate user impact
LCP > 4000ms
INP > 500ms
CLS > 0.25
API response time > 2000ms

// System - service degradation  
Memory usage > 90%
Database latency > 1000ms
Error rate > 5%
Health check failures

// Business - revenue impact
Session cancellation rate > 30%
User retention drop > 50%
```

### Warning Alerts (Monitor Closely)

```javascript
// Performance - needs improvement
LCP > 2500ms
INP > 200ms
CLS > 0.1
API response time > 1000ms

// System - resource pressure
Memory usage > 75%
Database latency > 500ms
Error rate > 2%

// Business - trends to watch
Session cancellation rate > 20%
User retention drop > 25%
MFA adoption < 50%
```

## 🧪 Testing & Validation

### Automated Testing

```bash
# Run the monitoring test suite
npm run test:monitoring

# Test specific environments
TEST_BASE_URL=https://staging.yourapp.com npm run test:monitoring
TEST_BASE_URL=https://production.yourapp.com npm run test:monitoring
```

### Manual Testing

1. **Error Tracking**: Trigger test errors and verify Sentry capture
2. **Performance**: Test page loads and verify metrics collection
3. **Health Checks**: Verify all health endpoints respond correctly
4. **Alerts**: Test alert thresholds with synthetic data
5. **Dashboard**: Ensure real-time data updates correctly

### Load Testing

```bash
# Test health endpoint under load
for i in {1..50}; do
  curl -s https://your-app.com/api/health &
done
wait
```

## 📋 Production Checklist

### Pre-Deployment

- [ ] Sentry DSN configured and tested
- [ ] Environment variables set in production
- [ ] Alert channels configured (Slack/Email)
- [ ] Performance budgets defined
- [ ] Health check endpoints responding
- [ ] Monitoring test suite passing

### Post-Deployment

- [ ] Error tracking working in production
- [ ] Performance metrics collecting
- [ ] Business metrics updating
- [ ] Health checks reporting correctly
- [ ] Alerts triggering appropriately
- [ ] Dashboard accessible and updating

### Ongoing Maintenance

- [ ] Review alerts weekly for threshold adjustments
- [ ] Monitor error trends and fix recurring issues
- [ ] Update performance budgets as app evolves
- [ ] Add new business metrics as features launch
- [ ] Regular monitoring system health checks

## 🚨 Incident Response

### Error Rate Spike

1. Check Sentry for error patterns
2. Review performance metrics for correlation
3. Check system health for resource issues
4. Investigate recent deployments
5. Scale resources if needed

### Performance Degradation

1. Check Core Web Vitals dashboard
2. Identify affected pages/features
3. Review recent code changes
4. Check external service dependencies
5. Optimize or rollback as needed

### System Health Issues

1. Check detailed health endpoint
2. Review system resource usage
3. Verify database connectivity
4. Check external service status
5. Scale infrastructure if needed

## 🔗 Useful Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Vercel Analytics](https://vercel.com/analytics)
- [Core Web Vitals Thresholds](https://web.dev/defining-core-web-vitals-thresholds/)

## 📞 Support

For monitoring system issues:

1. Check the monitoring test results: `monitoring-test-report.json`
2. Review Sentry error reports
3. Check health endpoint status
4. Contact the development team with specific error IDs

---

**Last Updated**: January 15, 2024  
**Version**: 1.0.0  
**Environment**: Production Ready ✅"
}]