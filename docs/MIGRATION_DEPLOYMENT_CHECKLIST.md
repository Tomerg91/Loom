# Issue #146: Database Migration Deployment Checklist

## Overview
This guide walks through applying the performance optimization indexes migration to the staging environment.

**Migration File:** `supabase/migrations/20251106000002_performance_optimization_indexes.sql`

**Expected Improvements:**
- Dashboard queries: 100ms → 5-10ms (10-20x faster)
- Coach clients list: 300ms → 15ms (20x faster)
- User statistics: 250ms → 10ms (25x faster)

---

## Prerequisites

Before starting, you need:

- [ ] Supabase CLI installed (`supabase --version`)
- [ ] Staging project reference (from Supabase dashboard)
- [ ] Staging database credentials
- [ ] Access token from https://supabase.com/dashboard/account/tokens
- [ ] Database backup completed (optional but recommended)

---

## Step 1: Install and Verify Supabase CLI

```bash
# Check if already installed
supabase --version

# If not installed, install globally
npm install -g supabase
# or
brew install supabase
```

---

## Step 2: Link to Staging Project

```bash
# Navigate to project root
cd /Users/tomergalansky/Desktop/loom-app

# Link to staging project (replace with your staging project ref)
supabase link --project-ref <YOUR_STAGING_PROJECT_REF>

# You'll be prompted for your Supabase access token
# Get it from: https://supabase.com/dashboard/account/tokens
```

---

## Step 3: Check Migration Status

```bash
# See which migrations have been applied
supabase db list

# Or check using diff
supabase db diff --use-migra --linked

# List all pending migrations
ls -la supabase/migrations/*.sql | tail -5
```

---

## Step 4: Apply Migrations to Staging

```bash
# Apply all pending migrations
supabase db push --linked

# Or apply specific migration
supabase db execute --linked < supabase/migrations/20251106000002_performance_optimization_indexes.sql
```

---

## Step 5: Verify Migration Applied

### Option A: Using Supabase CLI
```bash
# Check remote database state
supabase db remote commit --linked

# Or verify via psql
psql "postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres"
```

### Option B: Using Supabase Dashboard
1. Go to Supabase dashboard
2. Select staging project
3. SQL Editor → new query
4. Run verification queries (see below)

---

## Verification Queries

Run these in Supabase SQL Editor to confirm migration success:

### 1. Check New Indexes Exist
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Expected: Should show 30+ new indexes

### 2. Verify Index Usage
```sql
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
    schemaname name,
    tablename name,
    indexname name,
    idx_scan bigint,
    idx_tup_read bigint,
    idx_tup_fetch bigint
) AS $$
SELECT
    s.schemaname,
    s.tablename,
    s.indexrelname::text,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch
FROM pg_stat_user_indexes s
WHERE s.schemaname = 'public';
$$ LANGUAGE SQL;

-- Query index usage
SELECT * FROM get_index_usage_stats()
ORDER BY idx_scan DESC
LIMIT 20;
```

### 3. Check RLS Policies Still Active
```sql
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected: All tables should have `rowsecurity = true`

### 4. Database Health Check
```sql
SELECT
    current_database(),
    current_user,
    version(),
    pg_database_size(current_database()) as db_size_bytes;
```

---

## Performance Testing

### Run Before and After Migration

```sql
-- Dashboard query (coach dashboard load)
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
```

After migration, you should see `Index Scan` instead of `Seq Scan`.

---

## Success Criteria

✅ **Migration successful if:**

1. All indexes created successfully
2. All 30+ indexes exist in database
3. RLS policies still functioning
4. Dashboard queries 10x+ faster
5. No application errors
6. Database health check passes

---

## Next Steps

After migration succeeds:

1. Update Issue #146 with results
2. Proceed to Issue #147 (Smoke testing)
3. Monitor performance for 24 hours
4. Document any improvements
