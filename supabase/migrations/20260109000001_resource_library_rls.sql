/**
 * Resource Library - Row Level Security Policies
 *
 * Implements RLS policies for:
 * - file_uploads (library resources)
 * - resource_collections
 * - resource_collection_items
 * - resource_library_settings
 * - resource_client_progress
 *
 * Security Rules:
 * - Coaches can only access their own resources and collections
 * - Clients can only view resources shared with them
 * - Progress tracking is client-specific
 * - Settings are coach-specific
 */

-- Enable RLS on all resource library tables
ALTER TABLE resource_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_library_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_client_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RESOURCE COLLECTIONS POLICIES
-- ============================================================================

-- Coaches can view their own collections
CREATE POLICY "Coaches can view their own collections"
  ON resource_collections
  FOR SELECT
  USING (
    auth.uid() = coach_id
  );

-- Coaches can create their own collections
CREATE POLICY "Coaches can create collections"
  ON resource_collections
  FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id
    AND (
      SELECT user_metadata->>'role' FROM users WHERE id = auth.uid()
    ) IN ('coach', 'admin')
  );

-- Coaches can update their own collections
CREATE POLICY "Coaches can update their own collections"
  ON resource_collections
  FOR UPDATE
  USING (
    auth.uid() = coach_id
  )
  WITH CHECK (
    auth.uid() = coach_id
  );

-- Coaches can delete their own collections
CREATE POLICY "Coaches can delete their own collections"
  ON resource_collections
  FOR DELETE
  USING (
    auth.uid() = coach_id
  );

-- ============================================================================
-- RESOURCE COLLECTION ITEMS POLICIES
-- ============================================================================

-- Coaches can view items in their collections
CREATE POLICY "Coaches can view their collection items"
  ON resource_collection_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM resource_collections
      WHERE id = resource_collection_items.collection_id
      AND coach_id = auth.uid()
    )
  );

-- Coaches can add items to their collections
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
      WHERE id = resource_collection_items.resource_id
      AND user_id = auth.uid()
    )
  );

-- Coaches can update items in their collections
CREATE POLICY "Coaches can update their collection items"
  ON resource_collection_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM resource_collections
      WHERE id = resource_collection_items.collection_id
      AND coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resource_collections
      WHERE id = resource_collection_items.collection_id
      AND coach_id = auth.uid()
    )
  );

-- Coaches can remove items from their collections
CREATE POLICY "Coaches can remove items from their collections"
  ON resource_collection_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM resource_collections
      WHERE id = resource_collection_items.collection_id
      AND coach_id = auth.uid()
    )
  );

-- ============================================================================
-- RESOURCE LIBRARY SETTINGS POLICIES
-- ============================================================================

-- Coaches can view their own library settings
CREATE POLICY "Coaches can view their own library settings"
  ON resource_library_settings
  FOR SELECT
  USING (
    auth.uid() = coach_id
  );

-- Coaches can insert their own library settings
CREATE POLICY "Coaches can create their own library settings"
  ON resource_library_settings
  FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id
    AND (
      SELECT user_metadata->>'role' FROM users WHERE id = auth.uid()
    ) IN ('coach', 'admin')
  );

-- Coaches can update their own library settings
CREATE POLICY "Coaches can update their own library settings"
  ON resource_library_settings
  FOR UPDATE
  USING (
    auth.uid() = coach_id
  )
  WITH CHECK (
    auth.uid() = coach_id
  );

-- ============================================================================
-- RESOURCE CLIENT PROGRESS POLICIES
-- ============================================================================

-- Clients can view their own progress
CREATE POLICY "Clients can view their own progress"
  ON resource_client_progress
  FOR SELECT
  USING (
    auth.uid() = client_id
  );

-- Coaches can view progress for their resources
CREATE POLICY "Coaches can view progress for their resources"
  ON resource_client_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_uploads
      WHERE id = resource_client_progress.resource_id
      AND user_id = auth.uid()
    )
  );

-- Clients can create their own progress records
CREATE POLICY "Clients can create their own progress"
  ON resource_client_progress
  FOR INSERT
  WITH CHECK (
    auth.uid() = client_id
    AND (
      SELECT user_metadata->>'role' FROM users WHERE id = auth.uid()
    ) = 'client'
  );

-- Clients can update their own progress
CREATE POLICY "Clients can update their own progress"
  ON resource_client_progress
  FOR UPDATE
  USING (
    auth.uid() = client_id
  )
  WITH CHECK (
    auth.uid() = client_id
  );

-- ============================================================================
-- FILE_UPLOADS POLICIES (for library resources)
-- ============================================================================

-- Add additional policies for library resource access
-- Note: These complement existing file_uploads policies

-- Coaches can view their library resources
CREATE POLICY "Coaches can view their library resources"
  ON file_uploads
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND is_library_resource = true
  );

-- Clients can view resources shared with them
CREATE POLICY "Clients can view shared library resources"
  ON file_uploads
  FOR SELECT
  USING (
    is_library_resource = true
    AND (
      -- Resource is public
      is_public = true
      OR
      -- Resource is explicitly shared with the client
      EXISTS (
        SELECT 1 FROM file_shares
        WHERE file_shares.file_id = file_uploads.id
        AND file_shares.shared_with = auth.uid()
        AND (file_shares.expires_at IS NULL OR file_shares.expires_at > NOW())
      )
      OR
      -- Resource is shared with all clients and user is client of the coach
      (
        shared_with_all_clients = true
        AND EXISTS (
          SELECT 1 FROM sessions
          WHERE sessions.coach_id = file_uploads.user_id
          AND sessions.client_id = auth.uid()
        )
      )
    )
  );

-- Coaches can update their library resources
CREATE POLICY "Coaches can update their library resources"
  ON file_uploads
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND is_library_resource = true
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_library_resource = true
  );

-- Coaches can delete their library resources
CREATE POLICY "Coaches can delete their library resources"
  ON file_uploads
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND is_library_resource = true
  );

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_coach_collection_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_resource_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_resource_completed(UUID, UUID) TO authenticated;

-- Add indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_resource_collections_coach_id ON resource_collections(coach_id);
CREATE INDEX IF NOT EXISTS idx_resource_collection_items_collection_id ON resource_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_resource_collection_items_resource_id ON resource_collection_items(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_library_settings_coach_id ON resource_library_settings(coach_id);
CREATE INDEX IF NOT EXISTS idx_resource_client_progress_client_id ON resource_client_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_resource_client_progress_resource_id ON resource_client_progress(resource_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_library_resource ON file_uploads(is_library_resource) WHERE is_library_resource = true;
CREATE INDEX IF NOT EXISTS idx_file_uploads_shared_all ON file_uploads(shared_with_all_clients, user_id) WHERE shared_with_all_clients = true;

-- Add helpful comments
COMMENT ON POLICY "Coaches can view their own collections" ON resource_collections IS
  'Allows coaches to view only their own resource collections';

COMMENT ON POLICY "Clients can view shared library resources" ON file_uploads IS
  'Allows clients to view resources that are public, explicitly shared with them, or shared with all clients of their coaches';

COMMENT ON POLICY "Coaches can view progress for their resources" ON resource_client_progress IS
  'Allows coaches to view client progress for their resources';

COMMENT ON POLICY "Clients can view their own progress" ON resource_client_progress IS
  'Allows clients to view and track their own resource progress';
