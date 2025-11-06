# Supabase Security Audit Report

**Generated:** 2025-10-04
**Database:** Local Supabase Instance
**Audit Type:** SECURITY DEFINER, RLS Policies, and Object Ownership Analysis

---

## Executive Summary

### Overall Security Posture: 🟡 MODERATE RISK

**Key Findings:**

- ✅ **GOOD:** All 62 public tables have RLS enabled
- ✅ **GOOD:** 201 RLS policies are actively protecting data
- ⚠️ **CONCERN:** 121 SECURITY DEFINER functions exist (many are system/extension functions)
- ⚠️ **CONCERN:** Several overly-permissive policies allowing unrestricted access
- ⚠️ **CONCERN:** High-privilege roles (supabase_admin, postgres) own most objects

### Security Statistics

| Metric                     | Count     |
| -------------------------- | --------- |
| Total public tables        | 62        |
| Tables with RLS enabled    | 62 (100%) |
| Tables with RLS disabled   | 0 (0%)    |
| SECURITY DEFINER functions | 121       |
| Total RLS policies         | 201       |

---

## Critical Security Issues

### 1. SECURITY DEFINER Functions (121 total)

#### HIGH RISK - System Extensions (Owned by supabase_admin)

The following SECURITY DEFINER functions are owned by privileged accounts and could pose security risks if invoked by application code:

**GraphQL Schema Functions:**

- `graphql.get_schema_version()` - Owned by supabase_admin
- `graphql.increment_schema_version()` - Owned by supabase_admin

**Network/HTTP Functions (HIGH RISK):**

- `net.http_get()` - Owned by supabase_admin, allows HTTP requests
- `net.http_post()` - Owned by supabase_admin, allows HTTP POST requests
- `net.http_delete()` - Owned by supabase_admin, allows HTTP DELETE requests

These functions bypass RLS and execute with elevated privileges. If application code can trigger these functions, they could be exploited for:

- SSRF (Server-Side Request Forgery) attacks
- Privilege escalation
- Data exfiltration

**Vault/Secrets Functions:**

- `vault.create_secret()` - Owned by supabase_admin
- `vault.update_secret()` - Owned by supabase_admin
- `pgsodium.*` - Various encryption/decryption functions

**Storage Functions:**

- Multiple storage-related SECURITY DEFINER functions

**Authentication Functions:**

- Various `auth.*` functions for user management

---

### 2. Overly Permissive RLS Policies

#### CRITICAL: Policies with NO Restrictions

| Table                | Policy                               | Risk      | Issue                                                                                                    |
| -------------------- | ------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------- |
| `coach_availability` | "Anyone can view coach availability" | 🔴 HIGH   | **SELECT with `qual = true`** - Anyone (including unauthenticated users) can view ALL coach availability |
| `file_download_logs` | "Service can insert download logs"   | 🟡 MEDIUM | **INSERT with `with_check = true`** - No validation on insertions                                        |

#### MODERATE: Policies with Empty `qual` (INSERT operations)

Several policies have no `qual` restriction but enforce `with_check` on INSERT:

- `coach_notes`: "Coaches can create notes for their clients"
- `conversation_participants`: "Users can join appropriate conversations"
- `conversations`: "Users can create conversations"
- `file_shares`: "Users can share their own files"
- `file_uploads`: "Users can create their own files"
- `file_versions`: Various version creation policies

**Analysis:** These are generally SAFE because:

- No `qual` is expected for INSERT (no rows to check)
- `with_check` validates the inserted data matches user constraints
- All use `auth.uid()` checks in `with_check`

---

### 3. Object Ownership Analysis

#### High-Privilege Owners

| Role                       | Superuser | Create Role | Create DB | Objects Owned |
| -------------------------- | --------- | ----------- | --------- | ------------- |
| `supabase_admin`           | ✅ Yes    | ✅ Yes      | ✅ Yes    | 479           |
| `postgres`                 | ❌ No     | ✅ Yes      | ✅ Yes    | 552           |
| `supabase_auth_admin`      | ❌ No     | ✅ Yes      | ❌ No     | 115           |
| `supabase_storage_admin`   | ❌ No     | ✅ Yes      | ❌ No     | 32            |
| `supabase_functions_admin` | ❌ No     | ✅ Yes      | ❌ No     | 11            |

**Risk Assessment:**

- 🔴 **HIGH:** All public application tables are owned by `postgres` (552 objects)
- 🟡 **MEDIUM:** System extension tables owned by `supabase_admin` (479 objects)
- 🟢 **LOW:** Service-specific tables owned by dedicated admins (auth, storage, functions)

**Best Practice Violation:** Application tables should NOT be owned by superuser-equivalent roles. A dedicated application role with minimal privileges should own application tables.

---

## Detailed Analysis

### Public Schema Tables (62 total)

