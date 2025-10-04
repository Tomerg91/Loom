-- ============================================================================
-- SUPABASE SECURITY REMEDIATION SCRIPTS
-- Generated: 2025-10-04
-- ============================================================================
--
-- IMPORTANT: DO NOT RUN THIS FILE DIRECTLY
-- Each section requires explicit confirmation and testing
-- Run each remediation block individually after review
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: REVOKE DANGEROUS SECURITY DEFINER FUNCTIONS
-- Priority: CRITICAL
-- Risk Level: HIGH
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1: Revoke HTTP Functions (SSRF Prevention)
-- ----------------------------------------------------------------------------
-- DANGER: This will prevent application code from making HTTP requests
-- Verify your application doesn't use these functions before proceeding

BEGIN;

-- Revoke execute from public
REVOKE EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION net.http_post(text, jsonb, jsonb, jsonb, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION net.http_delete(text, jsonb, jsonb, integer) FROM PUBLIC;

-- Revoke from authenticated users
REVOKE EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION net.http_post(text, jsonb, jsonb, jsonb, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION net.http_delete(text, jsonb, jsonb, integer) FROM authenticated;

-- Revoke from anonymous users
REVOKE EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION net.http_post(text, jsonb, jsonb, jsonb, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION net.http_delete(text, jsonb, jsonb, integer) FROM anon;

-- Optional: Grant to specific trusted service role only
-- GRANT EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) TO service_role;

COMMIT;

-- ROLLBACK SCRIPT for 1.1:
/*
BEGIN;
GRANT EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION net.http_post(text, jsonb, jsonb, jsonb, integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION net.http_delete(text, jsonb, jsonb, integer) TO PUBLIC;
COMMIT;
*/

-- TEST SCRIPT for 1.1:
-- Run as authenticated user - should fail
-- SET ROLE authenticated;
-- SELECT net.http_get('https://example.com'); -- Expected: permission denied

-- ----------------------------------------------------------------------------
-- 1.2: Audit Vault/Secrets Functions
-- ----------------------------------------------------------------------------
-- Query current permissions on vault functions

SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  ARRAY(
    SELECT r.rolname
    FROM pg_proc_acl_explode(p.oid) a
    JOIN pg_roles r ON a.grantee = r.oid
    WHERE a.privilege_type = 'EXECUTE'
  ) AS roles_with_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'vault'
  AND p.prosecdef = true
ORDER BY p.proname;

-- If you find public has access, revoke it:
-- BEGIN;
-- REVOKE EXECUTE ON FUNCTION vault.create_secret(text, text, text) FROM PUBLIC;
-- REVOKE EXECUTE ON FUNCTION vault.update_secret(uuid, text, text, text) FROM PUBLIC;
-- COMMIT;

-- ============================================================================
-- PHASE 2: TIGHTEN OVERLY-PERMISSIVE RLS POLICIES
-- Priority: CRITICAL
-- Risk Level: MEDIUM to HIGH
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1: Restrict Public Coach Availability Access
-- ----------------------------------------------------------------------------
-- Current: Anyone (including unauthenticated) can view all coach availability
-- New: Only authenticated users can view

-- OPTION A: Require authentication (recommended for most apps)
BEGIN;

DROP POLICY IF EXISTS "Anyone can view coach availability" ON public.coach_availability;

CREATE POLICY "Authenticated users can view coach availability"
ON public.coach_availability
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

COMMIT;

-- ROLLBACK SCRIPT for 2.1:
/*
BEGIN;
DROP POLICY IF EXISTS "Authenticated users can view coach availability" ON public.coach_availability;
CREATE POLICY "Anyone can view coach availability"
ON public.coach_availability
FOR SELECT
TO public
USING (true);
COMMIT;
*/

-- TEST SCRIPT for 2.1:
-- Test as anonymous user - should return 0 rows
-- SET ROLE anon;
-- SELECT COUNT(*) FROM coach_availability; -- Expected: 0

-- Test as authenticated user - should succeed
-- SET ROLE authenticated;
-- SET request.jwt.claims TO '{"sub": "test-user-id", "role": "authenticated"}';
-- SELECT COUNT(*) FROM coach_availability; -- Expected: > 0

-- OPTION B: Keep public access if this is a marketplace feature
-- (No changes needed - just document the decision)
-- Security Decision: Public coach availability is intentional for marketplace
-- Documented: [DATE] by [PERSON]


-- ----------------------------------------------------------------------------
-- 2.2: Restrict File Download Logs
-- ----------------------------------------------------------------------------
-- Current: Anyone can insert arbitrary download logs
-- New: Only authenticated users can log their own downloads

BEGIN;

DROP POLICY IF EXISTS "Service can insert download logs" ON public.file_download_logs;

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
      fu.user_id = auth.uid() -- Owner can download
      OR EXISTS ( -- Or has share access
        SELECT 1 FROM file_shares fs
        WHERE fs.file_id = fu.id
        AND fs.shared_with = auth.uid()
        AND (fs.expires_at IS NULL OR fs.expires_at > now())
      )
    )
  )
);

