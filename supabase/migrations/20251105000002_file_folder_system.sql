-- File Folder Organization System
-- Sprint 01 - Task 1.3.2: Implement Folder Schema for Files
-- Adds hierarchical folder structure for file organization

-- Create folders table for organizing files
CREATE TABLE IF NOT EXISTS file_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (LENGTH(name) > 0 AND LENGTH(name) <= 255),
    description TEXT,
    color TEXT CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'), -- Hex color for UI
    icon TEXT, -- Icon name for UI
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    item_count INTEGER NOT NULL DEFAULT 0, -- Cached count of immediate children
    total_size_bytes BIGINT NOT NULL DEFAULT 0, -- Cached total size of files in folder
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT file_folders_no_self_parent CHECK (id != parent_folder_id),
    CONSTRAINT file_folders_unique_name_per_parent UNIQUE (user_id, parent_folder_id, name)
);

-- Add folder_id to file_uploads table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'file_uploads' AND column_name = 'folder_id'
    ) THEN
        ALTER TABLE file_uploads
        ADD COLUMN folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL;

        -- Add index for folder lookups
        CREATE INDEX idx_file_uploads_folder_id ON file_uploads(folder_id)
        WHERE folder_id IS NOT NULL;
    END IF;
END $$;

-- Create folder_shares table for sharing entire folders
CREATE TABLE IF NOT EXISTS folder_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE NOT NULL,
    shared_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    shared_with UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE, -- Can add/remove files
    can_share BOOLEAN NOT NULL DEFAULT FALSE, -- Can share with others
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT folder_shares_no_self_sharing CHECK (shared_by != shared_with),
    CONSTRAINT folder_shares_unique_sharing UNIQUE (folder_id, shared_by, shared_with),
    CONSTRAINT folder_shares_future_expiration CHECK (
        expires_at IS NULL OR expires_at > created_at
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_folders_user_id ON file_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_file_folders_parent_id ON file_folders(parent_folder_id)
WHERE parent_folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_file_folders_created_at ON file_folders(created_at);
CREATE INDEX IF NOT EXISTS idx_file_folders_is_shared ON file_folders(is_shared)
WHERE is_shared = TRUE;

CREATE INDEX IF NOT EXISTS idx_folder_shares_folder_id ON folder_shares(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_shares_shared_with ON folder_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_folder_shares_shared_by ON folder_shares(shared_by);

-- Trigger to update folder updated_at timestamp
CREATE OR REPLACE FUNCTION update_file_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER file_folders_updated_at_trigger
    BEFORE UPDATE ON file_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_file_folders_updated_at();

-- Function to get folder tree (recursive)
CREATE OR REPLACE FUNCTION get_folder_tree(
    p_user_id UUID,
    p_parent_folder_id UUID DEFAULT NULL,
    p_max_depth INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    parent_folder_id UUID,
    name TEXT,
    description TEXT,
    color TEXT,
    icon TEXT,
    is_shared BOOLEAN,
    item_count INTEGER,
    total_size_bytes BIGINT,
    depth INTEGER,
    path TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE folder_hierarchy AS (
        -- Base case: root folders or specific parent
        SELECT
            f.id,
            f.user_id,
            f.parent_folder_id,
            f.name,
            f.description,
            f.color,
            f.icon,
            f.is_shared,
            f.item_count,
            f.total_size_bytes,
            0 AS depth,
            f.name::TEXT AS path,
            f.created_at,
            f.updated_at
        FROM file_folders f
        WHERE f.user_id = p_user_id
        AND (
            (p_parent_folder_id IS NULL AND f.parent_folder_id IS NULL) OR
            (p_parent_folder_id IS NOT NULL AND f.parent_folder_id = p_parent_folder_id)
        )

        UNION ALL

        -- Recursive case: child folders
        SELECT
            f.id,
            f.user_id,
            f.parent_folder_id,
            f.name,
            f.description,
            f.color,
            f.icon,
            f.is_shared,
            f.item_count,
            f.total_size_bytes,
            fh.depth + 1,
            (fh.path || ' / ' || f.name)::TEXT,
            f.created_at,
            f.updated_at
        FROM file_folders f
        INNER JOIN folder_hierarchy fh ON f.parent_folder_id = fh.id
        WHERE fh.depth < p_max_depth
    )
    SELECT * FROM folder_hierarchy
    ORDER BY path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Function to get folder contents (files and subfolders)
CREATE OR REPLACE FUNCTION get_folder_contents(
    p_folder_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Check folder ownership or access
    IF NOT EXISTS (
        SELECT 1 FROM file_folders
        WHERE id = p_folder_id
        AND (user_id = p_user_id OR is_shared = TRUE)
    ) THEN
        RAISE EXCEPTION 'Folder not found or access denied';
    END IF;

    -- Build JSON result with subfolders and files
    SELECT json_build_object(
        'folders', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', f.id,
                'name', f.name,
                'description', f.description,
                'color', f.color,
                'icon', f.icon,
                'is_shared', f.is_shared,
                'item_count', f.item_count,
                'total_size_bytes', f.total_size_bytes,
                'created_at', f.created_at,
                'updated_at', f.updated_at
            )), '[]'::json)
            FROM file_folders f
            WHERE f.parent_folder_id = p_folder_id
            AND f.user_id = p_user_id
            ORDER BY f.name
        ),
        'files', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', fu.id,
                'filename', fu.filename,
                'file_type', fu.file_type,
                'file_size', fu.file_size,
                'file_category', fu.file_category,
                'description', fu.description,
                'tags', fu.tags,
                'is_shared', fu.is_shared,
                'download_count', fu.download_count,
                'created_at', fu.created_at,
                'updated_at', fu.updated_at
            )), '[]'::json)
            FROM file_uploads fu
            WHERE fu.folder_id = p_folder_id
            AND fu.user_id = p_user_id
            ORDER BY fu.created_at DESC
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Function to create a new folder
CREATE OR REPLACE FUNCTION create_folder(
    p_user_id UUID,
    p_name TEXT,
    p_parent_folder_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_color TEXT DEFAULT NULL,
    p_icon TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_folder_id UUID;
BEGIN
    -- Validate parent folder ownership if specified
    IF p_parent_folder_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM file_folders
            WHERE id = p_parent_folder_id AND user_id = p_user_id
        ) THEN
            RAISE EXCEPTION 'Parent folder not found or access denied';
        END IF;
    END IF;

    -- Create folder
    INSERT INTO file_folders (
        user_id, parent_folder_id, name, description, color, icon
    )
    VALUES (
        p_user_id, p_parent_folder_id, p_name, p_description, p_color, p_icon
    )
    RETURNING id INTO v_folder_id;

    -- Update parent folder item count if applicable
    IF p_parent_folder_id IS NOT NULL THEN
        PERFORM update_folder_stats(p_parent_folder_id);
    END IF;

    RETURN v_folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Function to move file to folder
