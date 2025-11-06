# Supabase Migration Audit Report

**Generated:** 2025-10-01
**Total Migrations Reviewed:** 57
**Critical Issues Found:** 12
**High Priority Issues Found:** 3
**Medium Priority Issues Found:** 4
**Low Priority Issues Found:** 2

---

## Executive Summary

A comprehensive audit of all 57 SQL migrations has identified multiple security vulnerabilities, performance concerns, and architectural issues that require immediate attention. The most critical findings include:

1. **Security Definer Functions Without search_path Protection** - 12 functions vulnerable to privilege escalation
2. **RLS Policy Gaps** - Coach access policy allows viewing any shared entry without verification
3. **Duplicate MFA Implementation** - Two conflicting MFA systems in migration history
4. **Performance Issues** - Inefficient streak calculation in practice journal stats

---

## Critical Issues (Immediate Action Required)

### 1. Missing `SET search_path = ''` in SECURITY DEFINER Functions

**Severity:** CRITICAL
**Risk:** Privilege escalation, unauthorized data access via schema search path hijacking

#### Affected Functions in `20250930000001_practice_journal_system.sql`:
- Line 197: `get_practice_journal_stats(UUID)` - Missing `SET search_path = ''`
- Line 220: `share_journal_entry_with_coach(UUID)` - Missing `SET search_path = ''`
- Line 242: `unshare_journal_entry(UUID)` - Missing `SET search_path = ''`

#### Affected Functions in `20250730000002_mfa_implementation.sql`:
- Line 288: `encrypt_totp_secret(TEXT, UUID)` - Missing `SET search_path = ''`
- Line 310: `decrypt_totp_secret(BYTEA, BYTEA, UUID)` - Missing `SET search_path = ''`
- Line 339: `generate_backup_codes(UUID, INTEGER, INTEGER)` - Missing `SET search_path = ''`
- Line 393: `verify_backup_code(UUID, TEXT, INET, TEXT)` - Missing `SET search_path = ''`
- Line 450: `check_mfa_rate_limit(UUID, TEXT)` - Missing `SET search_path = ''`
- Line 480: `get_user_mfa_status(UUID)` - Missing `SET search_path = ''`
- Line 600: `check_mfa_enforcement()` - Missing `SET search_path = ''`
- Line 658: `cleanup_mfa_data()` - Missing `SET search_path = ''`

#### Affected Functions in `20250730000003_mfa_system.sql`:
- Line 80: `check_mfa_ip_rate_limit(UUID, INET, INTERVAL, INTEGER)` - Missing `SET search_path = ''`
- Line 99: `log_mfa_event(UUID, mfa_event_type, INET, TEXT, JSONB)` - Missing `SET search_path = ''`
- Line 114: `cleanup_old_mfa_data(INTERVAL, INTERVAL)` - Missing `SET search_path = ''`

**Recommendation:** Create a new migration to add `SET search_path = ''` to all SECURITY DEFINER functions and explicitly qualify all schema references (e.g., `public.users`, `auth.uid()`).

### 2. Coach RLS Policy Security Gap

**Severity:** CRITICAL
**File:** `20250930000001_practice_journal_system.sql`
**Line:** 68-74

**Issue:** The policy "Coaches can view shared practice journal entries" allows ANY coach to view ANY shared journal entry, without verifying the coach is assigned to that specific client.

```sql
CREATE POLICY "Coaches can view shared practice journal entries"
  ON practice_journal_entries
  FOR SELECT
  USING (
    (shared_with_coach = TRUE AND auth.jwt() ->> 'role' = 'coach')
    OR auth.jwt() ->> 'role' = 'admin'
  );
```

**Risk:** Breaks client-coach confidentiality. Any coach in the system can view shared entries from ANY client.

**Recommendation:** Rewrite policy to verify coach assignment:
```sql
CREATE POLICY "Coaches can view assigned client shared entries"
  ON practice_journal_entries
  FOR SELECT
  USING (
    shared_with_coach = TRUE
    AND EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.coach_id = auth.uid()
      AND sessions.client_id = practice_journal_entries.client_id
    )
  );
```

---

## High Priority Issues

### 3. Insecure RLS Policy with `WITH CHECK (true)`

**Severity:** HIGH
**File:** `20250730000002_mfa_implementation.sql`
**Line:** 241

