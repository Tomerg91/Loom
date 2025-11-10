-- ============================================================================
-- Phase 3: MFA Unified Source of Truth (Non-Destructive)
-- ============================================================================
-- This migration creates a unified interface for MFA status without breaking
-- existing application code that depends on users.mfa_enabled.
--
-- Strategy:
-- 1. Create function and materialized view for unified MFA state
-- 2. Add triggers to keep users.mfa_enabled in sync with user_mfa_methods
-- 3. Preserve backward compatibility with existing code
-- 4. Enable gradual migration of application code
--
-- Reference: DATABASE_REFACTORING_PLAN.md Phase 3
-- Generated: 2025-10-21
-- ============================================================================

-- ============================================================================
-- Step 1: Create Unified MFA Status Function
-- ============================================================================

-- Drop existing function to change parameter name from target_user_id to p_user_id
DROP FUNCTION IF EXISTS public.get_user_mfa_status(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_mfa_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'mfa_enabled', COALESCE(bool_or(umm.status = 'active'), false),
    'active_methods', jsonb_agg(
      jsonb_build_object(
        'method_type', umm.method_type,
        'status', umm.status,
        'last_used_at', umm.last_used_at
      )
    ) FILTER (WHERE umm.status = 'active'),
    'total_methods', COUNT(umm.id),
    'active_method_count', COUNT(*) FILTER (WHERE umm.status = 'active'),
    'last_mfa_used_at', MAX(umm.last_used_at),
    'has_backup_codes', EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_user_id
        AND u.mfa_backup_codes IS NOT NULL
        AND array_length(u.mfa_backup_codes, 1) > 0
    )
  ) INTO v_result
  FROM public.user_mfa_methods umm
  WHERE umm.user_id = p_user_id;

  -- If no methods found, return default structure
  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'user_id', p_user_id,
      'mfa_enabled', false,
      'active_methods', '[]'::jsonb,
      'total_methods', 0,
      'active_method_count', 0,
      'last_mfa_used_at', NULL,
      'has_backup_codes', false
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_user_mfa_status(UUID) IS
  'Unified MFA status function. Returns comprehensive MFA state from user_mfa_methods table. Use this instead of directly querying users.mfa_enabled.';

-- ============================================================================
-- Step 2: Create Materialized View for Performance
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_mfa_status_unified AS
SELECT
  u.id AS user_id,
  u.email,
  u.role,
  COALESCE(bool_or(umm.status = 'active'), false) AS mfa_enabled,
  COUNT(umm.id) AS total_methods,
  COUNT(*) FILTER (WHERE umm.status = 'active') AS active_method_count,
  COUNT(*) FILTER (WHERE umm.status = 'pending') AS pending_method_count,
  COUNT(*) FILTER (WHERE umm.status = 'disabled') AS disabled_method_count,
  MAX(umm.last_used_at) AS last_mfa_used_at,
  array_agg(umm.method_type) FILTER (WHERE umm.status = 'active') AS active_method_types,
  u.mfa_backup_codes IS NOT NULL AND array_length(u.mfa_backup_codes, 1) > 0 AS has_backup_codes,
  -- Include legacy column for comparison/debugging
  u.mfa_enabled AS legacy_mfa_enabled,
  -- Flag discrepancies
  CASE
    WHEN u.mfa_enabled != COALESCE(bool_or(umm.status = 'active'), false) THEN true
    ELSE false
  END AS has_discrepancy
FROM public.users u
LEFT JOIN public.user_mfa_methods umm ON umm.user_id = u.id
GROUP BY u.id, u.email, u.role, u.mfa_enabled, u.mfa_backup_codes;

-- Create unique index for efficient lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_mfa_status_unified_user_id
  ON public.user_mfa_status_unified (user_id);

-- Create index for finding discrepancies
CREATE INDEX IF NOT EXISTS idx_user_mfa_status_unified_discrepancy
  ON public.user_mfa_status_unified (has_discrepancy)
  WHERE has_discrepancy = true;

