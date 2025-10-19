-- ============================================================================
-- Resource Library Data Validation Script
-- ============================================================================
-- This script identifies data inconsistencies and orphaned records that may
-- have resulted from the broken RLS policies in the resource library.
--
-- Issues checked:
-- 1. Orphaned collection items (referencing non-existent files)
-- 2. Collection items with invalid file_id references
-- 3. Progress records for non-existent or non-library resources
-- 4. Collections with no items
-- 5. Duplicate collection items
--
-- Generated: 2025-10-21
-- Usage: psql -f supabase/scripts/validate_resource_library_data.sql
-- ============================================================================

\set ON_ERROR_STOP on

-- ============================================================================
-- Data Validation Queries
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'RESOURCE LIBRARY DATA VALIDATION'
\echo '============================================================================'
\echo ''

-- Check 1: Orphaned collection items
\echo 'Check 1: Orphaned Collection Items'
\echo '-----------------------------------'

SELECT
  'ORPHANED_ITEMS' AS issue_type,
  COUNT(*) AS issue_count,
  ARRAY_AGG(rci.id) AS affected_ids
FROM resource_collection_items rci
LEFT JOIN file_uploads fu ON fu.id = rci.file_id
WHERE fu.id IS NULL;

-- Check 2: Collection items pointing to non-library resources
\echo ''
\echo 'Check 2: Collection Items with Non-Library Resources'
\echo '-----------------------------------------------------'

SELECT
  'NON_LIBRARY_ITEMS' AS issue_type,
  COUNT(*) AS issue_count,
  ARRAY_AGG(rci.id) AS affected_collection_item_ids,
  ARRAY_AGG(fu.id) AS affected_file_ids
FROM resource_collection_items rci
JOIN file_uploads fu ON fu.id = rci.file_id
WHERE fu.is_library_resource = false OR fu.is_library_resource IS NULL;

-- Check 3: Progress records for non-existent files
\echo ''
\echo 'Check 3: Orphaned Progress Records'
\echo '-----------------------------------'

SELECT
  'ORPHANED_PROGRESS' AS issue_type,
  COUNT(*) AS issue_count,
  ARRAY_AGG(rcp.id) AS affected_ids
FROM resource_client_progress rcp
LEFT JOIN file_uploads fu ON fu.id = rcp.file_id
WHERE fu.id IS NULL;

-- Check 4: Progress records for non-library resources
\echo ''
\echo 'Check 4: Progress Records for Non-Library Resources'
\echo '----------------------------------------------------'

SELECT
  'NON_LIBRARY_PROGRESS' AS issue_type,
  COUNT(*) AS issue_count,
  ARRAY_AGG(rcp.id) AS affected_progress_ids,
  ARRAY_AGG(fu.id) AS affected_file_ids
FROM resource_client_progress rcp
JOIN file_uploads fu ON fu.id = rcp.file_id
WHERE fu.is_library_resource = false OR fu.is_library_resource IS NULL;

-- Check 5: Empty collections
\echo ''
\echo 'Check 5: Empty Collections'
\echo '--------------------------'

SELECT
  'EMPTY_COLLECTIONS' AS issue_type,
  COUNT(*) AS issue_count,
  ARRAY_AGG(rc.id) AS affected_collection_ids
FROM resource_collections rc
LEFT JOIN resource_collection_items rci ON rci.collection_id = rc.id
WHERE rci.id IS NULL
  AND rc.created_at < NOW() - INTERVAL '7 days'; -- Only flag if older than 7 days

-- Check 6: Duplicate collection items (same file in same collection)
\echo ''
\echo 'Check 6: Duplicate Collection Items'
\echo '------------------------------------'

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
  'DUPLICATE_ITEMS' AS issue_type,
  COUNT(*) AS issue_count,
  SUM(duplicate_count) AS total_duplicates,
  ARRAY_AGG(collection_id) AS affected_collection_ids
FROM duplicates;

