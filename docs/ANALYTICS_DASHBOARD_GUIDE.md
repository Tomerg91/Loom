# Analytics Dashboard Guide for Stakeholders

## Overview

This guide explains how to access and interpret the Loom analytics dashboards. These dashboards provide real-time insights into user behavior, system performance, and business metrics.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Dashboard Access](#dashboard-access)
3. [Key Metrics Explained](#key-metrics-explained)
4. [Dashboard Walkthrough](#dashboard-walkthrough)
5. [Common Queries](#common-queries)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Non-Technical Stakeholders

1. **Access the Dashboard**: Navigate to `/admin/analytics` (requires admin permissions)
2. **View Summary**: The top section shows key metrics at a glance
3. **Select Time Range**: Use the date picker to filter data by time period
4. **Export Data**: Click "Export CSV" to download data for external analysis

### For Technical Teams

1. **API Access**: Use `/api/analytics/dashboard` endpoint
2. **Custom Queries**: Query Supabase `events` table directly
3. **Sentry Metrics**: View detailed metrics at sentry.io
4. **PostHog**: Access product analytics at posthog.com

---

## Dashboard Access

### Web Dashboard

**URL**: `https://app.loom.com/admin/analytics`

**Requirements**:
- Admin role
- Valid authentication token
- HTTPS connection

**Rate Limits**: 60 requests per minute

### API Access

```bash
# Get dashboard data
curl -X GET https://app.loom.com/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Get business metrics
curl -X GET https://app.loom.com/api/monitoring/business-metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Sentry Dashboard

**URL**: `https://sentry.io/organizations/loom/`

**Access**: Request invite from engineering team

**What you'll see**:
- Error rates and trends
- Performance monitoring
- Business metrics
- Alert history

### PostHog Dashboard

**URL**: `https://app.posthog.com/`

**Access**: Request invite from product team

**What you'll see**:
- User funnels
- Session recordings
- Feature usage
- Cohort analysis
- A/B test results

---

## Key Metrics Explained

### 1. User Metrics

#### Active Users

**Definition**: Users who performed at least one action in the selected time period

**Segments**:
- **DAU (Daily Active Users)**: Active in last 24 hours
- **WAU (Weekly Active Users)**: Active in last 7 days
- **MAU (Monthly Active Users)**: Active in last 30 days

**Healthy Range**:
- DAU/MAU ratio: 20-30% (good), >40% (excellent)
- WAU/MAU ratio: 50-70% (good), >80% (excellent)

**What to watch**:
- 📉 **Declining DAU**: May indicate engagement issues
- 📈 **Growing MAU**: Good for top-line growth
- ⚠️ **High MAU, Low DAU**: Users aren't coming back frequently

#### New Users

**Definition**: Users who signed up in the selected time period

**Healthy Range**: Steady week-over-week growth of 5-15%

**What to watch**:
- 📉 **Sudden drop**: Check marketing campaigns, website issues
- 📈 **Sudden spike**: Verify data quality, check for bot signups
- 📊 **Consistent decline**: May need to improve marketing or product

#### Retention Rate

**Definition**: Percentage of users who return after their first session

**Calculation**: (Users active in both periods) / (Users in first period) × 100

**Healthy Range**:
- Day 1: 40-50%
- Day 7: 20-30%
- Day 30: 10-15%

**What to watch**:
- 📉 **Poor Day 1 retention**: Onboarding issues
- 📉 **Poor Week 1 retention**: Feature adoption problems
- 📉 **Poor Month 1 retention**: Value proposition mismatch

### 2. Engagement Metrics

#### Session Completion Rate

**Definition**: Percentage of sessions that are marked as completed

**Calculation**: (Completed sessions / Total sessions) × 100

**Healthy Range**: 85-95%

**What to watch**:
- 📉 **Below 80%**: Quality issues with coaches or platform
- 📈 **Above 95%**: Good, but verify data accuracy

#### Task Completion Rate

**Definition**: Percentage of tasks completed on time

**Calculation**: (Completed tasks / Total tasks) × 100

**Healthy Range**: 70-85%

**What to watch**:
- 📉 **Below 60%**: Tasks may be too challenging or unclear
- 📈 **Above 90%**: Tasks may be too easy

#### Average Engagement Score

**Definition**: Composite score of user activity (sessions, tasks, resources, messages)

**Range**: 0-100

**Healthy Range**: 60-80

**What to watch**:
- 📉 **Below 50**: Low engagement, risk of churn
- 📈 **Above 80**: Highly engaged users, potential for upsell

### 3. Conversion Metrics

#### Signup Conversion Rate

**Definition**: Percentage of visitors who complete signup

**Calculation**: (Signups / Visitors) × 100

**Healthy Range**: 2-5% for website traffic

**What to watch**:
- 📉 **Below 1%**: Signup flow issues, targeting problems
- 📈 **Above 5%**: Good traffic quality, effective messaging

#### Onboarding Completion Rate

**Definition**: Percentage of users who complete full onboarding flow

**Calculation**: (Completed onboarding / Started onboarding) × 100

**Healthy Range**: 60-80%

**What to watch**:
- 📉 **Below 50%**: Onboarding is too long or complex
- 📈 **Above 80%**: Onboarding is effective

#### Trial to Paid Conversion

**Definition**: Percentage of trial users who convert to paid plans

**Calculation**: (Paid conversions / Trial starts) × 100

**Healthy Range**: 20-40%

**What to watch**:
- 📉 **Below 15%**: Value proposition issues
- 📈 **Above 40%**: Strong product-market fit

### 4. Performance Metrics

#### Page Load Time

**Definition**: Time from navigation start to page interactive

**Target**: <3 seconds (mobile), <2 seconds (desktop)

**What to watch**:
- ⚠️ **Above 5s**: Critical performance issue
- 📈 **Increasing trend**: Need optimization

#### API Response Time

**Definition**: Average time for API requests to complete

**Target**: <500ms for p50, <2s for p95

**What to watch**:
- ⚠️ **Above 1s p50**: Performance degradation
- 📈 **Increasing p95**: Infrastructure scaling needed

#### Error Rate

**Definition**: Percentage of requests that result in errors

**Target**: <0.1%

**What to watch**:
- ⚠️ **Above 0.5%**: Service degradation
- 📈 **Sudden spike**: Incident in progress

#### Uptime

**Definition**: Percentage of time services are available

**Target**: 99.9% (SLA)

**What to watch**:
- ⚠️ **Below 99.5%**: Service reliability issues
- 📉 **Trending down**: Infrastructure problems

---

## Dashboard Walkthrough

### Summary Section

**Location**: Top of dashboard

**Displays**:
```
┌──────────────────────────────────────────────────┐
│  Total Users: 1,250    Active Users: 450         │
│  New Users: 25         Sessions: 3,200           │
│  Completion Rate: 87.5%   Avg Rating: 4.7/5     │
└──────────────────────────────────────────────────┘
```

**How to interpret**:
- **Trend indicators**: ↑ (up from last period), ↓ (down), → (stable)
- **Color coding**: Green (good), Yellow (warning), Red (critical)
- **Percentage changes**: Compared to previous equivalent period

### Funnel Visualization

**Location**: Funnel Metrics section

**Shows**:
```
Landing Page → Signup → Onboarding → First Action → Active User

1000 → 40 → 30 → 24 → 20
100%   4%   75%   80%   83%
```

**How to interpret**:
- **Drop-off points**: Large percentage drops indicate friction
- **Benchmarks**: Compare to industry standards
- **Trends**: Track funnel improvements over time

**Common issues**:
- **Large drop at signup**: Form too complex, not compelling enough
- **Large drop at onboarding**: Too long, not engaging
- **Large drop at first action**: Feature discovery problems

### Coach Productivity

**Location**: Coach Productivity section

**Metrics**:
- Sessions completed per coach
- Tasks managed per coach
- Resources created per coach
- Clients per coach
- Average productivity score

**How to interpret**:
- **High performers**: Learn from top coaches
- **Low performers**: May need training or support
- **Distribution**: Should follow normal curve

### Client Engagement

**Location**: Client Engagement section

**Metrics**:
- Active clients
- Task completion rates
- Resource views
- Engagement scores
- Retention by cohort

**How to interpret**:
- **High engagement**: Successful coaching relationships
- **Low engagement**: At-risk clients, may need intervention
- **Engagement trends**: Should increase over time

### Service Health

**Location**: Service Uptime section

**Displays**:
```
Service               Status    Uptime     Last Check
─────────────────────────────────────────────────────
Realtime Notifications  ✓      99.98%     2 min ago
MFA Flows               ✓      99.95%     2 min ago
Payment Callbacks       ✓      99.99%     5 min ago
Database                ✓      100%       1 min ago
Authentication          ✓      99.97%     3 min ago
```

**How to interpret**:
- ✓ **Green**: Healthy (uptime > 99.5%)
- ⚠️ **Yellow**: Degraded (uptime 98-99.5%)
- ✗ **Red**: Critical (uptime < 98%)

---

## Common Queries

### "Why are signups down this week?"

**Steps to investigate**:
1. Check **Funnel Metrics** → Signup conversion rate
2. Compare to marketing campaign calendar
3. Look for error spikes in **Service Health**
4. Check **Page Load Time** for performance issues
5. Review A/B test variants if running experiments

**Possible causes**:
- Marketing campaign ended
- Signup page broken
- Performance degradation
- Seasonal variation

### "Is user engagement improving?"

**Metrics to review**:
1. **DAU/MAU ratio** trend (higher is better)
2. **Session completion rate** trend (should be stable/increasing)
3. **Task completion rate** trend
4. **Average engagement score** trend
5. **Retention cohorts** (newer cohorts should perform better)

**Good signs**:
- Increasing DAU/MAU ratio
- Stable or improving completion rates
- Newer cohorts have better retention

### "Are our coaches productive?"

**Metrics to review**:
1. **Coach Productivity** → Sessions per coach
2. **Client Engagement** → Client satisfaction scores
3. **Session completion rate** by coach
4. **Resource creation** by coach

**Benchmarks**:
- 10-20 sessions/month per coach (good)
- 4.5+ average rating (excellent)
- 85%+ completion rate (good)

### "Is the platform stable?"

**Metrics to review**:
1. **Service Health** → All services uptime
2. **Error Rate** → Should be <0.1%
3. **API Response Time** → p95 should be <2s
4. **Page Load Time** → Should be <3s

**Alert triggers**:
- Any service below 99% uptime
- Error rate above 0.5%
- Response times doubling
- Multiple alerts in short period

---

## Troubleshooting

### Dashboard Not Loading

**Possible causes**:
1. Session expired → Re-authenticate
2. Permission denied → Check admin role
3. Rate limited → Wait 1 minute
4. Server error → Check Sentry for incidents

**Solution**:
```bash
# Check API health
curl -I https://app.loom.com/api/health

# Clear cookies and re-login
# Contact support if issue persists
```

### Data Looks Wrong

**Possible causes**:
1. Wrong time range selected
2. Data still processing (wait 5-10 minutes)
3. Bug in analytics code
4. Data quality issue

**Solution**:
1. Verify time range selection
2. Refresh page
3. Compare with Sentry/PostHog data
4. Report to engineering team if mismatch

### Missing Metrics

**Possible causes**:
1. Feature not instrumented yet
2. No data in selected time range
3. Permission restrictions
4. Database query timeout

**Solution**:
1. Check ANALYTICS.md for available metrics
2. Expand time range
3. Request access from admin
4. Contact engineering team

---

## Best Practices

### 1. Regular Reviews

- **Daily**: Service health, error rates, critical alerts
- **Weekly**: User growth, engagement trends, funnel performance
- **Monthly**: Retention cohorts, feature adoption, business metrics
- **Quarterly**: Long-term trends, goal achievement, strategic metrics

### 2. Context Matters

Always consider:
- **Seasonality**: Holidays, weekends, summer/winter patterns
- **Marketing**: Active campaigns, promotions, partnerships
- **Product changes**: New features, UX changes, onboarding updates
- **External events**: Competitor launches, industry news, economic factors

### 3. Look for Patterns

- **Day of week**: Usage often varies by day
- **Time of day**: Peak hours vs. off-peak
- **User segments**: Coaches vs. clients, free vs. paid
- **Cohorts**: Newer users behave differently

### 4. Act on Insights

- **Set up alerts**: Don't rely on manual checks
- **Document hypotheses**: Before making changes
- **Track experiments**: Use proper A/B testing
- **Measure impact**: Compare before/after metrics

---

## Additional Resources

- **Full Documentation**: See `ANALYTICS.md`
- **API Reference**: `/api/analytics/*` endpoints
- **Sentry**: https://sentry.io/organizations/loom/
- **PostHog**: https://app.posthog.com/
- **Support**: Contact analytics@loom.com

---

## Glossary

- **Cohort**: Group of users who signed up in the same time period
- **Conversion**: User completing a desired action (signup, purchase, etc.)
- **Funnel**: Series of steps users take to complete a goal
- **Retention**: Users returning after their initial visit
- **Churn**: Users who stop using the product
- **DAU/MAU**: Daily Active Users / Monthly Active Users
- **LTV**: Lifetime Value (total revenue from a customer)
- **CAC**: Customer Acquisition Cost (cost to acquire one customer)
- **MRR**: Monthly Recurring Revenue
- **ARR**: Annual Recurring Revenue

---

Last Updated: 2025-11-14
