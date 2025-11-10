# Issue #151: Monitor and Validate Database Performance Optimizations

## Overview

This document describes the implementation of comprehensive performance monitoring and validation for the database optimization work completed in Sprint 06.

### Performance Targets (Issue #151)

The following optimization targets were established:

| Query | Baseline | Target | Target Improvement |
|-------|----------|--------|-------------------|
| Dashboard Queries | 100ms | 5-10ms | 10-20x faster |
| Coach Clients List | 300ms | 15ms | 20x faster |
| User Statistics | 250ms | 10ms | 25x faster |

## Implementation Components

### 1. Database Migration (`20251110000000_issue_151_performance_validation.sql`)

Adds the following to the database:

#### Tables
- `query_performance_metrics` - Stores historical query performance data for trending and analysis

#### Functions
- `validate_dashboard_performance()` - Validates dashboard query performance against targets
- `validate_coach_clients_performance()` - Validates coach clients list performance
- `validate_user_stats_performance()` - Validates user statistics query performance
- `get_performance_validation_report()` - Comprehensive report combining all validations
- `get_optimization_indexes_usage()` - Shows index usage statistics for optimization verification

### 2. Query Performance Monitoring Utility (`src/lib/performance/query-monitoring.ts`)

TypeScript utility class for tracking and analyzing query performance:

```typescript
// Track a query execution
await queryMonitor.trackQueryExecution(
  'Dashboard Sessions',
  async () => {
    const result = await supabase.from('sessions').select(...);
    return result.data;
  }
);

// Get performance report
const report = await queryMonitor.getPerformanceValidationReport();

// Get metric summary with percentiles
const summary = await queryMonitor.getMetricSummary('Dashboard Sessions');

// Get slow queries
const slowQueries = await queryMonitor.getSlowQueries(100, 20);
```

### 3. Performance Validation API (`/api/admin/performance-validation`)

RESTful API for querying and managing performance metrics:

#### GET `/api/admin/performance-validation`

Returns comprehensive validation report for all optimizations.

**Query Parameters:**
- `category` - Filter by category: 'dashboard', 'coach-clients', 'user-stats', or 'all' (default)
- `includeIndexUsage` - Include index usage statistics (default: true)
- `includeMetricsSummary` - Include historical metric summaries (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "validation_status": "PASS|WARN|FAIL",
    "timestamp": "2025-11-10T00:00:00Z",
    "metrics": [
      {
        "category": "Dashboard",
        "metric_name": "Dashboard Sessions",
        "current_avg_ms": 8.5,
        "target_ms": 10,
        "status": "OPTIMAL",
        "within_target": true,
        "total_queries": 1250
      }
    ],
    "summary": {
      "total_metrics": 9,
      "optimal_count": 6,
      "good_count": 2,
      "fair_count": 1,
      "needs_optimization": 0,
      "within_target_count": 8,
      "within_target_percentage": 89
    }
  }
}
```

#### POST `/api/admin/performance-validation`

Flush pending metrics and generate a fresh validation report.

```bash
curl -X POST https://api.loom.dev/api/admin/performance-validation \
  -H "Authorization: Bearer <token>"
```

#### DELETE `/api/admin/performance-validation`

Clear old performance metrics to maintain database size.

**Query Parameters:**
- `daysOld` - Remove metrics older than this many days (default: 7)

```bash
curl -X DELETE "https://api.loom.dev/api/admin/performance-validation?daysOld=30" \
  -H "Authorization: Bearer <token>"
```

## Instrumented Queries

The following critical queries are now instrumented with performance monitoring:

### 1. Coach Client Sessions (`/api/coach/clients`)
- Query Type: `Coach Client Sessions`
- Purpose: Fetch all sessions for clients of a coach
- Target Performance: < 15ms
- Indexes Used: `idx_sessions_coach_client_active`, `idx_sessions_client_list`

### 2. Coach Statistics Sessions (`/api/coach/stats`)
- Query Type: `Coach Statistics Sessions`
- Purpose: Fetch session statistics for coach dashboard
- Target Performance: < 10ms
- Indexes Used: `idx_sessions_coach_status_scheduled`, `idx_sessions_completed_recent`

## Usage Examples

### 1. Check Overall Performance Status

```bash
curl https://api.loom.dev/api/admin/performance-validation \
  -H "Authorization: Bearer <token>"
```

### 2. Check Dashboard Performance Only

```bash
curl "https://api.loom.dev/api/admin/performance-validation?category=dashboard" \
  -H "Authorization: Bearer <token>"
```

### 3. Get Detailed Metrics Summary

```typescript
import { queryMonitor } from '@/lib/performance/query-monitoring';

// Get summary with percentiles
const summary = await queryMonitor.getMetricSummary('Coach Client Sessions');
console.log(`
  Average: ${summary.avg_execution_time}ms
  P95: ${summary.p95_execution_time}ms
  P99: ${summary.p99_execution_time}ms
  Cache Hit Rate: ${summary.cache_hit_rate}%
`);
```

### 4. Generate Full Validation Report

```typescript
import { queryMonitor } from '@/lib/performance/query-monitoring';

