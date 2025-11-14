-- ============================================================================
-- Resource Library - Subscription-Based Access Gating
-- ============================================================================
-- This migration updates RLS policies to enforce subscription-based access
-- control for the resource library feature.
--
-- Access Rules:
-- - Coaches with paid subscriptions can access resource library features
-- - Free tier coaches cannot upload or manage resources
-- - Admins always have access
-- - Clients can still view resources shared with them (regardless of coach's subscription)
-- ============================================================================

-- ============================================================================
-- 1. DROP EXISTING POLICIES THAT NEED UPDATING
-- ============================================================================

-- Drop policies that will be replaced with subscription-aware versions
DROP POLICY IF EXISTS "Coaches can view their library resources" ON file_uploads;
DROP POLICY IF EXISTS "Coaches can update their library resources" ON file_uploads;
DROP POLICY IF EXISTS "Coaches can delete their library resources" ON file_uploads;
DROP POLICY IF EXISTS "Coaches can create collections" ON resource_collections;
DROP POLICY IF EXISTS "Coaches can create their own library settings" ON resource_library_settings;

-- ============================================================================
-- 2. UPDATED FILE_UPLOADS POLICIES WITH SUBSCRIPTION CHECKS
-- ============================================================================

-- Coaches can view their library resources (subscription required for paid tier features)
CREATE POLICY "Coaches can view their library resources"
  ON file_uploads
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND is_library_resource = true
    AND (
      -- Admins can always access
      (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      OR
      -- Coaches with any subscription tier can view their own resources
      (SELECT role FROM users WHERE id = auth.uid()) = 'coach'
    )
  );

-- Coaches can update their library resources (requires active paid subscription)
CREATE POLICY "Coaches can update their library resources"
  ON file_uploads
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND is_library_resource = true
    AND (
      -- Admins can always update
      (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      OR
      -- Coaches with paid subscription can update
      can_access_resource_library(auth.uid())
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_library_resource = true
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      OR
      can_access_resource_library(auth.uid())
    )
  );

-- Coaches can delete their library resources (requires active paid subscription)
CREATE POLICY "Coaches can delete their library resources"
  ON file_uploads
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND is_library_resource = true
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      OR
      can_access_resource_library(auth.uid())
    )
  );

-- ============================================================================
-- 3. UPDATED RESOURCE COLLECTIONS POLICIES WITH SUBSCRIPTION CHECKS
-- ============================================================================

-- Coaches can create collections (requires active paid subscription)
CREATE POLICY "Coaches can create collections"
  ON resource_collections
  FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      OR
      can_access_resource_library(auth.uid())
    )
  );

-- ============================================================================
-- 4. UPDATED RESOURCE LIBRARY SETTINGS POLICIES WITH SUBSCRIPTION CHECKS
-- ============================================================================

-- Coaches can create their own library settings (requires active paid subscription)
CREATE POLICY "Coaches can create their own library settings"
  ON resource_library_settings
  FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      OR
      can_access_resource_library(auth.uid())
    )
  );

-- ============================================================================
-- 5. ADD NEW POLICY FOR FILE UPLOAD CREATION
-- ============================================================================

-- Create a specific policy for creating library resources
-- (This was likely missing from the original schema)
DROP POLICY IF EXISTS "Coaches can create library resources" ON file_uploads;

CREATE POLICY "Coaches can create library resources"
  ON file_uploads
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Admins can always create
      (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      OR
      -- Coaches with paid subscription can create library resources
      (
        is_library_resource = true
        AND can_access_resource_library(auth.uid())
      )
      OR
      -- All coaches can create non-library files (session files, etc.)
      (
        is_library_resource = false
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('coach', 'admin')
      )
    )
  );

-- ============================================================================
-- 6. ENSURE CLIENT ACCESS IS NOT AFFECTED
-- ============================================================================

-- Client access to shared resources remains unchanged (no subscription check)
-- The existing "Clients can view shared library resources" policy handles this

-- ============================================================================
-- 7. ADD HELPFUL INDEXES FOR SUBSCRIPTION QUERIES
-- ============================================================================

-- Index to speed up subscription checks in RLS policies
CREATE INDEX IF NOT EXISTS idx_users_role_subscription
  ON users(role, subscription_tier, subscription_expires_at)
  WHERE role = 'coach';

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Coaches can view their library resources" ON file_uploads IS
  'Allows coaches to view their library resources regardless of subscription tier';

COMMENT ON POLICY "Coaches can update their library resources" ON file_uploads IS
  'Allows coaches with paid subscriptions to update their library resources';

COMMENT ON POLICY "Coaches can delete their library resources" ON file_uploads IS
  'Allows coaches with paid subscriptions to delete their library resources';

COMMENT ON POLICY "Coaches can create library resources" ON file_uploads IS
  'Allows coaches with paid subscriptions to create library resources, but all coaches can create session files';

COMMENT ON POLICY "Coaches can create collections" ON resource_collections IS
  'Allows coaches with paid subscriptions to create resource collections';

COMMENT ON POLICY "Coaches can create their own library settings" ON resource_library_settings IS
  'Allows coaches with paid subscriptions to create library settings';