All public tables have RLS enabled with appropriate policies. No tables are missing RLS protection.

**System/Infrastructure Tables with RLS:**

- `audit_logs`, `security_audit_log`, `system_audit_logs`
- `blocked_ips`, `rate_limit_violations`
- `maintenance_logs`, `system_health`, `system_health_checks`
- `database_backups`

**Application Tables with RLS:**

- **User Management:** `users`, `user_mfa`, `user_mfa_methods`, `user_mfa_settings`, `trusted_devices`
- **Coach/Client:** `coach_profiles`, `coach_availability`, `coach_notes`, `client_goals`, `goal_milestones`
- **Sessions:** `sessions`, `session_feedback`, `session_ratings`, `session_files`
- **Messaging:** `conversations`, `conversation_participants`, `messages`, `message_attachments`, `message_reactions`, `message_read_receipts`, `typing_indicators`
- **Files:** `file_uploads`, `file_versions`, `file_shares`, `file_version_shares`, `file_version_comparisons`, `file_download_logs`, `file_analytics_summary`, `file_security_events`, `quarantined_files`, `virus_scan_logs`, `virus_scan_cache`
- **Notifications:** `notifications`, `notification_preferences`, `notification_templates`, `notification_jobs`, `notification_delivery_logs`, `scheduled_notifications`, `push_subscriptions`
- **Other:** `payments`, `reflections`, `practice_journal_entries`, `temporary_file_shares`, `temporary_share_access_logs`, `user_download_statistics`, `mfa_*` tables

---

## Remediation Plan

### Priority 1: Remove/Restrict High-Risk SECURITY DEFINER Functions

#### Issue 1.1: HTTP Functions (CRITICAL)

**Risk:** SSRF, data exfiltration, privilege escalation

**Affected Functions:**

- `net.http_get()`
- `net.http_post()`
- `net.http_delete()`

**Remediation Options:**

**Option A (RECOMMENDED): Revoke Public Execute**

```sql
-- Revoke execute from public and authenticated roles
REVOKE EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) FROM anon;

-- Grant only to specific trusted roles/functions if needed
-- GRANT EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) TO your_trusted_service_role;
```

**Rollback:**

```sql
GRANT EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) TO PUBLIC;
```

**Option B (SAFEST): Disable Extension**

```sql
-- If you're not using these HTTP functions
DROP EXTENSION IF EXISTS http CASCADE;
```

**Testing:**

1. As `authenticated` user, try: `SELECT net.http_get('https://example.com');`
2. Should receive: `permission denied for function http_get`

---

#### Issue 1.2: Vault/Secret Functions (HIGH RISK)

**Risk:** Unauthorized access to secrets

**Affected Functions:**

- `vault.create_secret()`
- `vault.update_secret()`
- `pgsodium.*` encryption functions

**Remediation:**

```sql
-- Audit current permissions
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  array_agg(r.rolname) as has_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_proc_acl_explode(p.oid) a ON true
LEFT JOIN pg_roles r ON a.grantee = r.oid
WHERE n.nspname = 'vault'
  AND p.proname IN ('create_secret', 'update_secret')
GROUP BY p.oid, p.proname;

-- Revoke from public if needed
REVOKE EXECUTE ON FUNCTION vault.create_secret(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION vault.create_secret(text, text, text) FROM authenticated;
```

**Testing:**

1. As authenticated user, try creating a secret
2. Should fail with permission denied

---

### Priority 2: Tighten Overly Permissive Policies

#### Issue 2.1: Public Coach Availability Access

**Current Policy:**

```sql
CREATE POLICY "Anyone can view coach availability"
ON public.coach_availability
FOR SELECT
TO public
USING (true);
```

**Risk:** Unauthenticated users can view all coach availability

**Analysis:** This might be intentional for a marketplace-style booking system. Evaluate if this is the desired behavior.

**If NOT Desired - Remediation:**

```sql
-- Drop the overly permissive policy
DROP POLICY "Anyone can view coach availability" ON public.coach_availability;

-- Create restricted policy
CREATE POLICY "Authenticated users can view coach availability"
ON public.coach_availability
FOR SELECT
TO authenticated
USING (
  -- Option A: All authenticated users can view
  auth.role() = 'authenticated'

  -- OR Option B: Only clients can view availability
  -- EXISTS (
  --   SELECT 1 FROM users
  --   WHERE users.id = auth.uid()
  --   AND users.role = 'client'
  -- )
);
```

**Rollback:**

```sql
DROP POLICY "Authenticated users can view coach availability" ON public.coach_availability;
CREATE POLICY "Anyone can view coach availability"
ON public.coach_availability
FOR SELECT
TO public
USING (true);
```

**Testing:**

