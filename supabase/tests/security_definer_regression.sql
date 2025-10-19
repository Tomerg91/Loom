-- ============================================================================
-- SECURITY DEFINER Regression Tests
-- ============================================================================
-- This test suite validates that all SECURITY DEFINER functions have proper
-- search_path settings and that RLS policies work correctly.
--
-- Generated: 2025-10-21
-- Usage: psql -f supabase/tests/security_definer_regression.sql
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Create a test results table
CREATE TEMP TABLE test_results (
  test_name TEXT,
  status TEXT,
  message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TEST 1: All SECURITY DEFINER functions must have SET search_path
-- ============================================================================

DO $$
DECLARE
  v_vulnerable_count INTEGER;
  v_function RECORD;
BEGIN
  SELECT COUNT(*) INTO v_vulnerable_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND prosecdef = true
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS setting(value)
      WHERE setting.value = 'search_path=pg_catalog, public, extensions'
    );

  IF v_vulnerable_count > 0 THEN
    -- List all vulnerable functions with their current configuration
    FOR v_function IN
      SELECT
        p.proname,
        pg_get_function_identity_arguments(p.oid) AS args,
        COALESCE(array_to_string(p.proconfig, ', '), '<unset>') AS config
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND prosecdef = true
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS setting(value)
          WHERE setting.value = 'search_path=pg_catalog, public, extensions'
        )
      LIMIT 10
    LOOP
      RAISE WARNING 'Vulnerable function: %(%) has config %',
        v_function.proname,
        v_function.args,
        v_function.config;
    END LOOP;

    INSERT INTO test_results (test_name, status, message)
    VALUES (
      'SECURITY DEFINER search_path check',
      'FAIL',
      format('%s functions missing search_path=pg_catalog, public, extensions', v_vulnerable_count)
    );
  ELSE
    INSERT INTO test_results (test_name, status, message)
    VALUES (
      'SECURITY DEFINER search_path check',
      'PASS',
      'All SECURITY DEFINER functions set search_path to pg_catalog, public, extensions'
    );
  END IF;
END $$;

-- ============================================================================
-- TEST 2: Resource Library RLS Policies
-- ============================================================================

-- Test that resource_collection_items policies reference correct columns
DO $$
DECLARE
  v_has_error BOOLEAN := false;
  v_policy RECORD;
BEGIN
  -- Check for policies referencing non-existent columns
  FOR v_policy IN
    SELECT policyname, pg_get_expr(polqual, polrelid) AS qual
    FROM pg_policy
    WHERE polrelid = 'resource_collection_items'::regclass
  LOOP
    IF v_policy.qual LIKE '%resource_id%' THEN
      v_has_error := true;
      RAISE WARNING 'Policy % references non-existent resource_id column', v_policy.policyname;
    END IF;
  END LOOP;

  IF v_has_error THEN
    INSERT INTO test_results (test_name, status, message)
    VALUES (
      'Resource library RLS column references',
      'FAIL',
      'Policies reference non-existent resource_id column'
    );
  ELSE
    INSERT INTO test_results (test_name, status, message)
    VALUES (
      'Resource library RLS column references',
      'PASS',
      'All policies reference valid columns'
    );
  END IF;
END $$;

-- ============================================================================
-- TEST 3: Resource Collection Items - Coach Access
-- ============================================================================

DO $$
DECLARE
  v_coach_id UUID := gen_random_uuid();
  v_collection_id UUID;
  v_file_id UUID := gen_random_uuid();
  v_item_id UUID;
BEGIN
  -- Create test coach user
  INSERT INTO users (id, email, role)
  VALUES (v_coach_id, 'test_coach@test.com', 'coach')
  ON CONFLICT (id) DO NOTHING;

  -- Create test collection
  INSERT INTO resource_collections (id, coach_id, title)
  VALUES (gen_random_uuid(), v_coach_id, 'Test Collection')
  RETURNING id INTO v_collection_id;

  -- Test: Coach should be able to add items to their collection
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub = v_coach_id::text;

  BEGIN
    INSERT INTO resource_collection_items (collection_id, file_id, sort_order)
    VALUES (v_collection_id, v_file_id, 1)
    RETURNING id INTO v_item_id;

    INSERT INTO test_results (test_name, status, message)
    VALUES (
      'Resource collection items - coach insert',
      'PASS',
      'Coach can add items to their collection'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results (test_name, status, message)
    VALUES (
      'Resource collection items - coach insert',
      'FAIL',
      format('Coach insert failed: %s', SQLERRM)
    );
  END;

  RESET ROLE;

  -- Cleanup
  DELETE FROM resource_collection_items WHERE id = v_item_id;
  DELETE FROM resource_collections WHERE id = v_collection_id;
  DELETE FROM users WHERE id = v_coach_id;
END $$;

-- ============================================================================
-- TEST 4: Push Subscriptions Table Exists
-- ============================================================================

DO $$
BEGIN
  PERFORM 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'push_subscriptions';

  IF FOUND THEN
    INSERT INTO test_results (test_name, status, message)
    VALUES (
      'Push subscriptions table existence',
      'PASS',
      'push_subscriptions table exists'
    );
  ELSE
    INSERT INTO test_results (test_name, status, message)
    VALUES (
      'Push subscriptions table existence',
      'FAIL',
      'push_subscriptions table is missing'
    );
  END IF;
END $$;

-- ============================================================================
-- TEST 5: MFA Column Existence
-- ============================================================================

DO $$
BEGIN
  PERFORM 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'mfa_enabled';

  IF FOUND THEN
    INSERT INTO test_results (test_name, status, message)
    VALUES (
      'Users.mfa_enabled column existence',
      'PASS',
      'users.mfa_enabled column exists (required by application)'
    );
  ELSE
    INSERT INTO test_results (test_name, status, message)
    VALUES (
      'Users.mfa_enabled column existence',
      'FAIL',
      'users.mfa_enabled column is missing but required by application'
    );
  END IF;
END $$;

-- ============================================================================
-- Display Test Results
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'TEST RESULTS SUMMARY'
\echo '============================================================================'

SELECT
  test_name,
  status,
  message,
  timestamp
FROM test_results
ORDER BY timestamp;

\echo ''
\echo '============================================================================'

-- Final summary
DO $$
DECLARE
  v_total INTEGER;
  v_passed INTEGER;
  v_failed INTEGER;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'PASS'),
    COUNT(*) FILTER (WHERE status = 'FAIL')
  INTO v_total, v_passed, v_failed
  FROM test_results;

  RAISE NOTICE '';
  RAISE NOTICE 'Total Tests: %', v_total;
  RAISE NOTICE 'Passed: %', v_passed;
  RAISE NOTICE 'Failed: %', v_failed;
  RAISE NOTICE '';

  IF v_failed > 0 THEN
    RAISE EXCEPTION 'Test suite failed: % test(s) failed', v_failed;
  ELSE
    RAISE NOTICE 'All tests passed!';
  END IF;
END $$;

ROLLBACK;
