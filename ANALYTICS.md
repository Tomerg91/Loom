# Analytics & Observability Documentation

## Overview

Loom implements a comprehensive analytics and observability stack to track user behavior, monitor system health, and provide insights for stakeholders. This document describes the complete analytics infrastructure, available metrics, and how to use the dashboards.

## Table of Contents

1. [Architecture](#architecture)
2. [Analytics Platforms](#analytics-platforms)
3. [Event Tracking](#event-tracking)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Dashboards](#dashboards)
6. [Privacy & Compliance](#privacy--compliance)
7. [API Reference](#api-reference)

---

## Architecture

### Components

```
┌─────────────────┐
│   Client App    │
│  (Next.js 15)   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ PostHog  │ (Product Analytics)
    └──────────┘
         │
    ┌────▼─────┐
    │  Sentry  │ (Error Tracking & Performance)
    └──────────┘
         │
    ┌────▼─────┐
    │ Supabase │ (Database Events Storage)
    └──────────┘
```

### Data Flow

1. **Client Events**: PostHog captures user interactions (clicks, page views, conversions)
2. **Server Events**: Supabase stores detailed event logs with full metadata
3. **Error Tracking**: Sentry captures errors, performance issues, and business metrics
4. **Alerting**: Automated anomaly detection triggers alerts via Sentry, Slack, Email

---

## Analytics Platforms

### 1. PostHog (Product Analytics)

**Purpose**: User behavior tracking, product analytics, feature flags, session recording

**Configuration**:
```typescript
// Environment Variables
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**Features**:
- Autocapture (clicks, form submissions)
- Custom event tracking
- Session recording (with PII masking)
- Funnel analysis
- Cohort analysis
- Feature flags & A/B testing

**Usage**:
```typescript
import { posthogEvent } from '@/lib/monitoring/analytics';

posthogEvent('feature_used', {
  feature: 'session_booking',
  userId: user.id,
  metadata: { sessionType: 'coaching' }
});
```

### 2. Sentry (Error & Performance Monitoring)

**Purpose**: Error tracking, performance monitoring, business metrics, alerting

**Configuration**:
```typescript
// Environment Variables
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_DSN=your_sentry_dsn
```

**Features**:
- Error tracking with source maps
- Performance monitoring (traces, transactions)
- Business metrics (custom counters, gauges, distributions)
- Alerting rules
- Issue prioritization
- Release tracking

**Usage**:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.captureException(error, {
  tags: { feature: 'payment' },
  extra: { userId, amount }
});

Sentry.metrics.increment('conversions', 1, {
  tags: { type: 'trial_signup' }
});
```

### 3. Supabase (Database Event Storage)

**Purpose**: Long-term event storage, custom analytics queries, audit trails

**Tables**:
- `events` - All application events
- `onboarding_funnel` - Onboarding step tracking
- `mfa_audit_logs` - MFA security events
- `security_events` - Authentication and authorization events
- `download_logs` - Resource download tracking

**Usage**:
```typescript
import { trackEvent } from '@/lib/monitoring/event-tracking';

await trackEvent(userId, 'session_booked', 'coaching', {
  coachId,
  duration: 60,
  price: 100
});
```

---

## Event Tracking

### Event Categories

#### 1. Marketing & Conversion Events

**Module**: `/src/lib/monitoring/marketing-analytics.ts`

**Events**:
- `landing_page_view` - Landing page visits with UTM parameters
- `lead_capture` - Email signup, demo requests, trial signups
- `signup_step` - Signup funnel progression
- `cta_click` - Call-to-action interactions
- `campaign_conversion` - Marketing campaign conversions
- `experiment_view` - A/B test variant exposures
- `referral` - User referrals
- `newsletter_signup` - Newsletter subscriptions

**Example**:
```typescript
import { trackCampaignConversion } from '@/lib/monitoring/marketing-analytics';

trackCampaignConversion({
  userId: user.id,
  conversionType: 'trial',
  conversionValue: 0,
  source: 'google',
  medium: 'cpc',
  campaign: 'summer_trial',
  experimentId: 'pricing_test_v2',
  variantId: 'variant_b'
});
```

#### 2. Onboarding Events

**Module**: `/src/lib/monitoring/onboarding-analytics.ts`

**Events**:
- `onboarding_step_started` - User enters onboarding step
- `onboarding_step_completed` - User completes step
- `onboarding_completed` - Full onboarding flow completed
- `onboarding_abandoned` - User abandons onboarding
- `feature_discovered` - User discovers feature during onboarding
- `first_action` - Activation milestones (first session, task, etc.)
- `onboarding_hint_interaction` - Tooltip/hint interactions
- `onboarding_personalization` - User preferences selected
- `onboarding_reengagement` - User returns to incomplete onboarding

**Example**:
```typescript
import { trackOnboardingStepCompleted } from '@/lib/monitoring/onboarding-analytics';

trackOnboardingStepCompleted({
  userId: user.id,
  step: 'profile_setup',
  stepNumber: 2,
  totalSteps: 5,
  timeSpentSeconds: 45,
  interactionCount: 12
});
```

#### 3. Resource Engagement Events

**Module**: `/src/lib/monitoring/resource-analytics.ts`

**Events**:
- `resource_viewed` - Resource view with duration and scroll depth
- `resource_downloaded` - Resource downloads
- `resource_shared` - Resource sharing
- `resource_created` - Resource uploads
- `resource_search` - Resource search queries
- `resource_recommendation` - Recommendation interactions
- `resource_engagement_score` - Engagement score updates
- `resource_rating` - Resource ratings/feedback
- `resource_deleted` - Resource deletions

**Example**:
```typescript
import { trackResourceViewed } from '@/lib/monitoring/resource-analytics';

trackResourceViewed({
  userId: user.id,
  resourceId: resource.id,
  resourceType: 'pdf',
  resourceName: resource.title,
  viewDurationSeconds: 120,
  scrollDepthPercent: 75,
  isFirstView: true
});
```

#### 4. Notification Events

**Module**: `/src/lib/monitoring/notification-analytics.ts`

**Events**:
- `notification_delivered` - Notification delivery success
- `notification_displayed` - Notification shown to user
- `notification_clicked` - User clicks notification
- `notification_dismissed` - User dismisses notification
- `push_permission_request` - Push permission requested
- `notification_preferences_update` - Preference changes
- `notification_opt_out` - User opts out of notifications
- `notification_engagement_rate` - Engagement metrics
- `notification_action_click` - Action button clicks
- `notification_delivery_failure` - Delivery failures
- `notification_batch_operation` - Bulk notification actions

**Example**:
```typescript
import { trackNotificationClicked } from '@/lib/monitoring/notification-analytics';

trackNotificationClicked({
  userId: user.id,
  notificationId: notification.id,
  notificationType: 'session_reminder',
  channel: 'push',
  clickAction: 'view_session',
  clickDestination: '/sessions/123',
  timeSinceDeliverySeconds: 15
});
```

#### 5. Realtime Connection Events

**Module**: `/src/lib/monitoring/realtime-connection-monitor.ts`

**Events**:
- `connection_attempt` - Connection attempt started
- `connection_established` - Connection established successfully
- `connection_disconnected` - Connection closed
- `connection_error` - Connection error occurred
- `fallback_polling_activated` - Fallback to polling mode
- `connection_latency` - Latency measurement
- `realtime_message` - Message received over connection
- `connection_health_check` - Health check performed
- `connection_upgrade` - Connection type upgrade

**Example**:
```typescript
import { RealtimeConnectionMonitor } from '@/lib/monitoring/realtime-connection-monitor';

const monitor = new RealtimeConnectionMonitor('conn_123', 'websocket', user.id);
monitor.startConnection();
monitor.connectionEstablished();
monitor.messageReceived('notification_update', 1024);
monitor.recordLatency(45);
```

---

## Monitoring & Alerting

### Anomaly Detection

**Module**: `/src/lib/monitoring/anomaly-detection.ts`

**Detections**:
1. **Engagement Drop** - Sudden decrease in user activity
2. **Auth Failure Spike** - Increase in authentication failures
3. **MFA Anomalies** - Unusual MFA verification patterns
4. **Notification Disconnects** - High notification delivery failure rate
5. **Performance Degradation** - Increase in slow API requests
6. **Funnel Drop** - Decrease in signup conversions

**Configuration**:
```typescript
// Engagement drop detection
detectEngagementDrop({
  windowMinutes: 60,
  dropThresholdPercent: 30
});

// Auth failure spike detection
detectAuthFailureSpike({
  windowMinutes: 15,
  spikeThreshold: 10
});
```

**Running All Detections**:
```typescript
import { runAnomalyDetection } from '@/lib/monitoring/anomaly-detection';

// Run all anomaly detections
const anomalies = await runAnomalyDetection();

// Returns array of detected anomalies
anomalies.forEach(anomaly => {
  console.log(`Anomaly detected: ${anomaly.metricName}`);
  console.log(`Severity: ${anomaly.severity}`);
  console.log(`Current: ${anomaly.currentValue}, Expected: ${anomaly.expectedValue}`);
});
```

### Alert Channels

**Configured Channels**:
1. **Sentry** - Automatic error and performance alerts
2. **Email** - Alert notifications via webhook
3. **Slack** - Webhook integration for team alerts
4. **Custom Webhooks** - Extensible alert delivery

**Alert Configuration**:
```typescript
// Environment Variables
ALERT_EMAIL_WEBHOOK=https://your-email-service.com/webhook
ALERT_EMAIL_RECIPIENTS=alerts@yourcompany.com,ops@yourcompany.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_WEBHOOK_URL=https://your-alerting-service.com/webhook
```

---

## Dashboards

### Admin Analytics Dashboard

**Endpoint**: `/api/analytics/dashboard`

**Access**: Admin role required

**Metrics Provided**:

1. **Summary Metrics**:
   - Total/active/new users
   - Session metrics (total, completed, completion rate)
   - Goal metrics (total, active, completed)
   - Engagement metrics (avg engagement score, task completion rate)
   - Coach metrics (active coaches, productivity scores)

2. **Funnel Metrics**:
   - Signup flow completion rates
   - Onboarding step progression
   - Abandonment rates

3. **Coach Productivity**:
   - Sessions completed
   - Tasks managed
   - Resources created
   - Clients managed

4. **Client Engagement**:
   - Active clients
   - Task completion rates
   - Resource views
   - Engagement scores

5. **Goal Completion**:
   - Goals created/active/completed
   - Completion rates
   - Time to completion

6. **Service Uptime**:
   - Realtime notifications
   - MFA flows
   - Payment callbacks
   - Database
   - Authentication

**Usage**:
```bash
GET /api/analytics/dashboard

Authorization: Bearer <admin_token>

Response:
{
  "summary": {
    "totalUsers": 1250,
    "activeUsers": 450,
    "newUsers": 25,
    "totalSessions": 3200,
    "completedSessions": 2800,
    "sessionCompletionRate": 87.5
  },
  "funnelMetrics": [...],
  "coachProductivity": [...],
  "clientEngagement": [...],
  "goalCompletion": [...],
  "serviceUptime": [...]
}
```

### Business Metrics Dashboard

**Endpoint**: `/api/monitoring/business-metrics`

**Metrics**:

1. **User Engagement**:
   - Active users (DAU, WAU, MAU)
   - New users
   - Session duration
   - Retention rate

2. **Session Metrics**:
   - Bookings
   - Completions
   - Cancellations
   - Average ratings

3. **File Metrics**:
   - Uploads
   - Downloads
   - Shares
   - Storage usage

4. **Authentication Metrics**:
   - Login attempts
   - Success rate
   - MFA adoption rate

5. **Performance Metrics**:
   - Page load time
   - API response time
   - Error rates
   - Uptime
   - Core Web Vitals (LCP, FID, CLS)

**Rate Limiting**: 100 requests/minute

### MFA Health Dashboard

Tracks MFA adoption, verification success rates, and security issues.

### Notification Analytics Dashboard

Monitors notification delivery, engagement, and user preferences.

---

## Privacy & Compliance

### Data Retention Policies

**Module**: `/src/lib/monitoring/data-retention.ts`

**Retention Periods**:
- **Analytics Events**: 90 days
- **Audit Logs**: 1 year
- **Security Events**: 2 years
- **Performance Metrics**: 30 days

**Automated Cleanup**:
```typescript
import { cleanupOldAnalyticsData } from '@/lib/monitoring/data-retention';

// Run cleanup (typically via cron job)
await cleanupOldAnalyticsData();
```

### PII Handling

**Masked Data**:
- All password inputs are masked in session recordings
- Email addresses are hashed in PostHog
- Credit card numbers are never logged
- Elements with `data-private` attribute are masked

**Example**:
```html
<!-- This field will be masked in recordings -->
<input type="password" data-private />
<div data-private>{user.email}</div>
```

### GDPR Compliance

**User Rights**:
1. **Right to Access**: Export user's analytics data
2. **Right to Erasure**: Delete user's analytics data
3. **Right to Object**: Opt-out of analytics tracking
4. **Right to Portability**: Export data in JSON format

**Implementation** (in progress):
```typescript
// Export user analytics data
GET /api/analytics/export?userId={userId}

// Delete user analytics data
DELETE /api/analytics/user/{userId}

// Opt-out of tracking
POST /api/analytics/opt-out
```

### Cookie Consent

PostHog respects the `doNotTrack` browser setting and can be configured to require explicit consent.

---

## API Reference

### Core Analytics Functions

#### `trackEvent(event: AnalyticsEvent)`

Track a unified analytics event to all configured platforms.

```typescript
import { trackEvent } from '@/lib/monitoring/analytics';

trackEvent({
  action: 'feature_used',
  category: 'engagement',
  label: 'session_booking',
  value: 1,
  userId: user.id,
  properties: {
    feature: 'booking',
    metadata: {...}
  }
});
```

#### `posthogEvent(name: string, properties?: Record<string, unknown>)`

Send event directly to PostHog.

```typescript
import { posthogEvent } from '@/lib/monitoring/analytics';

posthogEvent('trial_started', {
  userId: user.id,
  plan: 'premium',
  duration: 14
});
```

#### `trackWebVitals(metric: WebVitalsMetric)`

Track Core Web Vitals.

```typescript
import { trackWebVitals } from '@/lib/monitoring/analytics';

trackWebVitals({
  name: 'LCP',
  value: 2500,
  rating: 'good',
  delta: 100
});
```

### Marketing Analytics

See `/src/lib/monitoring/marketing-analytics.ts` for complete API.

Key functions:
- `trackLandingPageView()`
- `trackLeadCapture()`
- `trackSignupStep()`
- `trackCTAClick()`
- `trackCampaignConversion()`
- `trackExperimentView()`

### Onboarding Analytics

See `/src/lib/monitoring/onboarding-analytics.ts` for complete API.

Key functions:
- `trackOnboardingStepStarted()`
- `trackOnboardingStepCompleted()`
- `trackOnboardingFlowCompleted()`
- `trackOnboardingFlowAbandoned()`
- `trackFirstAction()`

### Resource Analytics

See `/src/lib/monitoring/resource-analytics.ts` for complete API.

Key functions:
- `trackResourceViewed()`
- `trackResourceDownloaded()`
- `trackResourceShared()`
- `trackResourceCreated()`
- `trackResourceSearch()`

### Notification Analytics

See `/src/lib/monitoring/notification-analytics.ts` for complete API.

Key functions:
- `trackNotificationDelivered()`
- `trackNotificationClicked()`
- `trackNotificationDismissed()`
- `trackPushPermissionRequest()`
- `trackNotificationPreferencesUpdate()`

---

## Environment Variables Reference

### Required

```bash
# Sentry (Error & Performance Monitoring)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_DSN=https://...@sentry.io/...

# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Optional

```bash
# PostHog (Product Analytics)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Google Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-...

# Alerting
ALERT_EMAIL_WEBHOOK=https://...
ALERT_EMAIL_RECIPIENTS=alerts@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ALERT_WEBHOOK_URL=https://...

# MFA
MFA_ENCRYPTION_KEY=...
MFA_SIGNING_KEY=...
MFA_ISSUER_NAME=Loom
```

---

## Best Practices

### 1. Event Naming

Use descriptive, consistent event names:
- **Good**: `session_booking_completed`
- **Bad**: `booking_done`

### 2. Metadata

Include relevant context in event metadata:
```typescript
posthogEvent('session_booked', {
  userId: user.id,
  sessionType: 'coaching',
  duration: 60,
  price: 100,
  coachId: coach.id,
  timestamp: new Date().toISOString()
});
```

### 3. User Identification

Always identify users when possible for better cohort analysis:
```typescript
if (user) {
  posthogIdentify(user.id, {
    email: user.email,
    role: user.role,
    signupDate: user.createdAt
  });
}
```

### 4. Privacy

Never track PII in event properties without explicit consent:
- Hash emails
- Mask sensitive data
- Use `data-private` attribute
- Respect DNT headers

### 5. Performance

Batch events when possible to reduce overhead:
```typescript
import { trackBatchEvents } from '@/lib/monitoring/event-tracking';

await trackBatchEvents([
  { userId, action: 'event1', ... },
  { userId, action: 'event2', ... },
  { userId, action: 'event3', ... }
]);
```

---

## Support

For questions or issues with analytics:
- **Documentation**: This file
- **Code**: `/src/lib/monitoring/`
- **Dashboard**: Admin analytics dashboard
- **Alerts**: Check Sentry and Slack channels

---

## Changelog

### 2025-11-14
- ✅ Implemented PostHog integration
- ✅ Added marketing conversion tracking
- ✅ Enhanced onboarding analytics
- ✅ Created resource engagement tracking
- ✅ Implemented notification analytics
- ✅ Added realtime connection monitoring
- ✅ Created anomaly detection system
- ✅ Enhanced MFA telemetry
- ✅ Added data retention policies
- ✅ Implemented privacy compliance checks
