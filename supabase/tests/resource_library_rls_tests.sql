-- ============================================================================
-- Resource Library RLS Tests
-- ============================================================================
-- Comprehensive test suite for resource library Row Level Security policies
--
-- Tests cover:
-- - Coach access to their own collections and resources
-- - Client access to shared resources
-- - Proper isolation between coaches
-- - Progress tracking permissions
--
-- Generated: 2025-10-21
-- Usage: psql -f supabase/tests/resource_library_rls_tests.sql
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Create test results table
CREATE TEMP TABLE rls_test_results (
  test_name TEXT,
  status TEXT,
  message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Setup test data
DO $$
DECLARE
  v_coach1_id UUID := gen_random_uuid();
  v_coach2_id UUID := gen_random_uuid();
  v_client1_id UUID := gen_random_uuid();
  v_client2_id UUID := gen_random_uuid();
  v_file1_id UUID := gen_random_uuid();
  v_file2_id UUID := gen_random_uuid();
  v_collection1_id UUID;
  v_collection2_id UUID;
  v_item_id UUID;
  v_can_insert BOOLEAN;
  v_row_count INTEGER;
BEGIN
  -- Create test users
  INSERT INTO users (id, email, role)
  VALUES
    (v_coach1_id, 'coach1@test.com', 'coach'),
    (v_coach2_id, 'coach2@test.com', 'coach'),
    (v_client1_id, 'client1@test.com', 'client'),
    (v_client2_id, 'client2@test.com', 'client')
  ON CONFLICT (id) DO NOTHING;

  -- Create test files (library resources)
  INSERT INTO file_uploads (id, user_id, filename, original_filename, storage_path, bucket_name, file_type, file_size, is_library_resource)
  VALUES
    (v_file1_id, v_coach1_id, 'resource1.pdf', 'resource1.pdf', '/coach1/resource1.pdf', 'documents', 'application/pdf', 1024, true),
    (v_file2_id, v_coach2_id, 'resource2.pdf', 'resource2.pdf', '/coach2/resource2.pdf', 'documents', 'application/pdf', 2048, true);

  -- ============================================================================
  -- TEST 1: Coach can create their own collection
  -- ============================================================================
  BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub = v_coach1_id::text;

    INSERT INTO resource_collections (coach_id, title, description)
    VALUES (v_coach1_id, 'Test Collection 1', 'Description')
    RETURNING id INTO v_collection1_id;

    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Coach can create collection',
      'PASS',
      format('Collection created: %s', v_collection1_id)
    );

    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Coach can create collection',
      'FAIL',
      format('Error: %s', SQLERRM)
    );
  END;

  -- ============================================================================
  -- TEST 2: Coach can add their files to their collection
  -- ============================================================================
  BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub = v_coach1_id::text;

    INSERT INTO resource_collection_items (collection_id, file_id, sort_order)
    VALUES (v_collection1_id, v_file1_id, 1)
    RETURNING id INTO v_item_id;

    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Coach can add files to collection',
      'PASS',
      format('Item added: %s', v_item_id)
    );

    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Coach can add files to collection',
      'FAIL',
      format('Error: %s', SQLERRM)
    );
  END;

  -- ============================================================================
  -- TEST 3: Coach CANNOT add another coach's files to their collection
  -- ============================================================================
  BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub = v_coach1_id::text;

    -- Try to add coach2's file to coach1's collection (should fail)
    INSERT INTO resource_collection_items (collection_id, file_id, sort_order)
    VALUES (v_collection1_id, v_file2_id, 2);

    -- If we get here, the test failed (should have raised exception)
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Coach CANNOT add other coach files',
      'FAIL',
      'Coach was able to add another coach file (security breach!)'
    );

  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Coach CANNOT add other coach files',
      'PASS',
      'Correctly prevented unauthorized file addition'
    );
  WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Coach CANNOT add other coach files',
      'FAIL',
      format('Unexpected error: %s', SQLERRM)
    );
  END;

  -- ============================================================================
  -- TEST 4: Coach can view their own collections
  -- ============================================================================
  BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub = v_coach1_id::text;

    SELECT COUNT(*) INTO v_row_count
    FROM resource_collections
    WHERE id = v_collection1_id;

    IF v_row_count = 1 THEN
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Coach can view own collections',
        'PASS',
        'Coach can see their collection'
      );
    ELSE
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Coach can view own collections',
        'FAIL',
        format('Expected 1 row, got %s', v_row_count)
      );
    END IF;

    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Coach can view own collections',
      'FAIL',
      format('Error: %s', SQLERRM)
    );
  END;

  -- ============================================================================
  -- TEST 5: Coach CANNOT view other coach's collections
  -- ============================================================================
  BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub = v_coach2_id::text;

    SELECT COUNT(*) INTO v_row_count
    FROM resource_collections
    WHERE id = v_collection1_id;

    IF v_row_count = 0 THEN
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Coach CANNOT view other collections',
        'PASS',
        'Correctly prevented viewing other coach collection'
      );
    ELSE
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Coach CANNOT view other collections',
        'FAIL',
        format('Security breach: coach2 can see coach1 collection (rows: %s)', v_row_count)
      );
    END IF;

    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Coach CANNOT view other collections',
      'FAIL',
      format('Error: %s', SQLERRM)
    );
  END;

  -- ============================================================================
  -- TEST 6: Share resource with client
  -- ============================================================================
  BEGIN
    -- Create file share (as admin/system)
    INSERT INTO file_shares (file_id, shared_by, shared_with)
    VALUES (v_file1_id, v_coach1_id, v_client1_id);

    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Create file share',
      'PASS',
      'File share created successfully'
    );

  EXCEPTION WHEN OTHERS THEN
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Create file share',
      'FAIL',
      format('Error: %s', SQLERRM)
    );
  END;

  -- ============================================================================
  -- TEST 7: Client can view shared resource
  -- ============================================================================
  BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub = v_client1_id::text;

    SELECT COUNT(*) INTO v_row_count
    FROM file_uploads
    WHERE id = v_file1_id;

    IF v_row_count = 1 THEN
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Client can view shared resource',
        'PASS',
        'Client can see shared resource'
      );
    ELSE
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Client can view shared resource',
        'FAIL',
        format('Expected 1 row, got %s', v_row_count)
      );
    END IF;

    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Client can view shared resource',
      'FAIL',
      format('Error: %s', SQLERRM)
    );
  END;

  -- ============================================================================
  -- TEST 8: Client CANNOT view non-shared resource
  -- ============================================================================
  BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub = v_client1_id::text;

    SELECT COUNT(*) INTO v_row_count
    FROM file_uploads
    WHERE id = v_file2_id;

    IF v_row_count = 0 THEN
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Client CANNOT view non-shared resource',
        'PASS',
        'Correctly prevented viewing non-shared resource'
      );
    ELSE
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Client CANNOT view non-shared resource',
        'FAIL',
        format('Security breach: client can see non-shared resource (rows: %s)', v_row_count)
      );
    END IF;

    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Client CANNOT view non-shared resource',
      'FAIL',
      format('Error: %s', SQLERRM)
    );
  END;

  -- ============================================================================
  -- TEST 9: Client can track their own progress
  -- ============================================================================
  BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub = v_client1_id::text;

    INSERT INTO resource_client_progress (client_id, file_id, viewed_at, access_count)
    VALUES (v_client1_id, v_file1_id, NOW(), 1);

    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Client can track own progress',
      'PASS',
      'Progress record created'
    );

    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Client can track own progress',
      'FAIL',
      format('Error: %s', SQLERRM)
    );
  END;

  -- ============================================================================
  -- TEST 10: Coach can view progress for their resources
  -- ============================================================================
  BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub = v_coach1_id::text;

    SELECT COUNT(*) INTO v_row_count
    FROM resource_client_progress
    WHERE file_id = v_file1_id
      AND client_id = v_client1_id;

    IF v_row_count = 1 THEN
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Coach can view client progress',
        'PASS',
        'Coach can see client progress for their resource'
      );
    ELSE
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Coach can view client progress',
        'FAIL',
        format('Expected 1 row, got %s', v_row_count)
      );
    END IF;

    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Coach can view client progress',
      'FAIL',
      format('Error: %s', SQLERRM)
    );
  END;

  -- ============================================================================
  -- TEST 11: Coach CANNOT view progress for other coach's resources
  -- ============================================================================
  BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub = v_coach2_id::text;

    SELECT COUNT(*) INTO v_row_count
    FROM resource_client_progress
    WHERE file_id = v_file1_id
      AND client_id = v_client1_id;

    IF v_row_count = 0 THEN
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Coach CANNOT view other coach progress',
        'PASS',
        'Correctly prevented viewing other coach progress'
      );
    ELSE
      INSERT INTO rls_test_results (test_name, status, message)
      VALUES (
        'Coach CANNOT view other coach progress',
        'FAIL',
        format('Security breach: coach2 can see coach1 progress (rows: %s)', v_row_count)
      );
    END IF;

    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO rls_test_results (test_name, status, message)
    VALUES (
      'Coach CANNOT view other coach progress',
      'FAIL',
      format('Error: %s', SQLERRM)
    );
  END;

  -- Cleanup test data
  DELETE FROM resource_client_progress WHERE client_id IN (v_client1_id, v_client2_id);
  DELETE FROM file_shares WHERE file_id IN (v_file1_id, v_file2_id);
  DELETE FROM resource_collection_items WHERE collection_id = v_collection1_id;
  DELETE FROM resource_collections WHERE id = v_collection1_id;
  DELETE FROM file_uploads WHERE id IN (v_file1_id, v_file2_id);
  DELETE FROM users WHERE id IN (v_coach1_id, v_coach2_id, v_client1_id, v_client2_id);

END $$;

-- ============================================================================
-- Display Test Results
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'RESOURCE LIBRARY RLS TEST RESULTS'
\echo '============================================================================'

SELECT
  test_name,
  status,
  message
FROM rls_test_results
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
  FROM rls_test_results;

  RAISE NOTICE '';
  RAISE NOTICE 'Total Tests: %', v_total;
  RAISE NOTICE 'Passed: %', v_passed;
  RAISE NOTICE 'Failed: %', v_failed;
  RAISE NOTICE 'Pass Rate: %%', ROUND(100.0 * v_passed / NULLIF(v_total, 0), 2);
  RAISE NOTICE '';

  IF v_failed > 0 THEN
    RAISE EXCEPTION 'Resource library RLS tests failed: % test(s) failed', v_failed;
  ELSE
    RAISE NOTICE 'All resource library RLS tests passed!';
  END IF;
END $$;

ROLLBACK;
