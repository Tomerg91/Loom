-- ============================================================================
-- Resource Library Schema Migration
-- ============================================================================
-- This migration creates the database schema for the Resource Library feature.
-- It extends the existing file_uploads table and adds new tables for:
-- - Resource collections (grouping related resources)
-- - Resource library settings (per-coach preferences)
-- - Resource client progress (tracking client engagement)
--
-- Key Changes:
-- 1. Adds library-specific columns to file_uploads (is_library_resource, etc.)
-- 2. Creates resource_collections table for organizing resources
-- 3. Creates resource_collection_items for many-to-many collection relationships
-- 4. Creates resource_library_settings for coach preferences
-- 5. Creates resource_client_progress for tracking client engagement
-- 6. Adds indexes for query performance
-- 7. Creates triggers for auto-updating timestamps
-- ============================================================================

-- ============================================================================
-- 1. EXTEND EXISTING file_uploads TABLE
-- ============================================================================
-- Add library-specific columns to the existing file_uploads table
-- This allows us to differentiate library resources from session files

ALTER TABLE file_uploads
  ADD COLUMN IF NOT EXISTS is_library_resource BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shared_with_all_clients BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_count INTEGER NOT NULL DEFAULT 0;

-- Add indexes for library-specific queries
-- These indexes optimize queries for library resources and public resources

CREATE INDEX IF NOT EXISTS idx_file_uploads_library_resources
  ON file_uploads(user_id, is_library_resource)
  WHERE is_library_resource = TRUE;

CREATE INDEX IF NOT EXISTS idx_file_uploads_public_resources
  ON file_uploads(is_public, is_library_resource)
  WHERE is_public = TRUE AND is_library_resource = TRUE;

-- ============================================================================
-- 2. RESOURCE COLLECTIONS TABLE
-- ============================================================================
-- Allows coaches to group related resources into named collections
-- (e.g., "Welcome Kit", "Leadership Module 1", "Onboarding Package")

CREATE TABLE IF NOT EXISTS resource_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Emoji or icon name (e.g., "📚", "folder-open")
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT resource_collections_name_length CHECK (length(name) BETWEEN 1 AND 100),
    CONSTRAINT resource_collections_coach_name_unique UNIQUE (coach_id, name)
);

-- Index for querying coach's active collections
CREATE INDEX IF NOT EXISTS idx_resource_collections_coach
  ON resource_collections(coach_id, is_archived);

-- Index for sorting collections
CREATE INDEX IF NOT EXISTS idx_resource_collections_sort
  ON resource_collections(coach_id, sort_order)
  WHERE is_archived = FALSE;

-- ============================================================================
-- 3. RESOURCE COLLECTION ITEMS TABLE
-- ============================================================================
-- Many-to-many relationship between collections and resources
-- Allows a resource to be in multiple collections

CREATE TABLE IF NOT EXISTS resource_collection_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID REFERENCES resource_collections(id) ON DELETE CASCADE NOT NULL,
    file_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate resource in same collection
    CONSTRAINT resource_collection_items_unique UNIQUE (collection_id, file_id)
);

-- Index for querying resources in a collection (with sort order)
CREATE INDEX IF NOT EXISTS idx_resource_collection_items_collection
  ON resource_collection_items(collection_id, sort_order);

-- Index for finding all collections containing a specific resource
CREATE INDEX IF NOT EXISTS idx_resource_collection_items_file
  ON resource_collection_items(file_id);

-- ============================================================================
-- 4. RESOURCE LIBRARY SETTINGS TABLE
-- ============================================================================
-- Per-coach configuration for resource library behavior

CREATE TABLE IF NOT EXISTS resource_library_settings (
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    default_permission file_permission_type NOT NULL DEFAULT 'download',
    auto_share_new_clients BOOLEAN NOT NULL DEFAULT FALSE,
    storage_limit_mb INTEGER NOT NULL DEFAULT 1000,
    allow_client_requests BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT resource_library_settings_storage_limit CHECK (storage_limit_mb > 0)
);

-- ============================================================================
-- 5. RESOURCE CLIENT PROGRESS TABLE
-- ============================================================================
-- Tracks client engagement with shared resources
-- Used for analytics and progress tracking

CREATE TABLE IF NOT EXISTS resource_client_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One progress record per client per resource
    CONSTRAINT resource_client_progress_unique UNIQUE (file_id, client_id),

    -- Logical constraints
    CONSTRAINT resource_client_progress_access_count_positive CHECK (access_count >= 0),
    CONSTRAINT resource_client_progress_dates_logical CHECK (
        viewed_at IS NULL OR
        completed_at IS NULL OR
        completed_at >= viewed_at
    )
);