COMMIT;

-- ROLLBACK SCRIPT for 2.2:
/*
BEGIN;
DROP POLICY IF EXISTS "Authenticated users can log their downloads" ON public.file_download_logs;
CREATE POLICY "Service can insert download logs"
ON public.file_download_logs
FOR INSERT
TO public
WITH CHECK (true);
COMMIT;
*/

-- TEST SCRIPT for 2.2:
-- Test logging download for file you own
-- SET ROLE authenticated;
-- SET request.jwt.claims TO '{"sub": "user-1-id", "role": "authenticated"}';
-- INSERT INTO file_download_logs (file_id, downloaded_by, downloaded_at)
-- VALUES ('file-owned-by-user-1', 'user-1-id', now()); -- Should succeed

-- Test logging download for file you don't own (should fail)
-- INSERT INTO file_download_logs (file_id, downloaded_by, downloaded_at)
-- VALUES ('file-owned-by-user-2', 'user-1-id', now()); -- Expected: new row violates RLS


-- ============================================================================
-- PHASE 3: IMPLEMENT LEAST-PRIVILEGE OBJECT OWNERSHIP (OPTIONAL)
-- Priority: HIGH
-- Risk Level: MEDIUM
-- Requires explicit approval from DBA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1: Create Dedicated Application Owner Role
-- ----------------------------------------------------------------------------

BEGIN;

-- Create dedicated application owner role (non-login)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'loom_app_owner') THEN
    CREATE ROLE loom_app_owner WITH NOLOGIN;
  END IF;
END $$;

-- Grant necessary schema permissions
GRANT USAGE ON SCHEMA public TO loom_app_owner;
GRANT CREATE ON SCHEMA public TO loom_app_owner;

-- Grant auth schema access if needed
GRANT USAGE ON SCHEMA auth TO loom_app_owner;

-- Allow the role to create and manage objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO loom_app_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO loom_app_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO loom_app_owner;

COMMIT;

-- ----------------------------------------------------------------------------
-- 3.2: Transfer Table Ownership (REQUIRES EXPLICIT CONFIRMATION)
-- ----------------------------------------------------------------------------
-- DANGER: This changes ownership of application tables
-- TEST IN STAGING FIRST
-- Verify RLS policies continue to work after ownership change

-- Option A: Transfer single table (for testing)
-- BEGIN;
-- ALTER TABLE public.users OWNER TO loom_app_owner;
-- COMMIT;

-- Option B: Transfer all public tables
-- ONLY RUN AFTER TESTING OPTION A SUCCESSFULLY

-- BEGIN;
--
-- DO $$
-- DECLARE
--     r RECORD;
-- BEGIN
--     FOR r IN
--         SELECT tablename
--         FROM pg_tables
--         WHERE schemaname = 'public'
--           AND tableowner = 'postgres'
--     LOOP
--         EXECUTE format('ALTER TABLE public.%I OWNER TO loom_app_owner', r.tablename);
--         RAISE NOTICE 'Transferred ownership of table: %', r.tablename;
--     END LOOP;
-- END $$;
--
-- COMMIT;

-- ROLLBACK SCRIPT for 3.2:
/*
BEGIN;
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tableowner = 'loom_app_owner'
    LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO postgres', r.tablename);
        RAISE NOTICE 'Restored ownership of table: %', r.tablename;
    END LOOP;
END $$;
COMMIT;

-- Optionally drop the role
-- DROP ROLE IF EXISTS loom_app_owner;
*/

-- TEST SCRIPT for 3.2:
-- Verify ownership changed
/*
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
*/

-- Test that RLS policies still work
-- SET ROLE authenticated;
-- SET request.jwt.claims TO '{"sub": "test-user-id", "role": "authenticated"}';
-- SELECT * FROM users WHERE id = 'test-user-id'; -- Should succeed
-- SELECT * FROM users WHERE id = 'other-user-id'; -- Should be blocked by RLS


-- ============================================================================
-- PHASE 4: MONITORING & DETECTION
-- Priority: MEDIUM
-- Risk Level: LOW
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1: Create Security Event Audit Table
-- ----------------------------------------------------------------------------

BEGIN;

