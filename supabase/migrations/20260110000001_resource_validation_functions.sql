-- ============================================================================
-- Resource Library Validation RPC Functions
-- ============================================================================
-- This migration creates RPC functions for validating resource library data.
-- These functions are called by the admin API endpoint to check for
-- data inconsistencies and orphaned records.
--
-- Created: 2025-10-19
-- ============================================================================

-- ============================================================================
-- Check 1: Orphaned Collection Items
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_orphaned_collection_items()
RETURNS TABLE (
  issue_type TEXT,
  issue_count BIGINT,
  affected_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'ORPHANED_ITEMS'::TEXT AS issue_type,
    COUNT(*)::BIGINT AS issue_count,
    ARRAY_AGG(rci.id) AS affected_ids
  FROM resource_collection_items rci
  LEFT JOIN file_uploads fu ON fu.id = rci.file_id
  WHERE fu.id IS NULL;
END;
$$;

-- ============================================================================
-- Check 2: Non-Library Resources in Collections
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_non_library_collection_items()
RETURNS TABLE (
  issue_type TEXT,
  issue_count BIGINT,
  affected_collection_item_ids UUID[],
  affected_file_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'NON_LIBRARY_ITEMS'::TEXT AS issue_type,
    COUNT(*)::BIGINT AS issue_count,
    ARRAY_AGG(rci.id) AS affected_collection_item_ids,
    ARRAY_AGG(fu.id) AS affected_file_ids
  FROM resource_collection_items rci
  JOIN file_uploads fu ON fu.id = rci.file_id
  WHERE fu.is_library_resource = false OR fu.is_library_resource IS NULL;
END;
$$;

-- ============================================================================
-- Check 3: Orphaned Progress Records
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_orphaned_progress_records()
RETURNS TABLE (
  issue_type TEXT,
  issue_count BIGINT,
  affected_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'ORPHANED_PROGRESS'::TEXT AS issue_type,
    COUNT(*)::BIGINT AS issue_count,
    ARRAY_AGG(rcp.id) AS affected_ids
  FROM resource_client_progress rcp
  LEFT JOIN file_uploads fu ON fu.id = rcp.file_id
  WHERE fu.id IS NULL;
END;
$$;

-- ============================================================================
-- Check 4: Progress for Non-Library Resources
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_non_library_progress_records()
RETURNS TABLE (
  issue_type TEXT,
  issue_count BIGINT,
  affected_progress_ids UUID[],
  affected_file_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'NON_LIBRARY_PROGRESS'::TEXT AS issue_type,
    COUNT(*)::BIGINT AS issue_count,
    ARRAY_AGG(rcp.id) AS affected_progress_ids,
    ARRAY_AGG(fu.id) AS affected_file_ids
  FROM resource_client_progress rcp
  JOIN file_uploads fu ON fu.id = rcp.file_id
  WHERE fu.is_library_resource = false OR fu.is_library_resource IS NULL;
END;
$$;

-- ============================================================================
-- Check 5: Empty Collections (>7 days old)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_empty_collections()
RETURNS TABLE (
  issue_type TEXT,
  issue_count BIGINT,
  affected_collection_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'EMPTY_COLLECTIONS'::TEXT AS issue_type,
    COUNT(*)::BIGINT AS issue_count,
    ARRAY_AGG(rc.id) AS affected_collection_ids
  FROM resource_collections rc
  LEFT JOIN resource_collection_items rci ON rci.collection_id = rc.id
  WHERE rci.id IS NULL
    AND rc.created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- ============================================================================
-- Check 6: Duplicate Collection Items
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_duplicate_collection_items()
RETURNS TABLE (
  issue_type TEXT,
  issue_count BIGINT,
  total_duplicates BIGINT,
  affected_collection_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH duplicates AS (
    SELECT
      collection_id,
      file_id,
      COUNT(*) AS duplicate_count,
      ARRAY_AGG(id) AS item_ids
    FROM resource_collection_items
    GROUP BY collection_id, file_id
    HAVING COUNT(*) > 1
  )
  SELECT
    'DUPLICATE_ITEMS'::TEXT AS issue_type,
    COUNT(*)::BIGINT AS issue_count,
    SUM(duplicate_count)::BIGINT AS total_duplicates,
    ARRAY_AGG(collection_id) AS affected_collection_ids
  FROM duplicates;
END;
$$;

-- ============================================================================
-- Check 7: Ownership Mismatch
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_ownership_mismatch()
RETURNS TABLE (
  issue_type TEXT,
  issue_count BIGINT,
  affected_item_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'OWNERSHIP_MISMATCH'::TEXT AS issue_type,
    COUNT(*)::BIGINT AS issue_count,
    ARRAY_AGG(rci.id) AS affected_item_ids
  FROM resource_collection_items rci
  JOIN resource_collections rc ON rc.id = rci.collection_id
  JOIN file_uploads fu ON fu.id = rci.file_id
  WHERE fu.user_id != rc.coach_id;
END;
$$;

-- ============================================================================
-- Check 8: Progress Without Share Records
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_progress_without_shares()
RETURNS TABLE (
  issue_type TEXT,
  issue_count BIGINT,
  affected_progress_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'PROGRESS_NO_SHARE'::TEXT AS issue_type,
    COUNT(*)::BIGINT AS issue_count,
    ARRAY_AGG(rcp.id) AS affected_progress_ids
  FROM resource_client_progress rcp
  JOIN file_uploads fu ON fu.id = rcp.file_id
  WHERE NOT EXISTS (
    SELECT 1 FROM file_shares fs
    WHERE fs.file_id = rcp.file_id
      AND fs.shared_with = rcp.client_id
  )
  AND fu.is_public = false
  AND fu.shared_with_all_clients = false;
END;
$$;

-- ============================================================================
-- Check 9: Invalid Coach References
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_invalid_coach_references()
RETURNS TABLE (
  issue_type TEXT,
  issue_count BIGINT,
  affected_collection_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'INVALID_COACH'::TEXT AS issue_type,
    COUNT(*)::BIGINT AS issue_count,
    ARRAY_AGG(rc.id) AS affected_collection_ids
  FROM resource_collections rc
  LEFT JOIN users u ON u.id = rc.coach_id
  WHERE u.id IS NULL OR u.role != 'coach';
END;
$$;

-- ============================================================================
-- Check 10: Invalid Client References
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_invalid_client_references()
RETURNS TABLE (
  issue_type TEXT,
  issue_count BIGINT,
  affected_progress_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'INVALID_CLIENT'::TEXT AS issue_type,
    COUNT(*)::BIGINT AS issue_count,
    ARRAY_AGG(rcp.id) AS affected_progress_ids
  FROM resource_client_progress rcp
  LEFT JOIN users u ON u.id = rcp.client_id
  WHERE u.id IS NULL OR u.role != 'client';
END;
$$;

-- ============================================================================
-- Helper: Get Resource Library Statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_resource_library_statistics()
RETURNS TABLE (
  table_name TEXT,
  total_records BIGINT,
  created_last_7_days BIGINT,
  created_last_30_days BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'resource_collections'::TEXT AS table_name,
    COUNT(*)::BIGINT AS total_records,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT AS created_last_7_days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::BIGINT AS created_last_30_days
  FROM resource_collections

  UNION ALL

  SELECT
    'resource_collection_items'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::BIGINT
  FROM resource_collection_items

  UNION ALL

  SELECT
    'resource_client_progress'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::BIGINT
  FROM resource_client_progress;
END;
$$;

-- ============================================================================
-- Helper: Get Affected Coaches
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_affected_coaches()
RETURNS TABLE (
  coach_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  affected_collection_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH affected_collections AS (
    -- Collections with orphaned items
    SELECT DISTINCT rc.coach_id
    FROM resource_collections rc
    JOIN resource_collection_items rci ON rci.collection_id = rc.id
    LEFT JOIN file_uploads fu ON fu.id = rci.file_id
    WHERE fu.id IS NULL

    UNION

    -- Collections with ownership mismatches
    SELECT DISTINCT rc.coach_id
    FROM resource_collection_items rci
    JOIN resource_collections rc ON rc.id = rci.collection_id
    JOIN file_uploads fu ON fu.id = rci.file_id
    WHERE fu.user_id != rc.coach_id
  )
  SELECT
    u.id AS coach_id,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT rc.id)::BIGINT AS affected_collection_count
  FROM affected_collections ac
  JOIN users u ON u.id = ac.coach_id
  LEFT JOIN resource_collections rc ON rc.coach_id = u.id
  GROUP BY u.id, u.email, u.first_name, u.last_name
  ORDER BY affected_collection_count DESC;
END;
$$;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION validate_orphaned_collection_items() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_non_library_collection_items() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_orphaned_progress_records() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_non_library_progress_records() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_empty_collections() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_duplicate_collection_items() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_ownership_mismatch() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_progress_without_shares() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invalid_coach_references() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invalid_client_references() TO authenticated;
GRANT EXECUTE ON FUNCTION get_resource_library_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_affected_coaches() TO authenticated;

-- ============================================================================
-- Function Comments
-- ============================================================================

COMMENT ON FUNCTION validate_orphaned_collection_items IS
  'Validates collection items referencing non-existent files';
COMMENT ON FUNCTION validate_non_library_collection_items IS
  'Validates collection items pointing to non-library resources';
COMMENT ON FUNCTION validate_orphaned_progress_records IS
  'Validates progress records for non-existent files';
COMMENT ON FUNCTION validate_non_library_progress_records IS
  'Validates progress records for non-library resources';
COMMENT ON FUNCTION validate_empty_collections IS
  'Validates collections with no items (>7 days old)';
COMMENT ON FUNCTION validate_duplicate_collection_items IS
  'Validates duplicate items in collections';
COMMENT ON FUNCTION validate_ownership_mismatch IS
  'Validates file ownership matches collection ownership';
COMMENT ON FUNCTION validate_progress_without_shares IS
  'Validates progress records have corresponding shares';
COMMENT ON FUNCTION validate_invalid_coach_references IS
  'Validates collections reference valid coaches';
COMMENT ON FUNCTION validate_invalid_client_references IS
  'Validates progress records reference valid clients';
COMMENT ON FUNCTION get_resource_library_statistics IS
  'Returns statistics for resource library tables';
COMMENT ON FUNCTION get_affected_coaches IS
  'Returns coaches affected by validation issues';
