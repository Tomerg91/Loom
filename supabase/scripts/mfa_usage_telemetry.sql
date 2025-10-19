-- ============================================================================
-- MFA Usage Telemetry Script
-- ============================================================================
-- This script captures current MFA usage patterns to understand which tables
-- are authoritative and how the application uses MFA state.
--
-- Purpose: Phase 3 - MFA Alignment (Non-Destructive)
-- Goal: Determine single source of truth before consolidation
--
-- Generated: 2025-10-21
-- ============================================================================

\set ON_ERROR_STOP on

\echo ''
\echo '============================================================================'
\echo 'MFA USAGE TELEMETRY REPORT'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- Current MFA Table Inventory
-- ============================================================================

\echo 'MFA Tables and Columns:'
\echo '-----------------------'

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%mfa%'
    OR column_name LIKE '%mfa%'
  )
ORDER BY table_name, ordinal_position;

\echo ''

-- ============================================================================
-- MFA Enabled Users Comparison Across Sources
-- ============================================================================

\echo 'MFA Enabled Users - Cross-Source Comparison:'
\echo '--------------------------------------------'

WITH mfa_sources AS (
  SELECT
    u.id AS user_id,
    u.email,
    u.role,
    u.mfa_enabled AS users_mfa_enabled,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM user_mfa_methods umm
        WHERE umm.user_id = u.id AND umm.status = 'active'
      ) THEN true
      ELSE false
    END AS mfa_methods_active,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM user_mfa um
        WHERE um.user_id = u.id AND um.is_enabled = true
      ) THEN true
      ELSE false
    END AS user_mfa_enabled,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM user_mfa_settings ums
        WHERE ums.user_id = u.id AND ums.is_enabled = true
      ) THEN true
      ELSE false
    END AS mfa_settings_enabled
  FROM users u
  WHERE u.mfa_enabled = true
     OR EXISTS (SELECT 1 FROM user_mfa_methods WHERE user_id = u.id)
     OR EXISTS (SELECT 1 FROM user_mfa WHERE user_id = u.id)
     OR EXISTS (SELECT 1 FROM user_mfa_settings WHERE user_id = u.id)
)
SELECT
  COUNT(*) AS total_users_with_mfa_data,
  COUNT(*) FILTER (WHERE users_mfa_enabled = true) AS users_table_enabled,
  COUNT(*) FILTER (WHERE mfa_methods_active = true) AS mfa_methods_active,
  COUNT(*) FILTER (WHERE user_mfa_enabled = true) AS user_mfa_enabled,
  COUNT(*) FILTER (WHERE mfa_settings_enabled = true) AS mfa_settings_enabled,
  COUNT(*) FILTER (WHERE
    users_mfa_enabled = mfa_methods_active
    AND mfa_methods_active = user_mfa_enabled
    AND user_mfa_enabled = mfa_settings_enabled
  ) AS all_sources_agree,
  COUNT(*) FILTER (WHERE
    users_mfa_enabled != mfa_methods_active
    OR mfa_methods_active != user_mfa_enabled
    OR user_mfa_enabled != mfa_settings_enabled
  ) AS sources_disagree
FROM mfa_sources;

\echo ''

-- ============================================================================
-- Discrepancy Details
-- ============================================================================

\echo 'Users with MFA Source Discrepancies:'
\echo '-------------------------------------'

WITH mfa_sources AS (
  SELECT
    u.id AS user_id,
    u.email,
    u.role,
    u.mfa_enabled AS users_mfa_enabled,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM user_mfa_methods umm
        WHERE umm.user_id = u.id AND umm.status = 'active'
      ) THEN true
      ELSE false
    END AS mfa_methods_active,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM user_mfa um
        WHERE um.user_id = u.id AND um.is_enabled = true
      ) THEN true
      ELSE false
    END AS user_mfa_enabled,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM user_mfa_settings ums
        WHERE ums.user_id = u.id AND ums.is_enabled = true
      ) THEN true
      ELSE false
    END AS mfa_settings_enabled
  FROM users u
  WHERE u.mfa_enabled = true
     OR EXISTS (SELECT 1 FROM user_mfa_methods WHERE user_id = u.id)
     OR EXISTS (SELECT 1 FROM user_mfa WHERE user_id = u.id)
     OR EXISTS (SELECT 1 FROM user_mfa_settings WHERE user_id = u.id)
)
SELECT
  user_id,
  email,
  users_mfa_enabled,
  mfa_methods_active,
  user_mfa_enabled,
  mfa_settings_enabled,
  CASE
    WHEN users_mfa_enabled AND NOT mfa_methods_active THEN 'users.mfa_enabled=true but no active methods'
    WHEN NOT users_mfa_enabled AND mfa_methods_active THEN 'users.mfa_enabled=false but has active methods'
    ELSE 'Other inconsistency'
  END AS discrepancy_type
