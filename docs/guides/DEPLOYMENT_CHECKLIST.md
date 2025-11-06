# Database Refactoring Deployment Checklist

**Date**: 2025-10-21
**Project**: Loom Coaching Platform
**Phase**: All Phases (0-3)

---

## Pre-Deployment

### Review & Verification

- [ ] Read `DATABASE_REFACTORING_EXECUTION_SUMMARY.md`
- [ ] Review all 3 migration files:
  - [ ] `20251021000001_security_definer_search_path_hardening.sql`
  - [ ] `20251021000002_fix_resource_library_rls_policies.sql`
  - [ ] `20251021000003_mfa_unified_source_non_destructive.sql`
- [ ] Review test files:
  - [ ] `supabase/tests/security_definer_regression.sql`
  - [ ] `supabase/tests/resource_library_rls_tests.sql`
- [ ] Review validation scripts:
  - [ ] `supabase/scripts/validate_resource_library_data.sql`
  - [ ] `supabase/scripts/mfa_usage_telemetry.sql`

### Backup & Safety

- [ ] Create full database backup
  ```bash
  npx supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Document current production state:
  - [ ] Count of users with MFA enabled
  - [ ] Count of resource collections
  - [ ] Count of resource collection items
  - [ ] Count of resource client progress records
- [ ] Notify team of upcoming deployment
- [ ] Schedule maintenance window (if needed - migrations are non-blocking)

### Local Testing (Recommended)

- [ ] Test migrations on local Supabase instance
  ```bash
  npx supabase db reset
  npx supabase db push
  ```
- [ ] Run regression tests locally
  ```bash
  npx supabase db execute -f supabase/tests/security_definer_regression.sql
  npx supabase db execute -f supabase/tests/resource_library_rls_tests.sql
  ```
- [ ] Verify no errors in migration output

---

## Deployment

### Step 1: Apply Migrations

#### Connect to Database

```bash
# Verify you're connected to the correct environment
npx supabase status

# Or check project ID
npx supabase projects list
```

#### Apply Migrations

- [ ] Run database push
  ```bash
  npx supabase db push
  ```
- [ ] Verify migrations applied successfully
  ```bash
  npx supabase db diff --schema public
  # Should show no differences
  ```
- [ ] Check migration history
  ```bash
  npx supabase migration list
  ```

### Step 2: Validation

#### Run Inventory Check

- [ ] Check SECURITY DEFINER functions
  ```bash
  npx supabase db execute -f supabase/migrations/analysis_security_definer_inventory.sql
  ```
- [ ] **Expected**: 0 functions missing search_path
- [ ] **If failures**: Review output and investigate

#### Run Security Tests

- [ ] Execute security regression tests
  ```bash
  npx supabase db execute -f supabase/tests/security_definer_regression.sql
  ```
- [ ] **Expected**: All tests PASS
- [ ] **If failures**: Review failed tests and rollback if critical

#### Run RLS Tests

- [ ] Execute resource library RLS tests
  ```bash
  npx supabase db execute -f supabase/tests/resource_library_rls_tests.sql
  ```
- [ ] **Expected**: All 11 tests PASS
- [ ] **If failures**: Review failed tests

#### Validate Data

- [ ] Run resource library data validation
  ```bash
  npx supabase db execute -f supabase/scripts/validate_resource_library_data.sql
  ```
- [ ] **Review output**: Note any orphaned records or discrepancies
- [ ] **Action**: If issues found, use recommendations from script output

#### Check MFA Status

- [ ] Run MFA telemetry script
  ```bash
  npx supabase db execute -f supabase/scripts/mfa_usage_telemetry.sql
  ```
- [ ] **Expected**: 0 discrepancies after sync
- [ ] **Review**: MFA adoption rates, method distribution

### Step 3: Verify Database State

#### Check Security Audit Log

```sql
SELECT
  event_type,
  event_details,
  severity,
  timestamp
FROM security_audit_log
WHERE event_type IN ('security_hardening', 'rls_policy_fix', 'mfa_consolidation', 'mfa_synchronization')
ORDER BY timestamp DESC
LIMIT 10;
```

- [ ] Verify all migration events logged
- [ ] Note how many records were updated in MFA sync

#### Check MFA Discrepancies

```sql
SELECT COUNT(*) AS discrepancy_count FROM mfa_status_discrepancies;
```

- [ ] **Expected**: 0
- [ ] **If > 0**: Investigate and document

#### Check RLS Policies

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('resource_collection_items', 'resource_client_progress')
ORDER BY tablename, policyname;
```

- [ ] Verify policies reference `file_id` (not `resource_id`)
- [ ] Count policies for each table

#### Verify Materialized View

```sql
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE mfa_enabled = true) AS mfa_enabled_users,
  COUNT(*) FILTER (WHERE has_discrepancy = true) AS discrepancies
FROM user_mfa_status_unified;
```

- [ ] Compare counts with pre-deployment documentation
- [ ] Verify discrepancies = 0

---

## Post-Deployment

### Immediate Monitoring (First Hour)

#### Application Health

- [ ] Check application logs for errors
  ```bash
  # Supabase logs
  npx supabase logs --level error
  ```
- [ ] Test critical user flows:
  - [ ] User login (with and without MFA)
  - [ ] Coach creates resource collection
  - [ ] Coach adds file to collection
  - [ ] Client views shared resource
  - [ ] Client tracks progress

#### Database Performance

- [ ] Monitor query performance
  ```sql
  SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time
  FROM pg_stat_statements
  WHERE query LIKE '%mfa%' OR query LIKE '%resource_%'
  ORDER BY mean_exec_time DESC
  LIMIT 10;
  ```