**Issue:** Policy allows any authenticated user to insert records into `mfa_verification_attempts` without restriction.

```sql
CREATE POLICY "System can insert verification attempts"
  ON mfa_verification_attempts
  FOR INSERT
  WITH CHECK (true);
```

**Risk:** Table flooding, potential abuse of downstream logic.

**Recommendation:** Restrict to service role or add proper validation logic.

### 4. Duplicate MFA Implementation

**Severity:** HIGH
**Files:**
- `20250730000002_mfa_implementation.sql`
- `20250730000003_mfa_system.sql`

**Issue:** Two different MFA systems implemented with conflicting tables:
- `user_mfa_settings` vs `user_mfa`
- Different enum types and functions
- Overlapping functionality

**Risk:** Data inconsistency, confusion, maintenance burden, potential runtime conflicts.

**Recommendation:** Consolidate into single MFA implementation. Remove one migration and migrate any dependent code.

### 5. Conflicting/Redundant RLS Policies

**Severity:** HIGH
**Files:** `20250730000002_mfa_implementation.sql`, `20250730000003_mfa_system.sql`

**Issue:** Multiple overlapping policies for same tables combining `FOR ALL` admin policies with specific user/admin policies. This creates confusing permission logic.

**Examples:**
- `user_mfa`: Lines 135 & 141 in `20250730000003_mfa_system.sql`
- `mfa_attempts`: Lines 148 & 155
- `mfa_events`: Lines 162 & 169

**Recommendation:** Consolidate to one comprehensive policy per table, combining conditions with OR logic where appropriate.

---

## Medium Priority Issues

### 6. Missing GIN Index on `practices_done` Array

**Severity:** MEDIUM
**File:** `20250930000001_practice_journal_system.sql`
**Line:** 20

**Issue:** The `practices_done TEXT[]` column lacks a GIN index while other array columns (`sensations`, `emotions`, `body_areas`) have them.

**Impact:** Slow queries when filtering by practices performed.

**Recommendation:** Add index:
```sql
CREATE INDEX idx_practice_journal_practices_done
  ON practice_journal_entries
  USING GIN(practices_done);
```

### 7. Missing Foreign Key Indexes

**Severity:** MEDIUM
**File:** `20250730000002_mfa_implementation.sql`

**Issue:** Foreign key columns without indexes:
- Line 107: `mfa_verification_attempts(method_id)` → `user_mfa_methods(id)` - Missing index
- Line 124: `mfa_system_config(updated_by)` → `users(id)` - Missing index

**Impact:** Performance degradation on UPDATE/DELETE operations on parent tables.

**Recommendation:** Add indexes:
```sql
CREATE INDEX idx_mfa_verification_attempts_method_id ON mfa_verification_attempts(method_id);
CREATE INDEX idx_mfa_system_config_updated_by ON mfa_system_config(updated_by);
```

### 8. Inefficient Streak Calculation

**Severity:** MEDIUM
**File:** `20250930000001_practice_journal_system.sql`
**Lines:** 158-181

**Issue:** The `practice_streak_days` calculation uses `generate_series` to create a row for EVERY day between first entry and current date, then LEFT JOINs against `practice_journal_entries` for each day.

**Impact:** For users with years of history, this generates thousands of rows and performs expensive joins. Query will be extremely slow.

**Recommendation:** Refactor to use window functions (`LAG`) on existing entry dates directly, calculating gaps between consecutive entries without generating all intermediate dates.

### 9. Subquery in RLS Policy WITH CHECK

**Severity:** MEDIUM
**File:** `20250930000001_practice_journal_system.sql`
**Line:** 80-85

**Issue:** INSERT policy contains subquery to validate role:
```sql
WITH CHECK (
  auth.uid() = client_id
  AND (
    SELECT role FROM users WHERE id = auth.uid()
  ) IN ('client', 'admin')
)
```

**Impact:** Subquery runs on every INSERT, inefficient. Role validation is better handled in application layer or via JWT claims.

**Recommendation:** Use `auth.jwt() ->> 'role'` or move validation to application layer.

---

## Low Priority Issues

### 10. Inconsistent Parameter Usage in Stats Function

**Severity:** LOW
**File:** `20250930000001_practice_journal_system.sql`
**Line:** 107