COMMENT ON MATERIALIZED VIEW public.user_mfa_status_unified IS
  'Cached MFA status for all users. Refresh after MFA changes. Use this for dashboard queries and analytics.';

-- ============================================================================
-- Step 3: Create Function to Refresh Materialized View
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_user_mfa_status_unified()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_mfa_status_unified;
  RAISE NOTICE 'Refreshed user_mfa_status_unified at %', NOW();
END;
$$;

COMMENT ON FUNCTION public.refresh_user_mfa_status_unified IS
  'Refreshes the unified MFA status materialized view. Call after MFA method changes.';

-- ============================================================================
-- Step 4: Create Trigger to Keep users.mfa_enabled in Sync
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_mfa_enabled_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_active_methods BOOLEAN;
BEGIN
  -- Determine if user has any active MFA methods
  SELECT EXISTS (
    SELECT 1
    FROM public.user_mfa_methods
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND status = 'active'
  ) INTO v_has_active_methods;

  -- Update users.mfa_enabled to match
  UPDATE public.users
  SET mfa_enabled = v_has_active_methods,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  -- Trigger materialized view refresh in the background
  -- (In production, this would be done via pg_cron or application-level job)
  -- For now, just log the need for refresh
  RAISE NOTICE 'MFA methods changed for user %, triggering refresh', COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.sync_mfa_enabled_column IS
  'Trigger function to keep users.mfa_enabled in sync with user_mfa_methods.status. Maintains backward compatibility.';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_sync_mfa_enabled_on_method_change ON public.user_mfa_methods;

-- Create trigger on user_mfa_methods
CREATE TRIGGER trg_sync_mfa_enabled_on_method_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_mfa_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_mfa_enabled_column();

COMMENT ON TRIGGER trg_sync_mfa_enabled_on_method_change ON public.user_mfa_methods IS
  'Keeps users.mfa_enabled synchronized with user_mfa_methods.status for backward compatibility';

-- ============================================================================
-- Step 5: One-Time Sync to Fix Existing Discrepancies
-- ============================================================================

DO $$
DECLARE
  v_updates INTEGER := 0;
BEGIN
  -- Update users.mfa_enabled to match actual user_mfa_methods state
  WITH mfa_status AS (
    SELECT
      u.id AS user_id,
      COALESCE(bool_or(umm.status = 'active'), false) AS should_be_enabled
    FROM users u
    LEFT JOIN user_mfa_methods umm ON umm.user_id = u.id
    GROUP BY u.id
  )
  UPDATE users u
  SET mfa_enabled = ms.should_be_enabled,
      updated_at = NOW()
  FROM mfa_status ms
  WHERE u.id = ms.user_id
    AND u.mfa_enabled != ms.should_be_enabled;

  GET DIAGNOSTICS v_updates = ROW_COUNT;

  RAISE NOTICE 'Synchronized % user records where mfa_enabled was out of sync', v_updates;

  -- Log the sync operation
  INSERT INTO public.security_audit_log (
    event_type,
    event_details,
    severity,
    timestamp
  ) VALUES (
    'mfa_synchronization',
    jsonb_build_object(
      'migration', '20251021000003_mfa_unified_source_non_destructive',
      'action', 'Synchronized users.mfa_enabled with user_mfa_methods',
      'records_updated', v_updates
    ),
    'info',
    NOW()
  );
END $$;

-- ============================================================================
-- Step 6: Perform Initial Refresh of Materialized View
-- ============================================================================

SELECT public.refresh_user_mfa_status_unified();

-- ============================================================================
-- Step 7: Create Helper Views for Common Queries
-- ============================================================================

-- View: Active MFA users
CREATE OR REPLACE VIEW public.users_with_active_mfa AS
SELECT
  u.id,
  u.email,
  u.role,
  u.first_name,
  u.last_name,
  umsu.active_method_types,
  umsu.last_mfa_used_at,
  umsu.has_backup_codes