```sql
-- Test as unauthenticated (should fail)
SET ROLE anon;
SELECT * FROM coach_availability; -- Should return 0 rows or permission denied

-- Test as authenticated client
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "client-user-id", "role": "authenticated"}';
SELECT * FROM coach_availability; -- Should succeed
```

---

#### Issue 2.2: Unrestricted File Download Logs

**Current Policy:**

```sql
CREATE POLICY "Service can insert download logs"
ON public.file_download_logs
FOR INSERT
TO public
WITH CHECK (true);
```

**Risk:** Anyone can insert arbitrary download logs

**Remediation:**

```sql
-- Drop overly permissive policy
DROP POLICY "Service can insert download logs" ON public.file_download_logs;

-- Create restricted policy
CREATE POLICY "Authenticated users can log their downloads"
ON public.file_download_logs
FOR INSERT
TO authenticated
WITH CHECK (
  downloaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM file_uploads fu
    WHERE fu.id = file_download_logs.file_id
    AND (
      fu.user_id = auth.uid() -- Owner
      OR EXISTS ( -- Has share access
        SELECT 1 FROM file_shares fs
        WHERE fs.file_id = fu.id
        AND fs.shared_with = auth.uid()
        AND (fs.expires_at IS NULL OR fs.expires_at > now())
      )
    )
  )
);
```

**Rollback:**

```sql
DROP POLICY "Authenticated users can log their downloads" ON public.file_download_logs;
CREATE POLICY "Service can insert download logs"
ON public.file_download_logs
FOR INSERT
TO public
WITH CHECK (true);
```

---

### Priority 3: Implement Least-Privilege Object Ownership

#### Issue 3.1: Application Tables Owned by `postgres`

**Risk:** If `postgres` role is compromised, all application data is at risk

**Remediation:**

**Step 1: Create Dedicated Application Role**

```sql
-- Create a dedicated application owner role
CREATE ROLE loom_app_owner WITH NOLOGIN;

-- Grant minimal necessary privileges
GRANT USAGE ON SCHEMA public TO loom_app_owner;
GRANT USAGE ON SCHEMA auth TO loom_app_owner;  -- If needed
GRANT CREATE ON SCHEMA public TO loom_app_owner;

-- Allow creating tables and managing them
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO loom_app_owner;
```

**Step 2: Transfer Ownership (NON-DESTRUCTIVE)**

```sql
-- IMPORTANT: This requires explicit confirmation
-- Test in staging first!

-- Example for a single table:
ALTER TABLE public.users OWNER TO loom_app_owner;

-- To transfer all public tables (USE WITH CAUTION):
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO loom_app_owner', r.tablename);
        RAISE NOTICE 'Transferred ownership of table: %', r.tablename;
    END LOOP;
END $$;
```

**Rollback:**

```sql
-- Transfer back to postgres
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO postgres', r.tablename);
    END LOOP;
END $$;

-- Drop the role if not needed
DROP ROLE IF EXISTS loom_app_owner;
```

**Testing:**

1. Verify ownership change:

```sql
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

2. Test that RLS policies still work correctly
3. Test that application can still query tables

---

### Priority 4: Audit and Harden Policies

#### Issue 4.1: Review Policies Using `auth.jwt()`

Several policies use `auth.jwt() ->> 'role'` instead of checking the `users.role` column:

- `coach_availability`: "Admins can manage all availability"
- `coach_availability`: "Coaches can manage their own availability"

**Risk:** JWT claims can be manipulated if not properly validated

**Recommended Pattern:**

```sql
-- LESS SECURE: Relies on JWT claims
(auth.jwt() ->> 'role') = 'admin'

-- MORE SECURE: Check database
EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role = 'admin'
)
```

**Remediation:** Already implemented correctly in most policies. Verify these specific policies match the application's security model.

---

## Testing & Validation Plan

### Test Scenarios

#### 1. SECURITY DEFINER Function Access

```sql
-- Test as anonymous user
SET ROLE anon;
SELECT net.http_get('https://example.com'); -- Should fail

-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "test-user-id", "role": "authenticated"}';
SELECT net.http_get('https://example.com'); -- Should fail

-- Test as service role (if needed for legitimate use)
SET ROLE service_role;
SELECT net.http_get('https://example.com'); -- May succeed if granted
```

#### 2. RLS Policy Verification

```sql
-- Test coach availability visibility
SET ROLE anon;
SELECT COUNT(*) FROM coach_availability; -- Should be 0 if policy updated

SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "client-123", "role": "authenticated"}';
SELECT COUNT(*) FROM coach_availability; -- Should return results if authenticated access allowed
```

#### 3. Cross-User Data Access

```sql
-- Test that users can't access others' data
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-1", "role": "authenticated"}';
SELECT * FROM file_uploads WHERE user_id = 'user-2'; -- Should return 0 rows
```

---

## Monitoring & Detection

### 1. Create Audit Log for Security Events

```sql
CREATE TABLE IF NOT EXISTS public.security_definer_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_schema text NOT NULL,
  function_name text NOT NULL,
  executed_by uuid REFERENCES auth.users(id),
  executed_at timestamptz DEFAULT now(),
  parameters jsonb,
  result jsonb,
  error text
);