-- Check 7: Collection items where file owner != collection owner
\echo ''
\echo 'Check 7: Collection Items with Mismatched Ownership'
\echo '----------------------------------------------------'

SELECT
  'OWNERSHIP_MISMATCH' AS issue_type,
  COUNT(*) AS issue_count,
  ARRAY_AGG(rci.id) AS affected_item_ids
FROM resource_collection_items rci
JOIN resource_collections rc ON rc.id = rci.collection_id
JOIN file_uploads fu ON fu.id = rci.file_id
WHERE fu.user_id != rc.coach_id;

-- Check 8: Progress records for clients who never had the file shared
\echo ''
\echo 'Check 8: Progress Without Share Records'
\echo '----------------------------------------'

SELECT
  'PROGRESS_NO_SHARE' AS issue_type,
  COUNT(*) AS issue_count,
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

-- Check 9: Collections with invalid coach_id
\echo ''
\echo 'Check 9: Collections with Invalid Coach References'
\echo '---------------------------------------------------'

SELECT
  'INVALID_COACH' AS issue_type,
  COUNT(*) AS issue_count,
  ARRAY_AGG(rc.id) AS affected_collection_ids
FROM resource_collections rc
LEFT JOIN users u ON u.id = rc.coach_id
WHERE u.id IS NULL OR u.role != 'coach';

-- Check 10: Progress records with invalid client_id
\echo ''
\echo 'Check 10: Progress with Invalid Client References'
\echo '--------------------------------------------------'

SELECT
  'INVALID_CLIENT' AS issue_type,
  COUNT(*) AS issue_count,
  ARRAY_AGG(rcp.id) AS affected_progress_ids
FROM resource_client_progress rcp
LEFT JOIN users u ON u.id = rcp.client_id
WHERE u.id IS NULL OR u.role != 'client';

-- ============================================================================
-- Summary Statistics
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'SUMMARY STATISTICS'
\echo '============================================================================'
\echo ''

SELECT
  'resource_collections' AS table_name,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS created_last_7_days,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS created_last_30_days
FROM resource_collections

UNION ALL

SELECT
  'resource_collection_items',
  COUNT(*),
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')
FROM resource_collection_items

UNION ALL

SELECT
  'resource_client_progress',
  COUNT(*),
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')
FROM resource_client_progress;

-- ============================================================================
-- Remediation Recommendations
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'REMEDIATION RECOMMENDATIONS'
\echo '============================================================================'
\echo ''
\echo 'If issues are found, consider running the following cleanup scripts:'
\echo ''
\echo '1. Remove orphaned collection items:'
\echo '   DELETE FROM resource_collection_items WHERE id IN (...);'
\echo ''
\echo '2. Remove orphaned progress records:'
\echo '   DELETE FROM resource_client_progress WHERE id IN (...);'
\echo ''
\echo '3. Remove duplicate collection items (keep first, delete rest):'
\echo '   DELETE FROM resource_collection_items WHERE id IN (...);'
\echo ''
\echo '4. Notify affected coaches via email:'
\echo '   SELECT DISTINCT u.email'
\echo '   FROM users u'
\echo '   JOIN resource_collections rc ON rc.coach_id = u.id'
\echo '   WHERE rc.id IN (...);'
\echo ''
\echo '============================================================================'

-- ============================================================================
-- Export Affected Coach Emails (for notification)
-- ============================================================================

\echo ''
\echo 'Affected Coach Emails (for notification):'
\echo '-----------------------------------------'

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
  COUNT(DISTINCT rc.id) AS affected_collection_count
FROM affected_collections ac
JOIN users u ON u.id = ac.coach_id
LEFT JOIN resource_collections rc ON rc.coach_id = u.id
GROUP BY u.id, u.email, u.first_name, u.last_name
ORDER BY affected_collection_count DESC;

\echo ''
\echo '============================================================================'
\echo 'Validation Complete'
\echo '============================================================================'
