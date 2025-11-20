-- ============================================================================
-- CRITICAL SECURITY FIX: Messaging Access Control Function - search_path Protection
-- ============================================================================
-- Migration: 20251119000003_fix_messaging_access_control_search_path.sql
-- Date: 2025-11-19
-- Priority: CRITICAL
--
-- ISSUE: can_user_message_user() SECURITY DEFINER function lacks search_path
--        protection, exposing messaging access control to manipulation.
--
-- RISK: Attacker could create malicious functions in user-controlled schemas
--       that shadow system functions used for access control checks, allowing
--       unauthorized messaging access by bypassing coach-client relationship
--       validation.
--
-- FUNCTION: can_user_message_user(sender_id UUID, recipient_id UUID)
-- PURPOSE: Determines if a user is authorized to message another user
-- CREATED IN: supabase/migrations/20250809000002_messaging_rls_policies.sql
--
-- FIX: Apply search_path = 'pg_catalog', 'public' to prevent function shadowing
--
-- REFERENCE: OWASP Top 10 - Broken Access Control
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
    'migration', '20251119000003_fix_messaging_access_control_search_path',
    'issue', 'Missing search_path protection on messaging access control function',
    'risk_level', 'CRITICAL',
    'vulnerability', 'Privilege escalation via function shadowing in messaging system',
    'function', 'can_user_message_user',
    'action', 'Applied search_path protection to prevent unauthorized message access',
    'impact', 'Prevents attackers from bypassing coach-client relationship validation'
  ),
  'critical',
  NOW()
);

-- ============================================================================
-- FIX: can_user_message_user Function
-- ============================================================================
-- This function controls WHO can message WHOM in the entire messaging system.
-- It validates:
--   1. Admin users can message anyone
--   2. Coach-client relationships via active sessions
--   3. Existing conversation participants
--
-- Without search_path protection, an attacker could:
--   - Shadow EXISTS() or other SQL functions
--   - Bypass coach-client relationship checks
--   - Send unauthorized messages to any user

ALTER FUNCTION public.can_user_message_user(UUID, UUID)
  SET search_path = 'pg_catalog', 'public';

COMMENT ON FUNCTION public.can_user_message_user(UUID, UUID) IS
  'Determines if a user is authorized to message another user. ' ||
  'Validates admin privileges, coach-client relationships, and existing conversations. ' ||
  'SECURITY: Protected with search_path to prevent access control bypass via function shadowing. ' ||
  'Used by messaging RLS policies to enforce proper message access.';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the function now has search_path protection:
--
-- SELECT
--   p.proname AS function_name,
--   pg_get_function_identity_arguments(p.oid) AS arguments,
--   p.prosecdef AS is_security_definer,
--   pg_get_function_result(p.oid) AS return_type,
--   (SELECT array_agg(unnest) FROM unnest(p.proconfig)) AS config_settings
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.proname = 'can_user_message_user'
--   AND p.prosecdef = true;
--
-- Expected: config_settings should contain search_path
-- ============================================================================

-- ============================================================================
-- TEST SCENARIOS
-- ============================================================================
-- Test 1: Coach can message their client
-- SELECT can_user_message_user(
--   '00000000-0000-0000-0000-000000000001'::UUID, -- coach_id
--   '00000000-0000-0000-0000-000000000002'::UUID  -- client_id
-- );
-- Expected: true (if they have an active session)
--
-- Test 2: Random user cannot message unrelated user
-- SELECT can_user_message_user(
--   '00000000-0000-0000-0000-000000000003'::UUID, -- random_user_1
--   '00000000-0000-0000-0000-000000000004'::UUID  -- random_user_2
-- );
-- Expected: false (no relationship)
--
-- Test 3: Admin can message anyone
-- SELECT can_user_message_user(
--   'admin-user-uuid'::UUID,
--   'any-user-uuid'::UUID
-- );
-- Expected: true (admin bypass)
--
-- Test 4: Existing conversation participants can continue messaging
-- (Create a conversation between two users, then test)
-- Expected: true (existing conversation)
-- ============================================================================

-- ============================================================================
-- ATTACK SCENARIO PREVENTED
-- ============================================================================
-- BEFORE FIX (Vulnerable):
-- 1. Attacker creates malicious schema with function shadowing:
--    CREATE SCHEMA malicious;
--    CREATE FUNCTION malicious.exists(...) RETURNS BOOLEAN AS $$
--      BEGIN RETURN TRUE; END; -- Always return true!
--    $$ LANGUAGE plpgsql;
--
-- 2. Attacker manipulates search_path:
--    SET search_path = malicious, public;
--
-- 3. can_user_message_user() would call malicious.exists() instead of pg_catalog.exists()
-- 4. Access control checks would always pass
-- 5. Attacker could message any user bypassing coach-client validation
--
-- AFTER FIX (Protected):
-- 1. search_path is explicitly set to 'pg_catalog', 'public'
-- 2. Function always calls pg_catalog.exists() (system catalog)
-- 3. Attacker's malicious functions are never called
-- 4. Access control checks work correctly
-- 5. Messaging permissions are properly enforced
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
    'migration', '20251119000003_fix_messaging_access_control_search_path',
    'status', 'completed',
    'function', 'can_user_message_user',
    'protection_applied', 'search_path = pg_catalog, public',
    'impact', 'Messaging access control now secure against function shadowing attacks',
    'priority_1_tasks_completed', '3 of 3 (JWT functions, RLS, messaging function)'
  ),
  'info',
  NOW()
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The can_user_message_user() function is now protected against privilege
-- escalation attacks via function shadowing.
--
-- PRIORITY 1 TASKS COMPLETED:
-- ✅ Task 1: Fixed JWT authentication functions (5 functions)
-- ✅ Task 2: Enabled RLS on query_performance_metrics table
-- ✅ Task 3: Fixed messaging access control function
--
-- NEXT STEPS:
-- - Priority 2: Batch fix remaining 90+ SECURITY DEFINER functions
-- - Priority 2: Add 23 missing foreign key indexes
-- - Priority 2: Fix non-idempotent ENUM alterations
--
-- TESTING:
-- 1. Verify function has search_path: Check pg_proc.proconfig
-- 2. Test messaging permissions with different user types
-- 3. Verify coach-client relationship validation works correctly
-- 4. Monitor security_audit_log for any access control violations
-- ============================================================================