CREATE OR REPLACE FUNCTION move_file_to_folder(
    p_file_id UUID,
    p_folder_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_folder_id UUID;
BEGIN
    -- Verify file ownership
    SELECT folder_id INTO v_old_folder_id
    FROM file_uploads
    WHERE id = p_file_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'File not found or access denied';
    END IF;

    -- Verify folder ownership if moving to a folder
    IF p_folder_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM file_folders
            WHERE id = p_folder_id AND user_id = p_user_id
        ) THEN
            RAISE EXCEPTION 'Folder not found or access denied';
        END IF;
    END IF;

    -- Update file folder
    UPDATE file_uploads
    SET folder_id = p_folder_id, updated_at = NOW()
    WHERE id = p_file_id;

    -- Update old folder stats
    IF v_old_folder_id IS NOT NULL THEN
        PERFORM update_folder_stats(v_old_folder_id);
    END IF;

    -- Update new folder stats
    IF p_folder_id IS NOT NULL THEN
        PERFORM update_folder_stats(p_folder_id);
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Function to update folder statistics
CREATE OR REPLACE FUNCTION update_folder_stats(p_folder_id UUID)
RETURNS VOID AS $$
DECLARE
    v_item_count INTEGER;
    v_total_size BIGINT;
BEGIN
    -- Count subfolders and files
    SELECT
        (SELECT COUNT(*) FROM file_folders WHERE parent_folder_id = p_folder_id) +
        (SELECT COUNT(*) FROM file_uploads WHERE folder_id = p_folder_id),
        COALESCE((SELECT SUM(file_size) FROM file_uploads WHERE folder_id = p_folder_id), 0)
    INTO v_item_count, v_total_size;

    -- Update folder stats
    UPDATE file_folders
    SET
        item_count = v_item_count,
        total_size_bytes = v_total_size,
        updated_at = NOW()
    WHERE id = p_folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Function to delete folder (with safety checks)