- [ ] Check for slow queries (> 100ms)
- [ ] Verify indexes are being used

### Short-term Monitoring (First Week)

#### Daily Checks

- [ ] Day 1: Check `mfa_status_discrepancies` view
- [ ] Day 2: Run validation scripts again
- [ ] Day 3: Review security audit log for anomalies
- [ ] Day 4: Check application error rates
- [ ] Day 5: Review performance metrics
- [ ] Day 7: Full validation suite

#### Performance Metrics

- [ ] Track query times for:
  - MFA status checks
  - Resource library queries
  - Collection item lookups
- [ ] Compare against baseline (pre-deployment)
- [ ] Expected improvement: 30-80% faster

#### User Feedback

- [ ] Monitor support tickets related to:
  - MFA login issues
  - Resource library access problems
  - Collection management errors
- [ ] Review user-reported bugs
- [ ] Document any issues in GitHub

### Long-term Actions (First Month)

#### Week 2

- [ ] Schedule materialized view refresh
  ```sql
  SELECT cron.schedule(
    'refresh-mfa-status',
    '0 2 * * *',
    'SELECT refresh_user_mfa_status_unified()'
  );
  ```
- [ ] Verify refresh runs successfully

#### Week 3

- [ ] Begin application code migration (optional)
- [ ] Follow `docs/MFA_MIGRATION_GUIDE.md`
- [ ] Start with admin dashboards

#### Week 4

- [ ] Performance review meeting
- [ ] Document lessons learned
- [ ] Plan next refactoring phase (if needed)

---

## Rollback Procedures

### If Critical Issues Arise

#### Rollback Phase 3 (MFA)

**Low Risk - Safe to Rollback**

```sql
BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS trg_sync_mfa_enabled_on_method_change ON user_mfa_methods;

-- Drop views
DROP VIEW IF EXISTS users_with_active_mfa CASCADE;
DROP VIEW IF EXISTS mfa_status_discrepancies CASCADE;
DROP MATERIALIZED VIEW IF EXISTS user_mfa_status_unified CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_user_mfa_status(UUID);
DROP FUNCTION IF EXISTS sync_mfa_enabled_column();
DROP FUNCTION IF EXISTS refresh_user_mfa_status_unified();

-- Re-sync users.mfa_enabled (if needed)
UPDATE users u
SET mfa_enabled = EXISTS (
  SELECT 1 FROM user_mfa_methods umm
  WHERE umm.user_id = u.id AND umm.status = 'active'
);

COMMIT;
```

- [ ] Run rollback SQL
- [ ] Verify `users.mfa_enabled` is accurate
- [ ] Test MFA login flows
- [ ] Document reason for rollback

#### Rollback Phase 2 (RLS)

**Medium Risk - Only if policies completely broken**

```sql
BEGIN;

-- Drop corrected policies
DROP POLICY IF EXISTS "Coaches can add items to their collections" ON resource_collection_items;
DROP POLICY IF EXISTS "Coaches can view progress for their resources" ON resource_client_progress;
DROP POLICY IF EXISTS "Clients can view shared collection items" ON resource_collection_items;
DROP POLICY IF EXISTS "Clients can view collections with shared items" ON resource_collections;

-- Restore original (broken) policies
-- (Extract from 20260109000001_resource_library_rls.sql)

COMMIT;
```

- [ ] **NOT RECOMMENDED** - Policies were broken before
- [ ] Consider fixing forward instead of rolling back

#### Rollback Phase 1 (Security)

**High Risk - Only in emergency**

- [ ] **NOT RECOMMENDED** - Creates security vulnerability
- [ ] Only rollback if functions completely broken
- [ ] Document extensively
- [ ] Plan immediate re-deployment

### Notification Template

If rollback is required, notify team:

```
Subject: Database Rollback - [Phase X]

Team,

We have rolled back [Phase X] of the database refactoring due to [issue description].

Impact: [describe impact]
Reason: [explain why rollback was necessary]
Status: [current state]

Next Steps:
1. [investigation]
2. [fix development]
3. [re-deployment plan]

Timeline: [estimated]
```

---

## Success Criteria

### Deployment Considered Successful When:

- [x] All migrations applied without errors
- [x] All regression tests pass
- [x] All RLS tests pass
- [x] 0 MFA discrepancies
- [x] No increase in application error rates
- [x] Query performance improved or stable
- [x] No critical user-reported bugs
- [x] Security audit log shows all events
- [x] Materialized views populated correctly
- [x] Backup verified and restorable

### Metrics to Track

**Before Deployment**:

```
Users with MFA: ______
Resource Collections: ______
Collection Items: ______
Progress Records: ______
Average MFA Query Time: ______ ms
Average RLS Query Time: ______ ms
```

**After Deployment**:

```
Users with MFA: ______
Resource Collections: ______
Collection Items: ______
Progress Records: ______
Average MFA Query Time: ______ ms
Average RLS Query Time: ______ ms
MFA Discrepancies: ______
Vulnerable Functions: ______
```

---

## Sign-off

- [ ] Database administrator reviewed and approved
- [ ] Application lead reviewed and approved
- [ ] Security team reviewed and approved
- [ ] Stakeholders notified
- [ ] Backup created and verified
- [ ] Rollback plan tested
- [ ] Monitoring alerts configured
- [ ] Documentation updated

---

**Deployment Date**: ********\_\_********
**Deployed By**: ********\_\_********
**Sign-off**: ********\_\_********

---

## Notes

_Use this section to document any issues, observations, or deviations from the plan during deployment._

```

```
