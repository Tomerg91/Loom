-- ============================================================================
-- CRITICAL SECURITY FIX: Enable RLS on query_performance_metrics Table
-- ============================================================================
-- Migration: 20251119000002_fix_query_performance_metrics_rls.sql
-- Date: 2025-11-19
-- Priority: HIGH
--
-- ISSUE: query_performance_metrics table lacks Row Level Security (RLS),
--        exposing sensitive performance data to all authenticated users.
--
-- RISK: Any authenticated user can:
--       - View query patterns via query_hash
--       - Analyze execution times (timing attack data)
--       - Access metadata JSONB that may contain PII or business logic
--       - Reverse-engineer application behavior from performance patterns
--
-- TABLE: query_performance_metrics
-- CREATED IN: supabase/migrations/20251110000000_issue_151_performance_validation.sql
--
-- FIX: Enable RLS and create admin-only SELECT policies
--      Allow service_role to INSERT for automated monitoring
--
-- REFERENCE: Audit Report - 98.9% RLS coverage (92/93 tables)
--           This is the ONLY table missing RLS protection
-- ============================================================================

-- Log the security fix to audit trail
INSERT INTO public.security_audit_log (
  event_type,
  event_details,
  severity,
  timestamp
) VALUES (
  'critical_security_fix',
  jsonb_build_object(
    'migration', '20251119000002_fix_query_performance_metrics_rls',
    'issue', 'Missing Row Level Security on query_performance_metrics table',
    'risk_level', 'HIGH',
    'vulnerability', 'Data exposure - performance metrics visible to all users',
    'table', 'query_performance_metrics',
    'action', 'Enable RLS and create admin-only policies',
    'rls_coverage_before', '98.9% (92/93 tables)',
    'rls_coverage_after', '100% (93/93 tables)'
  ),
  'critical',
  NOW()
);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE query_performance_metrics ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE query_performance_metrics IS
  'Tracks historical query performance metrics for monitoring optimization effectiveness. ' ||
  'RLS ENABLED: Access restricted to admins only for security.';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Policy 1: Admins can view all performance metrics
CREATE POLICY "Admins can view performance metrics" ON query_performance_metrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

COMMENT ON POLICY "Admins can view performance metrics" ON query_performance_metrics IS
  'Allows administrators to view all query performance data for monitoring and optimization.';

-- Policy 2: Service role can insert metrics (for automated monitoring)
CREATE POLICY "Service role can insert metrics" ON query_performance_metrics
    FOR INSERT
    TO service_role
    WITH CHECK (true);

COMMENT ON POLICY "Service role can insert metrics" ON query_performance_metrics IS
  'Allows service_role to insert performance metrics from automated monitoring. ' ||
  'No user-facing inserts allowed - metrics are system-generated only.';

-- Policy 3: System functions can insert via SECURITY DEFINER
-- Note: The existing SECURITY DEFINER functions already have search_path protection
-- from migration 20251110000000 (they use SET search_path = 'pg_catalog', 'public')

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT to authenticated users, but RLS will restrict to admins
GRANT SELECT ON query_performance_metrics TO authenticated;

-- Grant INSERT to service_role for automated metric collection
GRANT INSERT ON query_performance_metrics TO service_role;

-- Ensure no other roles can insert rows (defense in depth with RLS policy)
REVOKE INSERT ON query_performance_metrics FROM authenticated;
REVOKE INSERT ON query_performance_metrics FROM anon;
REVOKE INSERT ON query_performance_metrics FROM public;

-- Grant USAGE on the sequence for inserts
GRANT USAGE, SELECT ON SEQUENCE query_performance_metrics_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE query_performance_metrics_id_seq TO authenticated;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify RLS is enabled:
--
-- SELECT
--   schemaname,
--   tablename,
--   rowsecurity AS rls_enabled
-- FROM pg_tables
-- WHERE tablename = 'query_performance_metrics';
--
-- Expected: rls_enabled = true
--
-- Run this to verify policies exist:
--
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'query_performance_metrics';
--
-- Expected: 2 policies (admins view, service_role insert)
-- ============================================================================

-- ============================================================================
-- TEST SCENARIOS
-- ============================================================================
-- Test 1: Non-admin user CANNOT view metrics
-- Execute as regular user: SELECT * FROM query_performance_metrics;
-- Expected: Empty result (RLS blocks access)
--
-- Test 2: Admin user CAN view metrics
-- Execute as admin: SELECT * FROM query_performance_metrics;
-- Expected: All records visible
--
-- Test 3: Service role CAN insert metrics
-- Execute as service_role:
-- INSERT INTO query_performance_metrics (query_type, query_hash, execution_time_ms)
-- VALUES ('test', 'hash123', 50);
-- Expected: Success
--
-- Test 4: Regular user CANNOT insert metrics
-- Execute as authenticated user:
-- INSERT INTO query_performance_metrics (query_type, query_hash, execution_time_ms)
-- VALUES ('test', 'hash456', 60);
-- Expected: Permission denied or policy violation
-- ============================================================================

-- Log completion
INSERT INTO public.security_audit_log (
  event_type,
  event_details,
  severity,
  timestamp
) VALUES (
  'security_hardening_complete',
  jsonb_build_object(
    'migration', '20251119000002_fix_query_performance_metrics_rls',
    'status', 'completed',
    'table', 'query_performance_metrics',
    'policies_created', 2,
    'rls_coverage', '100% (93/93 tables)',
    'impact', 'Performance metrics now protected - only admins can view sensitive query data'
  ),
  'info',
  NOW()
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The query_performance_metrics table is now fully protected with RLS.
-- Your database has achieved 100% RLS coverage across all 93 tables.
--
-- SECURITY IMPROVEMENTS:
-- ✅ Performance data hidden from non-admin users
-- ✅ Query patterns protected from reverse engineering
-- ✅ Execution timing data secured against timing attacks
-- ✅ Metadata JSONB contents restricted to authorized personnel
--
-- TESTING:
-- 1. Verify RLS is enabled: Check pg_tables.rowsecurity
-- 2. Test as non-admin user: Should see no records
-- 3. Test as admin user: Should see all records
-- 4. Monitor security_audit_log for policy violations
-- ============================================================================
