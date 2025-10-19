# Loom App Administration Guide

## Table of Contents

- [Overview](#overview)
- [Database Health Monitoring](#database-health-monitoring)
- [Security Monitoring](#security-monitoring)
- [Supabase Management](#supabase-management)
- [Database Maintenance](#database-maintenance)
- [Performance Monitoring](#performance-monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

This guide provides administrators and DevOps engineers with tools and procedures to monitor, maintain, and troubleshoot the Loom coaching platform.

### Key Responsibilities

- Monitor database health and security
- Apply security advisories and patches
- Manage database migrations
- Monitor performance and optimize queries
- Respond to security incidents
- Maintain backup and recovery procedures

## Database Health Monitoring

### Health Check Function

The platform includes a built-in database health check function that can be called via RPC to verify critical system components.

#### Using the Health Check

**Via Supabase Client:**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, anonKey);

const { data, error } = await supabase.rpc('db_health_check');

console.log(data);
// Output:
// {
//   "has_handle_new_user": true,
//   "users_rls_enabled": true,
//   "payments_rls_enabled": true,
//   "timestamp": "2025-10-19T15:00:00Z"
// }
```

**Via SQL:**

```sql
SELECT * FROM public.db_health_check();
```

**Via API Endpoint:**

```bash
curl -X POST https://your-project.supabase.co/rest/v1/rpc/db_health_check \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### Health Check Metrics

The health check verifies:

1. **`has_handle_new_user`**: Confirms the user registration trigger exists
   - Expected: `true`
   - Critical: ✅ Yes - User registration will fail without this

2. **`users_rls_enabled`**: Verifies Row-Level Security is enabled on users table
   - Expected: `true`
   - Critical: ✅ Yes - Data privacy depends on this

3. **`payments_rls_enabled`**: Verifies RLS is enabled on payments table
   - Expected: `true`
   - Critical: ✅ Yes - Payment data security depends on this

4. **`timestamp`**: Current database time for health check verification
   - Used to verify database connectivity and clock sync

#### Automated Health Monitoring

**Recommended Setup:**

```typescript
// Example: Automated health check every 5 minutes
import { CronJob } from 'cron';

const healthCheck = new CronJob('*/5 * * * *', async () => {
  const { data, error } = await supabase.rpc('db_health_check');

  if (error) {
    console.error('Health check failed:', error);
    // Send alert to monitoring system
    await alerting.send({
      severity: 'critical',
      message: 'Database health check failed',
      error: error.message,
    });
    return;
  }

  // Verify all checks pass
  const issues = [];
  if (!data.has_handle_new_user) issues.push('Missing handle_new_user trigger');
  if (!data.users_rls_enabled) issues.push('Users RLS disabled');
  if (!data.payments_rls_enabled) issues.push('Payments RLS disabled');

  if (issues.length > 0) {
    await alerting.send({
      severity: 'critical',
      message: 'Database health check failed',
      issues,
    });
  }
});

healthCheck.start();
```

## Security Monitoring

### Supabase Security Advisors

Supabase provides automated security analysis through advisors. Use these tools regularly to identify and remediate security issues.

#### Accessing Security Advisors

**Via Supabase Dashboard:**

1. Navigate to your project in Supabase Dashboard
2. Go to **Database** → **Advisors**
3. Review **Security** and **Performance** tabs

**Via Supabase CLI:**

```bash
# Run security advisors
supabase db lint --level warning

# View specific advisor results
supabase db lint --schema public --level warning
```

**Via API:**

```bash
# Get security advisors programmatically
curl -X GET \
  "https://api.supabase.com/v1/projects/{project_id}/advisors/security" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}"
```

#### Common Security Advisors

1. **RLS Not Enabled**
   - **Issue**: Tables without Row-Level Security enabled
   - **Risk**: Data exposure, unauthorized access
   - **Fix**: Enable RLS on all public tables

   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ```

2. **Missing RLS Policies**
   - **Issue**: RLS enabled but no policies defined
   - **Risk**: No users can access data (or everyone can, depending on defaults)
   - **Fix**: Add appropriate policies

   ```sql
   CREATE POLICY "Users can view own data"
     ON table_name FOR SELECT
     USING (auth.uid() = user_id);
   ```

3. **SECURITY DEFINER Without search_path**
   - **Issue**: Functions with SECURITY DEFINER privilege but no secure search_path
   - **Risk**: Function hijacking via malicious schema/function injection
   - **Fix**: Set explicit search_path on all SECURITY DEFINER functions

   ```sql
   ALTER FUNCTION function_name()
     SET search_path = 'pg_catalog', 'public', 'extensions';
   ```

4. **Long OTP Expiry Times**
   - **Issue**: One-time passwords valid for too long
   - **Risk**: Increased window for OTP theft/reuse
   - **Fix**: Set OTP expiry to 15 minutes or less

   ```toml
   # supabase/config.toml
   [auth.email]
   otp_expiry = 900  # 15 minutes
   ```

5. **Unconfirmed Email Addresses**
   - **Issue**: Users can sign in without confirming email
   - **Risk**: Fake accounts, abuse potential
   - **Fix**: Enable email confirmation
   ```toml
   # supabase/config.toml
   [auth.email]
   enable_confirmations = true
   ```

### Security Definer Function Audit

The platform includes tools to audit and secure all SECURITY DEFINER functions.

#### Running the Security Audit

**Inventory All SECURITY DEFINER Functions:**

```sql
-- Run the inventory query
\i supabase/migrations/analysis_security_definer_inventory.sql

-- Expected output shows all SECURITY DEFINER functions with their search_path
```

**Run Regression Test:**

```sql
-- Verify all functions have secure search_path
\i supabase/tests/security_definer_regression.sql

-- This test will FAIL if any function lacks the secure search_path
```

#### Applying Security Fixes

The platform includes a comprehensive migration to secure all SECURITY DEFINER functions:

```bash
# Apply the security hardening migration
supabase db push

# Or manually apply:
psql -h db.your-project.supabase.co -U postgres -d postgres \
  -f supabase/migrations/20260222000001_secure_security_definer_search_path.sql
```

This migration:

1. Identifies all SECURITY DEFINER functions in the `public` schema
2. Sets `search_path = 'pg_catalog', 'public', 'extensions'` on each
3. Prevents function hijacking attacks

### Authentication Security Configuration

Recent security improvements to authentication configuration:

#### OTP Security

```toml
# supabase/config.toml
[auth.email]
otp_expiry = 900  # 15 minutes (recommended)
enable_confirmations = true
```

**Production Deployment:**

```bash
# Set via environment variable
export SUPABASE_AUTH_EMAIL_OTP_EXPIRY=900

# Or via Supabase Dashboard:
# Settings → Authentication → Email Auth → OTP Expiry
```

#### Redirect URL Security

```toml
# supabase/config.toml
[auth]
site_url = "env(SUPABASE_SITE_URL)"
additional_redirect_urls = ["env(SUPABASE_ADDITIONAL_REDIRECT_URLS)"]
```

**Production Deployment:**

```bash
# Set production URLs
export SUPABASE_SITE_URL="https://app.loom.com"
export SUPABASE_ADDITIONAL_REDIRECT_URLS="https://app.loom.com/auth/callback,https://app.loom.com/auth/verify"
```

**⚠️ Security Warning:**

- Never hardcode `localhost` URLs in production config
- Always use environment variables for deployment-specific URLs
- Verify redirect URLs in Supabase Dashboard after deployment

## Supabase Management

### CLI Commands

#### Project Status

```bash
# Check local Supabase status
supabase status

# Check if services are running
supabase db status
```

#### Database Migrations

**Apply Migrations:**

```bash
# Push all pending migrations to remote database
supabase db push

# Apply specific migration
supabase db execute --file supabase/migrations/TIMESTAMP_migration_name.sql

# Preview migration changes (dry run)
supabase db diff
```

**Create New Migration:**

```bash
# Create new migration from schema changes
supabase db diff --schema public > supabase/migrations/TIMESTAMP_new_migration.sql

# Create empty migration file
supabase migration new migration_name
```

**Rollback Migration:**

```bash
# Note: Supabase doesn't support automatic rollback
# You must create a new migration to reverse changes

# Example: Create a rollback migration
supabase migration new rollback_feature_name
# Then write SQL to reverse the changes
```

#### Linting & Testing

```bash
# Run database linter
supabase db lint --level warning

# Run specific schema linting
supabase db lint --schema public --schema auth

# Run SQL tests
psql -h db.your-project.supabase.co -U postgres -d postgres \
  -f supabase/tests/security_definer_regression.sql
```

### Database Backup & Recovery

#### Automated Backups

Supabase Pro and above include daily automated backups:

- **Retention**: 7 days (Pro), 30 days (Team/Enterprise)
- **Schedule**: Daily at ~2 AM UTC
- **Storage**: Encrypted backups in Supabase infrastructure

**Verify Backups:**

1. Go to Supabase Dashboard
2. Navigate to **Database** → **Backups**
3. Verify recent backups are listed

#### Manual Backups

**Full Database Dump:**

```bash
# Backup entire database
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup specific schema
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  --schema=public \
  > public_schema_backup.sql
```

**Restore from Backup:**

```bash
# Restore full database
psql -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  < backup_20251019_150000.sql

# Restore specific tables
psql -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -c "TRUNCATE TABLE table_name CASCADE;"
psql -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  < table_backup.sql
```

#### Point-in-Time Recovery (Enterprise Only)

For Enterprise plans, enable PITR for continuous backup:

1. Contact Supabase support to enable PITR
2. Configure retention period (up to 30 days)
3. Restore to any point in time within retention window

## Database Maintenance

### Routine Maintenance Tasks

#### Weekly Tasks

**1. Review Security Advisors:**

```bash
# Check for new security findings
supabase db lint --level warning

# Review in dashboard
# Dashboard → Database → Advisors
```

**2. Monitor Database Size:**

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

**3. Review Slow Queries:**

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slowest queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

#### Monthly Tasks

**1. Vacuum & Analyze:**

```sql
-- Vacuum all tables
VACUUM ANALYZE;

-- Vacuum specific table
VACUUM ANALYZE table_name;

-- Full vacuum (requires more resources)
VACUUM FULL ANALYZE table_name;
```

**2. Reindex:**

```sql
-- Reindex specific table
REINDEX TABLE table_name;

-- Reindex entire database (careful - can be slow)
REINDEX DATABASE postgres;
```

**3. Review and Archive Old Data:**

```sql
-- Example: Archive old sessions
BEGIN;

-- Copy to archive table
INSERT INTO sessions_archive
SELECT * FROM sessions
WHERE created_at < NOW() - INTERVAL '1 year';

-- Delete from main table
DELETE FROM sessions
WHERE created_at < NOW() - INTERVAL '1 year';

COMMIT;
```

### Index Management

**Review Missing Indexes:**

```sql
-- Check for missing indexes on foreign keys
SELECT
  c.conrelid::regclass AS table_name,
  a.attname AS column_name,
  c.confrelid::regclass AS referenced_table
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND a.attnum = ANY(i.indkey)
  );
```

**Review Unused Indexes:**

```sql
-- Find indexes with low usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan < 50
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Performance Monitoring

### Real-Time Monitoring

**Database Connections:**

```sql
-- View active connections
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Count connections by state
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;
```

**Resource Usage:**

```sql
-- Table bloat check
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  round(100 * pg_total_relation_size(schemaname||'.'||tablename) /
    NULLIF(pg_database_size(current_database()), 0), 2) AS pct_of_db
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

### Query Performance Analysis

**Enable Query Logging:**

```sql
-- Enable slow query logging (requires superuser)
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second
SELECT pg_reload_conf();
```

**Analyze Query Plans:**

```sql
-- Explain query execution plan
EXPLAIN ANALYZE
SELECT * FROM resources WHERE coach_id = 'uuid';

-- More detailed analysis
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM resources WHERE coach_id = 'uuid';
```

### Resource Library Performance

**Monitor Resource Access:**

```sql
-- Most accessed resources
SELECT
  f.id,
  f.filename,
  f.view_count,
  f.download_count,
  f.completion_count,
  COUNT(DISTINCT p.client_id) AS unique_viewers
FROM file_uploads f
LEFT JOIN resource_client_progress p ON p.file_id = f.id
WHERE f.is_library_resource = true
GROUP BY f.id, f.filename, f.view_count, f.download_count, f.completion_count
ORDER BY f.view_count DESC
LIMIT 20;
```

**Analytics Query Performance:**

```sql
-- Check analytics query performance
EXPLAIN ANALYZE
SELECT * FROM public.get_library_analytics('coach-uuid', '30d');
```

## Troubleshooting

### Common Issues

#### 1. Health Check Failures

**Symptom:** `db_health_check()` returns false values

**Diagnosis:**

```sql
-- Check if handle_new_user exists
SELECT EXISTS(
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'handle_new_user' AND n.nspname = 'public'
);

-- Check RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'payments');
```

**Resolution:**

```sql
-- Enable RLS if disabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Recreate handle_new_user if missing
\i supabase/migrations/TIMESTAMP_create_handle_new_user.sql
```

#### 2. Migration Failures

**Symptom:** `supabase db push` fails with error

**Diagnosis:**

```bash
# Check migration status
supabase migration list

# Test migration locally
supabase db reset
supabase db push
```

**Resolution:**

1. Review error message for specific issue
2. Check migration SQL syntax
3. Verify dependencies (e.g., extensions, previous migrations)
4. Test migration on local database first
5. If needed, create a fix migration

#### 3. Security Advisor Findings

**Symptom:** Dashboard shows security warnings

**Common Findings and Fixes:**

**Missing RLS Policies:**

```sql
-- Create appropriate policies
CREATE POLICY "policy_name"
  ON table_name
  FOR SELECT
  USING (auth.uid() = user_id);
```

**SECURITY DEFINER Issues:**

```sql
-- Apply the comprehensive fix
\i supabase/migrations/20260222000001_secure_security_definer_search_path.sql
```

**Auth Configuration:**

```bash
# Update config.toml and redeploy
vim supabase/config.toml
supabase db push
```

#### 4. Performance Degradation

**Symptom:** Slow queries, high database CPU

**Diagnosis:**

```sql
-- Find slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check for missing indexes
SELECT * FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
  AND seq_scan > 1000;
```

**Resolution:**

1. Add missing indexes
2. Optimize query structure
3. Consider materialized views for complex analytics
4. Implement caching at application layer

#### 5. Connection Pool Exhaustion

**Symptom:** "too many connections" errors

**Diagnosis:**

```sql
-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- View connection breakdown
SELECT
  usename,
  count(*),
  state
FROM pg_stat_activity
GROUP BY usename, state;
```

**Resolution:**

1. Increase connection pool size in Supabase dashboard
2. Implement connection pooling in application (PgBouncer)
3. Close idle connections
4. Review application connection management

### Monitoring Best Practices

1. **Set Up Alerts:**
   - Health check failures
   - High database CPU (>80%)
   - Connection pool near limit (>80%)
   - Slow query thresholds exceeded
   - Security advisor new findings

2. **Regular Reviews:**
   - Weekly: Security advisors, slow queries
   - Monthly: Database size, index usage, archive old data
   - Quarterly: Full performance audit, capacity planning

3. **Incident Response:**
   - Document all incidents and resolutions
   - Perform root cause analysis
   - Update runbooks based on learnings
   - Test recovery procedures regularly

### Support Escalation

**For Critical Issues:**

1. Check [Supabase Status Page](https://status.supabase.com/)
2. Review [Supabase Docs](https://supabase.com/docs)
3. Search [Supabase GitHub Issues](https://github.com/supabase/supabase/issues)
4. Contact Supabase Support (Pro/Team/Enterprise plans)
5. Post in [Supabase Discord](https://discord.supabase.com/) (community support)

## Related Documentation

- [Supabase Remediation Plan](../SUPABASE_REMEDIATION_PLAN.md)
- [Auth Security Configuration](../supabase/AUTH_SECURITY_CONFIG.md)
- [Features Guide](./FEATURES.md)
- [Database Schema](../supabase/migrations/)
- [Security Definer Inventory](../supabase/migrations/analysis_security_definer_inventory.sql)
- [Security Definer Regression Test](../supabase/tests/security_definer_regression.sql)