FROM mfa_sources
WHERE users_mfa_enabled != mfa_methods_active
   OR mfa_methods_active != user_mfa_enabled
   OR user_mfa_enabled != mfa_settings_enabled
LIMIT 20;

\echo ''

-- ============================================================================
-- MFA Method Distribution
-- ============================================================================

\echo 'MFA Method Types Distribution:'
\echo '------------------------------'

SELECT
  method_type,
  status,
  COUNT(*) AS user_count,
  COUNT(*) FILTER (WHERE last_used_at IS NOT NULL) AS users_who_used_it,
  MAX(last_used_at) AS most_recent_use
FROM user_mfa_methods
GROUP BY method_type, status
ORDER BY method_type, status;

\echo ''

-- ============================================================================
-- MFA Adoption by User Role
-- ============================================================================

\echo 'MFA Adoption by User Role:'
\echo '--------------------------'

SELECT
  u.role,
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE u.mfa_enabled = true) AS mfa_enabled_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE u.mfa_enabled = true) / NULLIF(COUNT(*), 0), 2) AS mfa_adoption_percent,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM user_mfa_methods umm
    WHERE umm.user_id = u.id AND umm.status = 'active'
  )) AS has_active_methods
FROM users u
WHERE u.role IN ('coach', 'client', 'admin')
GROUP BY u.role
ORDER BY u.role;

\echo ''

-- ============================================================================
-- Recent MFA Activity
-- ============================================================================

\echo 'Recent MFA Activity (Last 30 Days):'
\echo '------------------------------------'

SELECT
  DATE(last_used_at) AS use_date,
  method_type,
  COUNT(*) AS usage_count
FROM user_mfa_methods
WHERE last_used_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(last_used_at), method_type
ORDER BY use_date DESC, method_type
LIMIT 30;

\echo ''

-- ============================================================================
-- MFA Backup Codes Usage
-- ============================================================================

\echo 'MFA Backup Codes Status:'
\echo '------------------------'

SELECT
  COUNT(*) AS total_users_with_backup_codes,
  COUNT(*) FILTER (WHERE backup_codes IS NOT NULL AND array_length(backup_codes, 1) > 0) AS has_unused_codes,
  COUNT(*) FILTER (WHERE backup_codes IS NULL OR array_length(backup_codes, 1) = 0) AS no_backup_codes,
  AVG(array_length(backup_codes, 1)) AS avg_backup_codes_per_user
FROM users
WHERE mfa_enabled = true;

\echo ''

-- ============================================================================
-- Table Row Counts
-- ============================================================================

\echo 'MFA Table Row Counts:'
\echo '---------------------'

SELECT
  'user_mfa_methods' AS table_name,
  COUNT(*) AS row_count,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS created_last_30_days
FROM user_mfa_methods

UNION ALL

SELECT
  'user_mfa',
  COUNT(*),
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')
FROM user_mfa

UNION ALL

SELECT
  'user_mfa_settings',
  COUNT(*),
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')
FROM user_mfa_settings

UNION ALL

SELECT
  'mfa_verification_attempts',
  COUNT(*),
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')
FROM mfa_verification_attempts;

\echo ''

-- ============================================================================
-- Application Code References Analysis
-- ============================================================================

\echo 'Recommendations:'
\echo '----------------'
\echo ''
\echo '1. SINGLE SOURCE OF TRUTH: Based on the data above, determine which source is most authoritative'
\echo '   - If users.mfa_enabled matches user_mfa_methods.status: Use user_mfa_methods as source of truth'
\echo '   - If discrepancies exist: Manual reconciliation required before consolidation'
\echo ''
\echo '2. MIGRATION STRATEGY:'
\echo '   - Create materialized view or function that unifies MFA state'
\echo '   - Update application code to use unified source (non-breaking)'
\echo '   - Add triggers to keep users.mfa_enabled in sync during transition'
\echo '   - Only after full app migration: deprecate redundant columns/tables'
\echo ''
\echo '3. NEXT STEPS:'
\echo '   - Review application code for references to users.mfa_enabled'
\echo '   - Search: grep -r "mfa_enabled" src/'
\echo '   - Search: grep -r "user_mfa" src/'
\echo '   - Document all query patterns before making changes'
\echo ''
\echo '============================================================================'
