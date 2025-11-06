# Staging Migration Guide - Sprint 7

**Issue:** #146 - Run database migrations in staging environment
**Created:** November 6, 2025
**Priority:** P0 - Critical

## Overview

This guide provides step-by-step instructions for applying all pending database migrations to the staging environment, including the new performance optimization indexes that will achieve 10x-25x query performance improvements.

## Prerequisites

- [ ] Access to Supabase staging project
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Staging database credentials (from Supabase dashboard)
- [ ] Database backup completed before migration

## New Migrations to Apply

### 1. Performance Optimization Indexes (20251106000002)

**File:** `supabase/migrations/20251106000002_performance_optimization_indexes.sql`

**What it does:**
- Adds 30+ composite indexes for optimal query performance
- Targets dashboard queries, coach clients list, and user statistics
- Includes verification function `get_index_usage_stats()`

**Expected improvements:**
- Dashboard queries: 100ms → 5-10ms (10-20x faster)
- Coach clients list: 300ms → 15ms (20x faster)
- User statistics: 250ms → 10ms (25x faster)

## Migration Steps

### Step 1: Install Supabase CLI

```bash
# Install globally
npm install -g supabase

# Verify installation
supabase --version
```

### Step 2: Link to Staging Project

```bash
# Navigate to project root
cd /path/to/Loom

# Link to your staging project
supabase link --project-ref YOUR_STAGING_PROJECT_REF

# You'll be prompted for your access token
# Get it from: https://supabase.com/dashboard/account/tokens
```

### Step 3: Check Migration Status

```bash
# See which migrations have been applied
supabase db diff --use-migra --linked

# List all pending migrations
ls -la supabase/migrations/*.sql | tail -5
```

### Step 4: Apply Migrations

```bash
# Apply all pending migrations to staging
supabase db push --linked

# Or apply specific migration
supabase db push --linked --include-all
```

### Step 5: Verify Migrations

```bash
# Connect to staging database
supabase db remote commit --linked

# Or use psql directly
psql "postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"
```

## Verification Queries

After applying migrations, run these queries to verify everything is working:

### 1. Check New Indexes Exist

```sql
-- List all new indexes (should show 30+)
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    AND indexname NOT IN (
        SELECT indexname
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
    )
ORDER BY tablename, indexname;
```

### 2. Verify Index Usage

```sql
-- Use the new verification function
SELECT * FROM get_index_usage_stats()
ORDER BY idx_scan DESC
LIMIT 20;
```

### 3. Check RLS Policies

```sql
-- Verify RLS is enabled on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 4. Test Database Connection

```sql
-- Simple health check
SELECT
    current_database(),
    current_user,
    version(),
    pg_database_size(current_database()) as db_size_bytes;
```

### 5. Check Performance Statistics

```sql
-- Enable pg_stat_statements if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Get current performance metrics
SELECT * FROM get_performance_metrics();
```

## Performance Testing

### Before Migration Baseline

Run these queries and record execution times:

```sql
-- Dashboard query (typical coach dashboard load)
EXPLAIN ANALYZE
SELECT
    s.id,
    s.title,
    s.scheduled_at,
    s.status,
    u.first_name,
    u.last_name
FROM sessions s
JOIN users u ON s.client_id = u.id
WHERE s.coach_id = 'SAMPLE_COACH_UUID'
    AND s.status IN ('scheduled', 'in_progress')
ORDER BY s.scheduled_at DESC
LIMIT 10;

-- Coach clients list query
EXPLAIN ANALYZE
SELECT DISTINCT
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    COUNT(s.id) as session_count
FROM users u
JOIN sessions s ON s.client_id = u.id
WHERE s.coach_id = 'SAMPLE_COACH_UUID'
GROUP BY u.id, u.first_name, u.last_name, u.email
ORDER BY MAX(s.created_at) DESC;

-- User statistics query
EXPLAIN ANALYZE
SELECT
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
    AVG(duration_minutes) as avg_duration
FROM sessions
WHERE coach_id = 'SAMPLE_COACH_UUID'
    AND scheduled_at > NOW() - INTERVAL '30 days';
```

### After Migration Verification

Run the same queries again and compare execution times. Expected improvements:
- Dashboard query: Should use `idx_sessions_coach_status_scheduled`
- Clients list: Should use `idx_sessions_client_list`
- Statistics: Should use composite indexes

Look for `Index Scan` instead of `Seq Scan` in EXPLAIN ANALYZE output.

## Update Statistics

After applying migrations, update PostgreSQL statistics:

```sql
-- Analyze all tables to update statistics
ANALYZE;

-- Or analyze specific tables
ANALYZE sessions;
ANALYZE users;
ANALYZE file_uploads;
ANALYZE notifications;
ANALYZE messages;
```

## Rollback Plan

If issues occur, you can rollback the migration:

```bash
# Rollback last migration
supabase db reset --linked

# Or manually drop indexes
psql "postgresql://..." -c "DROP INDEX IF EXISTS idx_sessions_coach_status_scheduled CASCADE;"
```

**Note:** Document any issues in GitHub Issue #146

## Post-Migration Checklist

- [ ] All migrations applied successfully
- [ ] No PostgreSQL errors in logs
- [ ] New indexes visible in `pg_indexes`
- [ ] `get_index_usage_stats()` function available
- [ ] RLS policies still active
- [ ] Dashboard loads without errors
- [ ] Query execution times improved (verify with EXPLAIN ANALYZE)
- [ ] No breaking changes to application
- [ ] Monitoring shows improved performance

## Monitoring After Migration

### 1. Query Performance

Monitor these metrics for 24-48 hours:
- Average dashboard load time
- P95 query execution time
- Database CPU usage
- Connection pool stats

### 2. Index Usage

Check index usage after 24 hours:

```sql
SELECT * FROM get_index_usage_stats()
WHERE idx_scan = 0;  -- Unused indexes
```

### 3. Application Logs

Watch for:
- RLS policy errors
- Slow query warnings
- Connection timeout errors

## Troubleshooting

### Migration Fails

```bash
# Check PostgreSQL logs
supabase db logs --linked

# Verify migration file syntax
cat supabase/migrations/20251106000002_performance_optimization_indexes.sql

# Try applying manually
supabase db execute --linked < supabase/migrations/20251106000002_performance_optimization_indexes.sql
```

### Index Creation Fails

```sql
-- Check for conflicting indexes
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'sessions'
    AND indexname LIKE 'idx_%';

-- Drop conflicting index if needed
DROP INDEX IF EXISTS old_index_name;
```

### Performance Not Improved

```sql
-- Force PostgreSQL to re-plan queries
DISCARD PLANS;

-- Update statistics
ANALYZE VERBOSE;

-- Check if indexes are being used
EXPLAIN ANALYZE [your query here];
```

## Success Criteria

✅ **Migration successful if:**

1. All migrations applied without errors
2. All 30+ indexes created
3. RLS policies still functioning
4. Dashboard queries 10x+ faster
5. No application errors
6. Database health check passes

## Next Steps

After migrations are complete:

1. Update Issue #146 with results
2. Proceed to Issue #147 (Smoke testing)
3. Monitor performance for 24 hours
4. Document any issues or improvements

## Related Documentation

- [Performance Monitoring Guide](./docs/STEP_12_PERFORMANCE_MONITORING.md)
- [Database Refactoring Plan](./docs/STEP_13_DATABASE_REFACTORING.md)
- [Admin Guide - Database Health](./docs/ADMIN_GUIDE.md)

## Contact

If you encounter issues:
1. Check GitHub Issue #146 for updates
2. Review Supabase staging logs
3. Contact database admin or DevOps team