CREATE OR REPLACE FUNCTION delete_folder(
    p_folder_id UUID,
    p_user_id UUID,
    p_force BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_parent_folder_id UUID;
    v_has_children BOOLEAN;
BEGIN
    -- Verify folder ownership
    SELECT parent_folder_id INTO v_parent_folder_id
    FROM file_folders
    WHERE id = p_folder_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Folder not found or access denied';
    END IF;

    -- Check if folder has children
    SELECT EXISTS (
        SELECT 1 FROM file_folders WHERE parent_folder_id = p_folder_id
        UNION
        SELECT 1 FROM file_uploads WHERE folder_id = p_folder_id
    ) INTO v_has_children;

    IF v_has_children AND NOT p_force THEN
        RAISE EXCEPTION 'Folder is not empty. Use force=true to delete non-empty folders.';
    END IF;

    -- Delete folder (CASCADE will handle children)
    DELETE FROM file_folders WHERE id = p_folder_id;

    -- Update parent folder stats
    IF v_parent_folder_id IS NOT NULL THEN
        PERFORM update_folder_stats(v_parent_folder_id);
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- RLS Policies for file_folders
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;

-- Users can view their own folders
CREATE POLICY file_folders_select_own ON file_folders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can view shared folders
CREATE POLICY file_folders_select_shared ON file_folders
    FOR SELECT
    USING (
        is_shared = TRUE OR
        EXISTS (
            SELECT 1 FROM folder_shares
            WHERE folder_shares.folder_id = file_folders.id
            AND folder_shares.shared_with = auth.uid()
            AND (folder_shares.expires_at IS NULL OR folder_shares.expires_at > NOW())
        )
    );

-- Users can create their own folders
CREATE POLICY file_folders_insert_own ON file_folders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own folders
CREATE POLICY file_folders_update_own ON file_folders
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own folders
CREATE POLICY file_folders_delete_own ON file_folders
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for folder_shares
ALTER TABLE folder_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares they created or received
CREATE POLICY folder_shares_select ON folder_shares
    FOR SELECT
    USING (auth.uid() = shared_by OR auth.uid() = shared_with);

-- Users can create shares for their folders
CREATE POLICY folder_shares_insert ON folder_shares
    FOR INSERT
    WITH CHECK (
        auth.uid() = shared_by AND
        EXISTS (
            SELECT 1 FROM file_folders
            WHERE file_folders.id = folder_shares.folder_id
            AND file_folders.user_id = auth.uid()
        )
    );

-- Users can delete shares they created
CREATE POLICY folder_shares_delete ON folder_shares
    FOR DELETE
    USING (auth.uid() = shared_by);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_folder_tree(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_folder_contents(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_folder(UUID, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION move_file_to_folder(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_folder_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_folder(UUID, UUID, BOOLEAN) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE file_folders IS 'Hierarchical folder structure for organizing files';
COMMENT ON TABLE folder_shares IS 'Sharing permissions for folders';
COMMENT ON FUNCTION get_folder_tree(UUID, UUID, INTEGER) IS 'Get recursive folder tree for a user';
COMMENT ON FUNCTION get_folder_contents(UUID, UUID) IS 'Get all files and subfolders in a folder';
COMMENT ON FUNCTION create_folder(UUID, TEXT, UUID, TEXT, TEXT, TEXT) IS 'Create a new folder';
COMMENT ON FUNCTION move_file_to_folder(UUID, UUID, UUID) IS 'Move a file to a different folder';
COMMENT ON FUNCTION update_folder_stats(UUID) IS 'Update folder statistics (item count, size)';
COMMENT ON FUNCTION delete_folder(UUID, UUID, BOOLEAN) IS 'Delete a folder with safety checks';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'File folder system installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Hierarchical folder structure';
    RAISE NOTICE '  - Folder sharing with permissions';
    RAISE NOTICE '  - Automatic statistics tracking';
    RAISE NOTICE '  - RLS policies for security';
END $$;