-- Index for querying client's progress across all resources
CREATE INDEX IF NOT EXISTS idx_resource_client_progress_client
  ON resource_client_progress(client_id, completed_at);

-- Index for querying all clients who accessed a resource
CREATE INDEX IF NOT EXISTS idx_resource_client_progress_file
  ON resource_client_progress(file_id, last_accessed_at DESC);

-- Index for finding completed resources
CREATE INDEX IF NOT EXISTS idx_resource_client_progress_completed
  ON resource_client_progress(client_id, file_id)
  WHERE completed_at IS NOT NULL;

-- ============================================================================
-- 6. TRIGGER FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp for resource_collections
CREATE OR REPLACE FUNCTION update_resource_collections_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER resource_collections_updated_at_trigger
    BEFORE UPDATE ON resource_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_collections_updated_at();

-- Update updated_at timestamp for resource_library_settings
CREATE OR REPLACE FUNCTION update_resource_library_settings_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER resource_library_settings_updated_at_trigger
    BEFORE UPDATE ON resource_library_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_library_settings_updated_at();

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get collection count for a coach
CREATE OR REPLACE FUNCTION get_coach_collection_count(coach_uuid UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    collection_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO collection_count
    FROM resource_collections
    WHERE coach_id = coach_uuid AND is_archived = FALSE;

    RETURN COALESCE(collection_count, 0);
END;
$$;

-- Function to get resource count in a collection
CREATE OR REPLACE FUNCTION get_collection_resource_count(collection_uuid UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    resource_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO resource_count
    FROM resource_collection_items
    WHERE collection_id = collection_uuid;

    RETURN COALESCE(resource_count, 0);
END;
$$;

-- Function to increment resource view count
CREATE OR REPLACE FUNCTION increment_resource_view_count(resource_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE file_uploads
    SET view_count = view_count + 1
    WHERE id = resource_id AND is_library_resource = TRUE;
END;
$$;

-- Function to track resource completion
CREATE OR REPLACE FUNCTION mark_resource_completed(resource_id UUID, client_uuid UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO resource_client_progress (
        file_id,
        client_id,
        completed_at,
        last_accessed_at,
        access_count
    ) VALUES (
        resource_id,
        client_uuid,
        NOW(),
        NOW(),
        1
    )
    ON CONFLICT (file_id, client_id) DO UPDATE SET
        completed_at = CASE
            WHEN resource_client_progress.completed_at IS NULL THEN NOW()
            ELSE resource_client_progress.completed_at
        END,
        last_accessed_at = NOW(),
        access_count = resource_client_progress.access_count + 1;

    -- Update completion count on file_uploads
    UPDATE file_uploads
    SET completion_count = (
        SELECT COUNT(*)
        FROM resource_client_progress
        WHERE file_id = resource_id AND completed_at IS NOT NULL
    )
    WHERE id = resource_id;
END;
$$;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================
-- Ensure authenticated users can access these tables via RLS
-- (RLS policies will be added in a subsequent migration)

GRANT SELECT, INSERT, UPDATE, DELETE ON resource_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON resource_collection_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON resource_library_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON resource_client_progress TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_coach_collection_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_resource_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_resource_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_resource_completed(UUID, UUID) TO authenticated;

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE resource_collections IS 'Stores named collections of resources (e.g., "Welcome Kit", "Module 1")';
COMMENT ON TABLE resource_collection_items IS 'Many-to-many relationship between collections and file_uploads';
COMMENT ON TABLE resource_library_settings IS 'Per-coach settings for resource library behavior';
COMMENT ON TABLE resource_client_progress IS 'Tracks client engagement with resources (views, completion)';

COMMENT ON COLUMN file_uploads.is_library_resource IS 'Differentiates library resources from session files';
COMMENT ON COLUMN file_uploads.is_public IS 'Future: allows resources to be listed in public marketplace';
COMMENT ON COLUMN file_uploads.shared_with_all_clients IS 'Indicates resource was shared with all clients';
COMMENT ON COLUMN file_uploads.view_count IS 'Number of times resource has been viewed';
COMMENT ON COLUMN file_uploads.completion_count IS 'Number of clients who marked resource as complete';

COMMENT ON FUNCTION get_coach_collection_count(UUID) IS 'Returns count of active collections for a coach';
COMMENT ON FUNCTION get_collection_resource_count(UUID) IS 'Returns count of resources in a collection';
COMMENT ON FUNCTION increment_resource_view_count(UUID) IS 'Increments view count for a resource';
COMMENT ON FUNCTION mark_resource_completed(UUID, UUID) IS 'Marks a resource as completed by a client';