CREATE TABLE IF NOT EXISTS public.security_definer_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  function_schema text,
  function_name text,
  executed_by uuid,
  executed_at timestamptz DEFAULT now(),
  parameters jsonb,
  result jsonb,
  error_message text,
  source_ip inet,
  user_agent text
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_security_definer_audit_executed_at
  ON public.security_definer_audit(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_definer_audit_executed_by
  ON public.security_definer_audit(executed_by);
CREATE INDEX IF NOT EXISTS idx_security_definer_audit_event_type
  ON public.security_definer_audit(event_type);

-- Enable RLS
ALTER TABLE public.security_definer_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view security audit logs
CREATE POLICY "Admins can view all security audit events"
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

-- System/service role can insert audit events
CREATE POLICY "System can insert security audit events"
ON public.security_definer_audit
FOR INSERT
TO service_role
WITH CHECK (true);

COMMIT;

-- ----------------------------------------------------------------------------
-- 4.2: Create Security Monitoring Views
-- ----------------------------------------------------------------------------

-- View: Recent suspicious activity
CREATE OR REPLACE VIEW public.v_recent_security_events AS
SELECT
  event_type,
  function_schema,
  function_name,
  executed_by,
  executed_at,
  error_message,
  source_ip
FROM public.security_definer_audit
WHERE executed_at > now() - interval '24 hours'
ORDER BY executed_at DESC;

-- View: Current SECURITY DEFINER functions (for monitoring)
CREATE OR REPLACE VIEW public.v_security_definer_functions AS
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  r.rolname AS owner,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  obj_description(p.oid, 'pg_proc') AS description,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.prosecdef = true
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, p.proname;

-- View: Tables without RLS
CREATE OR REPLACE VIEW public.v_tables_without_rls AS
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  r.rolname AS owner,
  'WARNING: RLS is disabled' AS status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_roles r ON c.relowner = r.oid
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relrowsecurity = false
ORDER BY n.nspname, c.relname;

-- View: Overly permissive policies
CREATE OR REPLACE VIEW public.v_permissive_policies AS
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual IS NULL OR qual = 'true' THEN 'UNRESTRICTED'
    WHEN qual LIKE '%service_role%' THEN 'SERVICE_ROLE'
    ELSE 'UNKNOWN'
  END AS risk_level,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual IS NULL OR qual = 'true' OR qual LIKE '%service_role%')
ORDER BY
  CASE
    WHEN qual IS NULL OR qual = 'true' THEN 1
    WHEN qual LIKE '%service_role%' THEN 2
    ELSE 3
  END;


-- ============================================================================
-- VALIDATION QUERIES
-- Run these after each phase to verify changes
-- ============================================================================

-- Verify HTTP functions are restricted
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS signature,
  ARRAY(
    SELECT r.rolname
    FROM pg_proc_acl_explode(p.oid) a
    JOIN pg_roles r ON a.grantee = r.oid
    WHERE a.privilege_type = 'EXECUTE'
  ) AS roles_with_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'net'
  AND p.proname LIKE 'http_%'
ORDER BY p.proname;

-- Verify RLS policies were updated
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles::text,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    tablename = 'coach_availability'
    OR tablename = 'file_download_logs'
  )
ORDER BY tablename, policyname;

-- Verify table ownership (if Phase 3 was run)
SELECT
  schemaname,
  tablename,
  tableowner,
  CASE
    WHEN tableowner IN ('postgres', 'supabase_admin') THEN 'HIGH_PRIVILEGE'
    WHEN tableowner = 'loom_app_owner' THEN 'DEDICATED_ROLE'
    ELSE 'OTHER'
  END AS owner_type
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY owner_type, tablename;

-- Check for tables without RLS
SELECT * FROM public.v_tables_without_rls;

-- Check for remaining permissive policies
SELECT * FROM public.v_permissive_policies;


-- ============================================================================
-- EMERGENCY ROLLBACK - USE ONLY IF SOMETHING GOES WRONG
-- ============================================================================

-- Rollback all changes (run each section in reverse order)

-- 1. Restore HTTP function permissions
-- BEGIN;
-- GRANT EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) TO PUBLIC;
-- GRANT EXECUTE ON FUNCTION net.http_post(text, jsonb, jsonb, jsonb, integer) TO PUBLIC;
-- GRANT EXECUTE ON FUNCTION net.http_delete(text, jsonb, jsonb, integer) TO PUBLIC;
-- COMMIT;

-- 2. Restore coach availability policy
-- BEGIN;
-- DROP POLICY IF EXISTS "Authenticated users can view coach availability" ON public.coach_availability;
-- CREATE POLICY "Anyone can view coach availability"
-- ON public.coach_availability FOR SELECT TO public USING (true);
-- COMMIT;

-- 3. Restore file download logs policy
-- BEGIN;
-- DROP POLICY IF EXISTS "Authenticated users can log their downloads" ON public.file_download_logs;
-- CREATE POLICY "Service can insert download logs"
-- ON public.file_download_logs FOR INSERT TO public WITH CHECK (true);
-- COMMIT;

-- 4. Restore table ownership (if changed)
-- BEGIN;
-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--     FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner = 'loom_app_owner'
--     LOOP
--         EXECUTE format('ALTER TABLE public.%I OWNER TO postgres', r.tablename);
--     END LOOP;
-- END $$;
-- COMMIT;


-- ============================================================================
-- END OF REMEDIATION SCRIPTS
-- ============================================================================
--
-- Next Steps:
-- 1. Review the SECURITY_AUDIT_REPORT.md for detailed analysis
-- 2. Test each phase in a staging environment
-- 3. Request explicit approval for each phase
-- 4. Execute phase-by-phase with validation after each step
-- 5. Monitor application logs for permission errors
-- 6. Update documentation with security decisions
--
-- ============================================================================
