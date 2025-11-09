-- ============================================================================
-- Phase 2: Fix Resource Library RLS Policies
-- ============================================================================
-- This migration corrects RLS policies that reference non-existent columns.
-- The policies incorrectly reference `resource_id` when the actual column is `file_id`.
--
-- Affected Tables:
-- - resource_collection_items
-- - resource_client_progress
--
-- Context: Policies were created in 20260109000001_resource_library_rls.sql
-- Reference: DATABASE_REFACTORING_PLAN.md Phase 2
--
-- Generated: 2025-10-21
-- ============================================================================

-- ============================================================================
-- FIX: resource_collection_items Policies
-- ============================================================================

-- Drop the broken policy that references resource_id
DROP POLICY IF EXISTS "Coaches can add items to their collections" ON resource_collection_items;

-- Recreate with correct column name (file_id instead of resource_id)
CREATE POLICY "Coaches can add items to their collections"
  ON resource_collection_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resource_collections
      WHERE id = resource_collection_items.collection_id
      AND coach_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM file_uploads
      WHERE id = resource_collection_items.file_id  -- FIXED: was resource_id
      AND user_id = auth.uid()
      AND is_library_resource = true  -- Ensure it's a library resource
    )
  );

COMMENT ON POLICY "Coaches can add items to their collections" ON resource_collection_items IS
  'Allows coaches to add their own library resources to their collections. Fixed to reference file_id column.';

-- ============================================================================
-- FIX: resource_client_progress Policies
-- ============================================================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Coaches can view progress for their resources" ON resource_client_progress;

-- Recreate with correct column name
CREATE POLICY "Coaches can view progress for their resources"
  ON resource_client_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_uploads
      WHERE id = resource_client_progress.file_id  -- FIXED: was resource_id
      AND user_id = auth.uid()
      AND is_library_resource = true  -- Only library resources
    )
  );

COMMENT ON POLICY "Coaches can view progress for their resources" ON resource_client_progress IS
  'Allows coaches to view client progress for their library resources. Fixed to reference file_id column.';

-- ============================================================================
-- FIX: Indexes referencing resource_id
-- ============================================================================

-- The original migration created these indexes, but they reference resource_id
-- Drop and recreate with correct column names

DROP INDEX IF EXISTS idx_resource_collection_items_resource_id;
DROP INDEX IF EXISTS idx_resource_client_progress_resource_id;

-- Recreate with file_id (these likely already exist from the schema migration)
CREATE INDEX IF NOT EXISTS idx_resource_collection_items_file_id
  ON resource_collection_items(file_id);

CREATE INDEX IF NOT EXISTS idx_resource_client_progress_file_id
  ON resource_client_progress(file_id, client_id);

COMMENT ON INDEX idx_resource_collection_items_file_id IS
  'Index for finding all collections containing a specific file';

COMMENT ON INDEX idx_resource_client_progress_file_id IS
  'Index for querying client progress for a specific resource';

-- ============================================================================
-- ENHANCEMENT: Add missing policy for clients to view collection items
-- ============================================================================

-- Clients should be able to view items in collections that contain
-- resources shared with them

CREATE POLICY "Clients can view shared collection items"
  ON resource_collection_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_uploads fu
      WHERE fu.id = resource_collection_items.file_id
        AND fu.is_library_resource = true
        AND (
          -- Resource is public
          fu.is_public = true
          OR
          -- Resource is explicitly shared with the client
          EXISTS (
            SELECT 1 FROM file_shares fs
            WHERE fs.file_id = fu.id
              AND fs.shared_with = auth.uid()
              AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
          )
          OR
          -- Resource is shared with all clients and user is client of the coach
          (
            fu.shared_with_all_clients = true
            AND EXISTS (
              SELECT 1 FROM sessions s
              WHERE s.coach_id = fu.user_id
                AND s.client_id = auth.uid()
            )
          )
        )
    )
  );

COMMENT ON POLICY "Clients can view shared collection items" ON resource_collection_items IS
  'Allows clients to view collection items for resources that are shared with them';

-- ============================================================================
-- ENHANCEMENT: Add policy for clients to view collections with shared items
-- ============================================================================

CREATE POLICY "Clients can view collections with shared items"
  ON resource_collections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM resource_collection_items rci
      JOIN file_uploads fu ON fu.id = rci.file_id
      WHERE rci.collection_id = resource_collections.id
        AND fu.is_library_resource = true
        AND (
          fu.is_public = true
          OR
          EXISTS (
            SELECT 1 FROM file_shares fs
            WHERE fs.file_id = fu.id
              AND fs.shared_with = auth.uid()
              AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
          )
          OR
          (
            fu.shared_with_all_clients = true
            AND EXISTS (
              SELECT 1 FROM sessions s
              WHERE s.coach_id = fu.user_id
                AND s.client_id = auth.uid()
            )
          )
        )
    )
  );

COMMENT ON POLICY "Clients can view collections with shared items" ON resource_collections IS
  'Allows clients to view collections that contain at least one resource shared with them';

-- ============================================================================
-- VALIDATION: Ensure all policies reference valid columns
-- ============================================================================

DO $$
DECLARE
  v_policy RECORD;
  v_error_found BOOLEAN := FALSE;
BEGIN
  -- Check resource_collection_items policies
  FOR v_policy IN
    SELECT polname, pg_get_expr(polqual, polrelid) AS qual
    FROM pg_policy
    WHERE polrelid = 'resource_collection_items'::regclass
  LOOP
    IF v_policy.qual LIKE '%resource_id%' THEN
      RAISE WARNING 'Policy % still references resource_id!', v_policy.polname;
      v_error_found := TRUE;
    END IF;
  END LOOP;

  -- Check resource_client_progress policies
  FOR v_policy IN
    SELECT polname, pg_get_expr(polqual, polrelid) AS qual
    FROM pg_policy
    WHERE polrelid = 'resource_client_progress'::regclass
  LOOP
    IF v_policy.qual LIKE '%resource_id%' THEN
      RAISE WARNING 'Policy % still references resource_id!', v_policy.polname;
      v_error_found := TRUE;
    END IF;
  END LOOP;

  IF v_error_found THEN
    RAISE EXCEPTION 'Migration validation failed: policies still reference non-existent resource_id column';
  ELSE
    RAISE NOTICE 'Migration validation passed: all policies reference valid columns';
  END IF;
END $$;

-- ============================================================================
-- Security Audit Log
-- ============================================================================

INSERT INTO security_audit_log (
  event_type,
  event_details,
  severity,
  timestamp
) VALUES (
  'rls_policy_fix',
  jsonb_build_object(
    'migration', '20251021000002_fix_resource_library_rls_policies',
    'action', 'Fixed resource library RLS policies to reference file_id instead of resource_id',
    'policies_fixed', 2,
    'policies_added', 2,
    'indexes_fixed', 2,
    'phase', 'Phase 2'
  ),
  'critical',
  NOW()
);