-- RLS for audit table
ALTER TABLE public.security_definer_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all security events"
ON public.security_definer_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
```

### 2. Alert on Suspicious Function Calls

```sql
-- Create a function to detect suspicious patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_security_definer_calls()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Alert if HTTP functions are called with external URLs
  IF NEW.function_name IN ('http_get', 'http_post', 'http_delete') THEN
    PERFORM pg_notify('security_alert', json_build_object(
      'type', 'suspicious_http_call',
      'user', auth.uid(),
      'function', NEW.function_name,
      'timestamp', now()
    )::text);
  END IF;

  RETURN NEW;
END;
$$;

-- Note: Actual implementation would require instrumenting the functions
```

### 3. Regular Automated Checks

Create a monitoring script to run periodically:

```sql
-- Check for new SECURITY DEFINER functions
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  r.rolname AS owner,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.prosecdef = true
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND p.proname NOT IN (
    -- Whitelist of known/approved SECURITY DEFINER functions
    'get_schema_version', 'increment_schema_version'
  )
ORDER BY n.nspname, p.proname;

-- Check for tables with RLS disabled
SELECT
  n.nspname AS schema,
  c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relrowsecurity = false;

-- Check for policies with 'true' qual
SELECT
  schemaname,
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR qual IS NULL);
```

---

## Implementation Checklist

### Pre-Deployment

- [ ] Review this audit report with security team
- [ ] Test all remediation SQL in staging environment
- [ ] Document any intentional security decisions (e.g., public coach availability)
- [ ] Create database backup before making changes
- [ ] Prepare rollback scripts

### Deployment (Per-Change Confirmation Required)

- [ ] **Phase 1:** Revoke execute on HTTP functions (`net.http_*`)
  - [ ] Run remediation SQL
  - [ ] Test application functionality
  - [ ] Monitor for errors
  - [ ] Rollback if issues detected

- [ ] **Phase 2:** Update overly-permissive RLS policies
  - [ ] Update `coach_availability` policy (if appropriate)
  - [ ] Update `file_download_logs` policy
  - [ ] Test as different user roles
  - [ ] Verify no data leakage

- [ ] **Phase 3:** Transfer object ownership (OPTIONAL - requires approval)
  - [ ] Create `loom_app_owner` role
  - [ ] Transfer ownership of test tables
  - [ ] Verify RLS still works
  - [ ] Transfer remaining tables if successful

- [ ] **Phase 4:** Implement monitoring
  - [ ] Create audit logging tables
  - [ ] Set up alerts for suspicious activity
  - [ ] Schedule regular security checks

### Post-Deployment

- [ ] Run full test suite
- [ ] Monitor application logs for permission errors
- [ ] Review audit logs for unexpected patterns
- [ ] Document final state in security documentation

---

## Summary of Recommendations

### CRITICAL (Immediate Action Required)

1. ✅ **Revoke public execute on `net.http_*` functions** - Prevents SSRF attacks
2. ✅ **Review and restrict overly-permissive policies** - Prevents data leakage

### HIGH PRIORITY (Within 1 week)

3. ✅ **Implement least-privilege object ownership** - Reduces blast radius of compromise
4. ✅ **Audit vault/secrets function access** - Protects sensitive data

### MEDIUM PRIORITY (Within 1 month)

5. ✅ **Set up security monitoring and alerting** - Detects future issues
6. ✅ **Standardize policy patterns** - Use database role checks instead of JWT claims
7. ✅ **Document security decisions** - Maintain security posture over time

### LOW PRIORITY (Ongoing)

8. ✅ **Regular automated security audits** - CI/CD integration
9. ✅ **Security training for developers** - Prevent future issues
10. ✅ **Penetration testing** - Validate security controls

---

## Appendix: Raw Discovery Data

### SECURITY DEFINER Functions by Schema

- **graphql:** 2 functions (schema management)
- **net:** 20+ functions (HTTP, DNS, networking)
- **vault:** 10+ functions (secrets management)
- **pgsodium:** 30+ functions (encryption)
- **auth:** 20+ functions (authentication)
- **storage:** 10+ functions (file storage)
- **realtime:** 5+ functions (real-time subscriptions)

### Full List Available On Request

Run the discovery queries from the audit to get complete listings.

---

## Contact & Next Steps

**Questions?** Contact your database administrator or security team.

**Ready to proceed?** Request explicit confirmation for each remediation phase before execution.

---

**End of Security Audit Report**
