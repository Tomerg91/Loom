-- ============================================================================
-- CRITICAL SECURITY FIX: JWT Authentication Functions - search_path Protection
-- ============================================================================
-- Migration: 20251119000001_fix_jwt_auth_functions_search_path.sql
-- Date: 2025-11-19
-- Priority: CRITICAL
--
-- ISSUE: Five SECURITY DEFINER functions handling JWT tokens lack search_path
--        protection, exposing them to privilege escalation attacks.
--
-- RISK: Attacker could create malicious functions in user-controlled schemas
--       that shadow system functions (jsonb_set, jsonb_build_object, etc.)
--       allowing them to forge JWT tokens with arbitrary roles.
--
-- AFFECTED FUNCTIONS:
--   1. custom_access_token_hook(jsonb) - Generates JWT claims
--   2. update_user_auth_metadata(uuid, text) - Updates auth metadata
--   3. handle_user_role_change() - Trigger for role changes
--   4. sync_user_role_to_jwt(uuid) - Manual role sync
--   5. test_jwt_role_setup() - Test function
--
-- FIX: Apply search_path = 'pg_catalog', 'public', 'extensions' to all functions
--      This ensures only trusted schemas are searched for function calls.
--
-- REFERENCE: PostgreSQL Security Best Practices
--           https://www.postgresql.org/docs/current/sql-createfunction.html
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
    'migration', '20251119000001_fix_jwt_auth_functions_search_path',
    'issue', 'Missing search_path protection on JWT authentication functions',
    'risk_level', 'CRITICAL',
    'vulnerability', 'Privilege escalation via function shadowing',
    'functions_fixed', jsonb_build_array(
      'custom_access_token_hook',
      'update_user_auth_metadata',
      'handle_user_role_change',
      'sync_user_role_to_jwt',
      'test_jwt_role_setup'
    ),
    'action', 'Applied search_path protection to prevent function shadowing attacks'
  ),
  'critical',
  NOW()
);

-- ============================================================================
-- FUNCTION 1: custom_access_token_hook
-- ============================================================================
-- This function is called by Supabase Auth to generate JWT tokens
-- CRITICAL: Must not be vulnerable to function shadowing
ALTER FUNCTION public.custom_access_token_hook(jsonb)
  SET search_path = 'pg_catalog', 'public', 'extensions';

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'Adds user role from users table to JWT claims for RLS policies. ' ||
  'Must be configured as custom access token hook in Supabase Auth settings. ' ||
  'SECURITY: Protected with search_path to prevent privilege escalation.';

-- ============================================================================
-- FUNCTION 2: update_user_auth_metadata
-- ============================================================================
-- Updates auth.users metadata - direct access to auth schema
ALTER FUNCTION public.update_user_auth_metadata(uuid, text)
  SET search_path = 'pg_catalog', 'public', 'extensions';

COMMENT ON FUNCTION public.update_user_auth_metadata(uuid, text) IS
  'Updates auth.users metadata with role for immediate JWT claim updates. ' ||
  'SECURITY: Protected with search_path to prevent metadata poisoning.';

-- ============================================================================
-- FUNCTION 3: handle_user_role_change
-- ============================================================================
-- Trigger function that fires on role changes
ALTER FUNCTION public.handle_user_role_change()
  SET search_path = 'pg_catalog', 'public', 'extensions';

COMMENT ON FUNCTION public.handle_user_role_change() IS
  'Trigger function to sync role changes to auth metadata. ' ||
  'SECURITY: Protected with search_path to prevent privilege escalation during role changes.';

-- ============================================================================
-- FUNCTION 4: sync_user_role_to_jwt
-- ============================================================================
-- Manual sync function for troubleshooting
ALTER FUNCTION public.sync_user_role_to_jwt(uuid)
  SET search_path = 'pg_catalog', 'public', 'extensions';

COMMENT ON FUNCTION public.sync_user_role_to_jwt(uuid) IS
  'Manually syncs a specific user role to auth metadata for JWT claims. ' ||
  'SECURITY: Protected with search_path to prevent unauthorized role modifications.';

-- ============================================================================
-- FUNCTION 5: test_jwt_role_setup
-- ============================================================================
-- Test function for JWT configuration
ALTER FUNCTION public.test_jwt_role_setup()
  SET search_path = 'pg_catalog', 'public', 'extensions';

COMMENT ON FUNCTION public.test_jwt_role_setup() IS
  'Tests JWT role configuration setup and returns status of all components. ' ||
  'SECURITY: Protected with search_path for secure configuration validation.';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify all functions now have search_path protection:
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
--   AND p.proname IN (
--     'custom_access_token_hook',
--     'update_user_auth_metadata',
--     'handle_user_role_change',
--     'sync_user_role_to_jwt',
--     'test_jwt_role_setup'
--   )
--   AND p.prosecdef = true
-- ORDER BY p.proname;
--
-- Expected: All 5 functions should have config_settings containing search_path
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
    'migration', '20251119000001_fix_jwt_auth_functions_search_path',
    'status', 'completed',
    'functions_hardened', 5,
    'next_steps', 'Monitor JWT generation and verify no unauthorized access attempts'
  ),
  'info',
  NOW()
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All 5 JWT authentication functions are now protected against privilege
-- escalation attacks via function shadowing.
--
-- TESTING:
-- 1. Verify functions still work: SELECT * FROM test_jwt_role_setup();
-- 2. Test authentication flow with different roles
-- 3. Monitor security_audit_log for any issues
--
-- ROLLBACK: If needed, these ALTER FUNCTION commands can be reverted, but
--           leaving functions unprotected is NOT RECOMMENDED.
-- ============================================================================