**Issue:** Function accepts `user_id UUID` parameter but share/unshare functions use `auth.uid()` instead of parameter. This creates inconsistency.

**Impact:** Confusion about intended usage pattern. If admins/coaches should call this for other users, authorization checks are missing.

**Recommendation:** Either:
- Remove `user_id` parameter and use `auth.uid()` directly if only for self
- Add authorization checks if allowing admin/coach access to other user stats

### 11. Redundant Admin Checks in RLS Policies

**Severity:** LOW
**File:** `20250930000001_practice_journal_system.sql`
**Lines:** 62-74

**Issue:** Admin access (`auth.jwt() ->> 'role' = 'admin'`) is checked in individual SELECT policies, but there's also a `FOR ALL` admin policy at line 101-104.

**Impact:** Redundant checks make policies harder to maintain.

**Recommendation:** Remove admin checks from individual policies and rely solely on comprehensive admin policy.

### 12. Custom Access Token Hook Non-Standard search_path

**Severity:** LOW
**File:** `20250918000003_fix_custom_access_token_hook.sql`
**Line:** 4

**Issue:** Function uses `SET search_path = public, auth, extensions` instead of recommended `SET search_path = ''` with explicit schema qualification.

**Impact:** While not immediately dangerous, this is non-standard for SECURITY DEFINER functions and could be exploited.

**Recommendation:** Change to `SET search_path = ''` and explicitly qualify all schema references.

---

## Additional Observations from Migration Apply

From the Supabase CLI output when applying migrations, the following notices were observed:

### Skipped Policy Drops (Expected Behavior)
Multiple policies were reported as "does not exist, skipping" during DROP IF EXISTS operations. This is expected and not an issue:
- Notification policies in `20250806000002_notifications_rls_policies.sql`
- File versioning policies in `20250807000005_file_versioning_rls_policies.sql`
- Trusted device policies in `20250914144800_fix_security_advisor_findings.sql`

### Missing FK Indexes Auto-Created
Migration `20250910102000_add_missing_fk_indexes.sql` successfully created 20+ missing foreign key indexes. Good practice.

### Storage Object RLS
Warning in `20250807000007_file_storage_setup.sql`: "Skipping enabling RLS on storage.objects due to insufficient privileges" - This may need verification that storage bucket policies are properly configured.

---

## Recommended Action Plan

### Phase 1: Critical Security Fixes (Immediate)
1. Create migration to add `SET search_path = ''` to all 12 SECURITY DEFINER functions
2. Fix coach RLS policy to verify client-coach relationships
3. Review and consolidate duplicate MFA implementations

### Phase 2: High Priority (This Week)
1. Fix insecure `WITH CHECK (true)` policy on mfa_verification_attempts
2. Consolidate redundant RLS policies
3. Add missing foreign key indexes

### Phase 3: Medium Priority (Next Sprint)
1. Add GIN index for `practices_done` array
2. Refactor practice journal streak calculation for performance
3. Move role validation from RLS to application layer

### Phase 4: Low Priority (Next Sprint)
1. Clean up redundant admin checks in RLS policies
2. Standardize parameter usage in stats function
3. Update custom access token hook to use standard search_path pattern

---

## Testing Recommendations

After applying fixes:

1. **Security Testing:**
   - Attempt schema search path hijacking on SECURITY DEFINER functions
   - Verify coach can only see assigned client entries
   - Test MFA verification attempt insertion restrictions

2. **Performance Testing:**
   - Benchmark practice journal stats function with large datasets (1000+ entries)
   - Verify array column queries use GIN indexes
   - Test foreign key cascade performance

3. **Integration Testing:**
   - Verify MFA flow works correctly after consolidation
   - Test all RLS policies with different user roles
   - Ensure storage bucket policies work correctly

---

## Conclusion

The migration history contains several critical security vulnerabilities and architectural issues that should be addressed immediately. The most urgent items are:

1. Adding `SET search_path = ''` to 12 SECURITY DEFINER functions
2. Fixing the coach RLS policy security gap
3. Resolving the duplicate MFA implementation

Once these critical issues are resolved, the medium and low priority items should be addressed to improve performance and maintainability.

**Estimated Effort:**
- Phase 1: 2-3 days
- Phase 2: 2-3 days
- Phase 3: 3-4 days
- Phase 4: 1-2 days

**Total:** ~10-12 developer days
