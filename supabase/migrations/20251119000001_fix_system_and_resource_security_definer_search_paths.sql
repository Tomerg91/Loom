-- ============================================================================
-- Batch Fix: Security Definer Search Path for System & Resource Functions
-- ============================================================================
-- This migration adds SET search_path to SECURITY DEFINER functions
-- that were created without proper search path hardening.
--
-- Functions fixed:
--   - 10 functions from system_health_functions.sql
--   - 12 functions from resource_validation_functions.sql (already have search_path, verify/update)
--
-- Search path set to: 'pg_catalog', 'public', 'extensions'
-- This prevents unintended object resolution and closes potential security gaps.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  function_count INTEGER := 0;
  updated_count INTEGER := 0;
BEGIN
  -- List of all functions that need search_path hardening
  -- These will be updated in the loop below

  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN (
        -- System Health Functions (10)
        'check_connection',
        'get_active_connections',
        'get_database_size',
        'get_long_running_queries',
        'get_table_sizes',
        'get_system_statistics',
        'get_slow_queries',
        'maintenance_cleanup_old_data',
        'maintenance_optimize_tables',
        'get_index_usage_stats',

        -- Resource Validation Functions (12)
        'validate_orphaned_collection_items',
        'validate_non_library_collection_items',
        'validate_orphaned_progress_records',
        'validate_non_library_progress_records',
        'validate_empty_collections',
        'validate_duplicate_collection_items',
        'validate_ownership_mismatch',
        'validate_progress_without_shares',
        'validate_invalid_coach_references',
        'validate_invalid_client_references',
        'get_resource_library_statistics',
        'get_affected_coaches'
      )
  LOOP
    function_count := function_count + 1;

    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = ''pg_catalog'', ''public'', ''extensions'';',
        r.nspname, r.proname, r.args
      );
      updated_count := updated_count + 1;

      -- Log the update
      RAISE NOTICE 'Updated search_path for %.%(%)', r.nspname, r.proname, r.args;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to update search_path for %.%(%): %', r.nspname, r.proname, r.args, SQLERRM;
    END;
  END LOOP;

  -- Log completion
  RAISE NOTICE 'Search path hardening completed: % functions found, % functions updated', function_count, updated_count;

  IF updated_count = 0 THEN
    RAISE WARNING 'No functions were updated. This may indicate the functions are not present or already hardened.';
  END IF;
END;
$$;

-- ============================================================================
-- Verification Step
-- ============================================================================
-- Verify that all SECURITY DEFINER functions in public schema have search_path set

-- View all SECURITY DEFINER functions and their search_path settings
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  obj_description(p.oid, 'pg_proc') AS description,
  CASE
    WHEN p.proconfig IS NOT NULL AND p.proconfig @> ARRAY['search_path']
    THEN 'SET'
    ELSE 'NOT SET'
  END AS search_path_status,
  p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;