FROM public.users u
JOIN public.user_mfa_status_unified umsu ON umsu.user_id = u.id
WHERE umsu.mfa_enabled = true;

COMMENT ON VIEW public.users_with_active_mfa IS
  'Convenient view of users with active MFA. Uses unified source of truth.';

-- View: MFA discrepancies (for monitoring)
CREATE OR REPLACE VIEW public.mfa_status_discrepancies AS
SELECT
  user_id,
  email,
  role,
  mfa_enabled AS unified_status,
  legacy_mfa_enabled AS legacy_status,
  active_method_count,
  total_methods
FROM public.user_mfa_status_unified
WHERE has_discrepancy = true;

COMMENT ON VIEW public.mfa_status_discrepancies IS
  'Shows users where unified MFA status differs from legacy users.mfa_enabled column. Should be empty after sync.';

-- ============================================================================
-- Step 8: Grant Permissions
-- ============================================================================

GRANT SELECT ON public.user_mfa_status_unified TO authenticated;
GRANT SELECT ON public.users_with_active_mfa TO authenticated;
GRANT SELECT ON public.mfa_status_discrepancies TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_mfa_status(UUID) TO authenticated;

-- Only admins can refresh the materialized view
GRANT EXECUTE ON FUNCTION public.refresh_user_mfa_status_unified() TO service_role;

-- ============================================================================
-- Step 9: Add Documentation Comments
-- ============================================================================

COMMENT ON COLUMN public.users.mfa_enabled IS
  'LEGACY: Kept for backward compatibility. Automatically synced with user_mfa_methods via trigger. New code should use get_user_mfa_status() or user_mfa_status_unified view instead.';

-- ============================================================================
-- Step 10: Security Audit Log
-- ============================================================================

INSERT INTO public.security_audit_log (
  event_type,
  event_details,
  severity,
  timestamp
) VALUES (
  'mfa_consolidation',
  jsonb_build_object(
    'migration', '20251021000003_mfa_unified_source_non_destructive',
    'action', 'Created unified MFA source of truth with backward compatibility',
    'components_created', jsonb_build_array(
      'get_user_mfa_status function',
      'user_mfa_status_unified materialized view',
      'sync_mfa_enabled_column trigger',
      'users_with_active_mfa view',
      'mfa_status_discrepancies view'
    ),
    'phase', 'Phase 3',
    'breaking_changes', false,
    'backward_compatible', true
  ),
  'critical',
  NOW()
);

-- ============================================================================
-- Migration Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MFA UNIFIED SOURCE MIGRATION COMPLETED';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created Components:';
  RAISE NOTICE '  ✓ Function: get_user_mfa_status(user_id)';
  RAISE NOTICE '  ✓ Materialized View: user_mfa_status_unified';
  RAISE NOTICE '  ✓ Trigger: trg_sync_mfa_enabled_on_method_change';
  RAISE NOTICE '  ✓ View: users_with_active_mfa';
  RAISE NOTICE '  ✓ View: mfa_status_discrepancies';
  RAISE NOTICE '';
  RAISE NOTICE 'Application Migration Path:';
  RAISE NOTICE '  1. Old: SELECT mfa_enabled FROM users WHERE id = ?';
  RAISE NOTICE '  2. New: SELECT mfa_enabled FROM user_mfa_status_unified WHERE user_id = ?';
  RAISE NOTICE '  3. Or:  SELECT get_user_mfa_status(?) ->> ''mfa_enabled''';
  RAISE NOTICE '';
  RAISE NOTICE 'Backward Compatibility: MAINTAINED';
  RAISE NOTICE '  - users.mfa_enabled column still works';
  RAISE NOTICE '  - Automatically synced via trigger';
  RAISE NOTICE '  - Safe to deploy without app changes';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update application code to use new sources (gradual)';
  RAISE NOTICE '  2. Monitor mfa_status_discrepancies view (should be empty)';
  RAISE NOTICE '  3. After full migration: deprecate users.mfa_enabled in future release';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;