const report = await queryMonitor.generateValidationReport();
console.log(`Performance Status: ${report.status}`);
console.log(`Pass Percentage: ${report.summary.pass_percentage}%`);
```

### 5. Identify Slow Queries

```typescript
import { queryMonitor } from '@/lib/performance/query-monitoring';

// Get queries slower than 50ms
const slowQueries = await queryMonitor.getSlowQueries(50, 10);
slowQueries.forEach(query => {
  console.log(`${query.query_type}: ${query.mean_exec_time_ms}ms`);
});
```

## Validation Criteria

A query is considered to meet performance targets if:

### Dashboard Queries
- Status: OPTIMAL if avg < 10ms
- Status: GOOD if avg < 20ms
- Status: FAIR if avg < 30ms
- Status: NEEDS_OPTIMIZATION if avg ≥ 30ms

### Coach Clients List
- Status: OPTIMAL if avg < 15ms
- Status: GOOD if avg < 50ms
- Status: FAIR if avg < 150ms
- Status: NEEDS_OPTIMIZATION if avg ≥ 150ms

### User Statistics
- Status: OPTIMAL if avg < 10ms
- Status: GOOD if avg < 50ms
- Status: FAIR if avg < 100ms
- Status: NEEDS_OPTIMIZATION if avg ≥ 100ms

## Optimization Index Verification

The performance validation system checks that optimization indexes are being utilized:

```bash
curl "https://api.loom.dev/api/admin/performance-validation?includeIndexUsage=true" \
  -H "Authorization: Bearer <token>"
```

This returns index usage statistics for all optimization indexes created in Sprint 06:

```json
{
  "index_usage": [
    {
      "index_name": "idx_sessions_coach_status_scheduled",
      "table_name": "sessions",
      "scans_count": 2450,
      "tuples_read": 3500,
      "tuples_fetched": 2450,
      "cache_efficiency": 1.43,
      "status": "Highly Efficient"
    }
  ]
}
```

## Monitoring Best Practices

### 1. Regular Validation
- Run validation checks daily in production
- Monitor the API response trends
- Set up alerts for status changes from PASS to WARN/FAIL

### 2. Post-Deployment Validation
After deploying changes:

```bash
# Flush metrics and get fresh report
curl -X POST https://api.loom.dev/api/admin/performance-validation \
  -H "Authorization: Bearer <token>"
```

### 3. Database Maintenance
Clean up old metrics periodically to prevent database bloat:

```bash
# Remove metrics older than 30 days
curl -X DELETE "https://api.loom.dev/api/admin/performance-validation?daysOld=30" \
  -H "Authorization: Bearer <token>"
```

### 4. Alerting Integration
Integrate with Sentry or other monitoring tools:

```typescript
import { queryMonitor } from '@/lib/performance/query-monitoring';
import * as Sentry from '@sentry/nextjs';

const report = await queryMonitor.generateValidationReport();
if (report.status !== 'PASS') {
  Sentry.captureMessage(
    `Performance validation: ${report.status}`,
    report.status === 'FAIL' ? 'error' : 'warning'
  );
}
```

## Troubleshooting

### Issue: No Performance Data
**Cause:** Queries haven't been executed yet
**Solution:** Execute the monitored queries first, wait for metrics to flush (30s default)

### Issue: Performance Degradation After Deployment
**Steps:**
1. Check if indexes are still being used: `validate_optimization_indexes_usage()`
2. Review recent query execution plans: `EXPLAIN ANALYZE`
3. Clear cache and flush metrics: `POST /api/admin/performance-validation`
4. Monitor for 5-10 minutes before conclusions

### Issue: High Memory Usage in query_performance_metrics Table
**Solution:** Clean up old metrics more frequently:

```bash
curl -X DELETE "https://api.loom.dev/api/admin/performance-validation?daysOld=3" \
  -H "Authorization: Bearer <token>"
```

## Related Issues and PRs

- Issue #146: Run database migrations in staging environment
- Issue #151: Monitor and validate database performance optimizations
- Sprint 06: 20+ composite indexes + 4 SQL functions implementation

## Summary

The performance validation system provides comprehensive monitoring of database optimization effectiveness. It tracks query execution times, validates against targets, and provides actionable insights for maintaining and improving database performance.

### Key Metrics Tracked
- Query execution time (avg, min, max, p95, p99)
- Cache hit rates
- Index usage and efficiency
- Slow query identification

### Validation Status Levels
- **PASS** (≥80% metrics within target): Optimizations are working well
- **WARN** (50-79% metrics within target): Some queries need attention
- **FAIL** (<50% metrics within target): Significant optimization issues

## Contact

For questions or issues related to performance monitoring, please refer to Issue #151 or contact the DevOps team.
