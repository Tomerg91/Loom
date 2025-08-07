-- File Versioning System Migration
-- Creates tables and functions for comprehensive file version management

-- Create file_versions table to track all file versions
CREATE TABLE IF NOT EXISTS file_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES file_uploads(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- File storage details
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash TEXT NOT NULL, -- For duplicate detection and integrity
    
    -- Version metadata
    description TEXT,
    change_summary TEXT, -- What changed in this version
    is_major_version BOOLEAN DEFAULT FALSE,
    is_current_version BOOLEAN DEFAULT FALSE,
    
    -- Version creation details
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Version comparison metadata
    diff_metadata JSONB, -- Stores diff information for comparison
    
    -- Constraints
    UNIQUE(file_id, version_number),
    CHECK(version_number > 0),
    CHECK(file_size >= 0)
);

-- Add version-related fields to existing file_uploads table
ALTER TABLE file_uploads 
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS version_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS versioning_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS auto_version_on_update BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS max_versions INTEGER DEFAULT 10; -- Limit versions per file

-- Create version-specific sharing permissions table
CREATE TABLE IF NOT EXISTS file_version_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_id UUID NOT NULL REFERENCES file_versions(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES file_uploads(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Permission settings
    permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'download', 'comment')),
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Sharing metadata
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(version_id, shared_with)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_created_at ON file_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_versions_current ON file_versions(file_id, is_current_version) WHERE is_current_version = TRUE;
CREATE INDEX IF NOT EXISTS idx_file_versions_hash ON file_versions(file_hash);
CREATE INDEX IF NOT EXISTS idx_file_version_shares_version_id ON file_version_shares(version_id);
CREATE INDEX IF NOT EXISTS idx_file_version_shares_shared_with ON file_version_shares(shared_with);

-- Create function to get next version number
CREATE OR REPLACE FUNCTION get_next_version_number(target_file_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM file_versions
    WHERE file_id = target_file_id;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Create function to create a new file version
CREATE OR REPLACE FUNCTION create_file_version(
    p_file_id UUID,
    p_storage_path TEXT,
    p_filename TEXT,
    p_original_filename TEXT,
    p_file_type TEXT,
    p_file_size BIGINT,
    p_file_hash TEXT,
    p_description TEXT DEFAULT NULL,
    p_change_summary TEXT DEFAULT NULL,
    p_is_major_version BOOLEAN DEFAULT FALSE,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_version_number INTEGER;
    v_version_id UUID;
    v_max_versions INTEGER;
BEGIN
    -- Get next version number
    SELECT get_next_version_number(p_file_id) INTO v_version_number;
    
    -- Get max versions setting
    SELECT max_versions INTO v_max_versions
    FROM file_uploads
    WHERE id = p_file_id;
    
    -- Mark all existing versions as not current
    UPDATE file_versions 
    SET is_current_version = FALSE 
    WHERE file_id = p_file_id;
    
    -- Insert new version
    INSERT INTO file_versions (
        file_id, version_number, storage_path, filename, original_filename,
        file_type, file_size, file_hash, description, change_summary,
        is_major_version, is_current_version, created_by
    ) VALUES (
        p_file_id, v_version_number, p_storage_path, p_filename, p_original_filename,
        p_file_type, p_file_size, p_file_hash, p_description, p_change_summary,
        p_is_major_version, TRUE, p_created_by
    ) RETURNING id INTO v_version_id;
    
    -- Update file_uploads with new version info
    UPDATE file_uploads 
    SET 
        current_version = v_version_number,
        version_count = v_version_number,
        filename = p_filename,
        file_type = p_file_type,
        file_size = p_file_size,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_file_id;
    
    -- Clean up old versions if exceeding max_versions
    IF v_max_versions > 0 THEN
        DELETE FROM file_versions 
        WHERE file_id = p_file_id 
        AND version_number <= (v_version_number - v_max_versions);
    END IF;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to rollback to a specific version
CREATE OR REPLACE FUNCTION rollback_to_version(
    p_file_id UUID,
    p_target_version INTEGER,
    p_rollback_by UUID,
    p_rollback_description TEXT DEFAULT 'Rolled back to previous version'
)
RETURNS UUID AS $$
DECLARE
    v_target_version_data RECORD;
    v_new_version_id UUID;
BEGIN
    -- Get the target version data
    SELECT * INTO v_target_version_data
    FROM file_versions
    WHERE file_id = p_file_id AND version_number = p_target_version;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Version % not found for file %', p_target_version, p_file_id;
    END IF;
    
    -- Create a new version based on the target version
    SELECT create_file_version(
        p_file_id,
        v_target_version_data.storage_path,
        v_target_version_data.filename,
        v_target_version_data.original_filename,
        v_target_version_data.file_type,
        v_target_version_data.file_size,
        v_target_version_data.file_hash,
        p_rollback_description,
        'Rolled back from version ' || p_target_version,
        FALSE,
        p_rollback_by
    ) INTO v_new_version_id;
    
    RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get version comparison data
CREATE OR REPLACE FUNCTION get_version_comparison(
    p_file_id UUID,
    p_version_a INTEGER,
    p_version_b INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_version_a RECORD;
    v_version_b RECORD;
    v_comparison JSONB;
BEGIN
    -- Get version A data
    SELECT * INTO v_version_a
    FROM file_versions
    WHERE file_id = p_file_id AND version_number = p_version_a;
    
    -- Get version B data
    SELECT * INTO v_version_b
    FROM file_versions
    WHERE file_id = p_file_id AND version_number = p_version_b;
    
    -- Build comparison object
    v_comparison := jsonb_build_object(
        'file_id', p_file_id,
        'comparison', jsonb_build_object(
            'version_a', jsonb_build_object(
                'version_number', v_version_a.version_number,
                'filename', v_version_a.filename,
                'file_size', v_version_a.file_size,
                'file_type', v_version_a.file_type,
                'created_at', v_version_a.created_at,
                'created_by', v_version_a.created_by,
                'change_summary', v_version_a.change_summary
            ),
            'version_b', jsonb_build_object(
                'version_number', v_version_b.version_number,
                'filename', v_version_b.filename,
                'file_size', v_version_b.file_size,
                'file_type', v_version_b.file_type,
                'created_at', v_version_b.created_at,
                'created_by', v_version_b.created_by,
                'change_summary', v_version_b.change_summary
            ),
            'differences', jsonb_build_object(
                'size_change', v_version_b.file_size - v_version_a.file_size,
                'name_changed', v_version_a.filename != v_version_b.filename,
                'type_changed', v_version_a.file_type != v_version_b.file_type,
                'time_difference', EXTRACT(EPOCH FROM (v_version_b.created_at - v_version_a.created_at))
            )
        )
    );
    
    RETURN v_comparison;
END;
$$ LANGUAGE plpgsql;

-- Create function to get file version statistics
CREATE OR REPLACE FUNCTION get_file_version_stats(p_file_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'file_id', p_file_id,
        'total_versions', COUNT(*),
        'current_version', MAX(version_number) FILTER (WHERE is_current_version = TRUE),
        'latest_version', MAX(version_number),
        'total_size', SUM(file_size),
        'major_versions', COUNT(*) FILTER (WHERE is_major_version = TRUE),
        'first_version_date', MIN(created_at),
        'latest_version_date', MAX(created_at),
        'version_creators', jsonb_agg(DISTINCT created_by)
    ) INTO v_stats
    FROM file_versions
    WHERE file_id = p_file_id;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for file_versions
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;

-- Users can view versions of files they own or have access to
CREATE POLICY "Users can view accessible file versions" ON file_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM file_uploads f
            WHERE f.id = file_versions.file_id
            AND f.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM file_shares fs
            JOIN file_uploads f ON f.id = fs.file_id
            WHERE f.id = file_versions.file_id
            AND fs.shared_with = auth.uid()
            AND (fs.expires_at IS NULL OR fs.expires_at > CURRENT_TIMESTAMP)
        )
    );

-- Users can create versions for files they own
CREATE POLICY "Users can create versions for their files" ON file_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM file_uploads f
            WHERE f.id = file_versions.file_id
            AND f.user_id = auth.uid()
        )
    );

-- Users can update versions they created for files they own
CREATE POLICY "Users can update their file versions" ON file_versions
    FOR UPDATE USING (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM file_uploads f
            WHERE f.id = file_versions.file_id
            AND f.user_id = auth.uid()
        )
    );

-- Users can delete versions they created for files they own (except current version)
CREATE POLICY "Users can delete non-current versions they created" ON file_versions
    FOR DELETE USING (
        created_by = auth.uid() AND
        is_current_version = FALSE AND
        EXISTS (
            SELECT 1 FROM file_uploads f
            WHERE f.id = file_versions.file_id
            AND f.user_id = auth.uid()
        )
    );

-- RLS policies for file_version_shares
ALTER TABLE file_version_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares they created or that are shared with them
CREATE POLICY "Users can view relevant version shares" ON file_version_shares
    FOR SELECT USING (
        shared_by = auth.uid() OR shared_with = auth.uid()
    );

-- Users can create version shares for files they own
CREATE POLICY "Users can create version shares for their files" ON file_version_shares
    FOR INSERT WITH CHECK (
        shared_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM file_uploads f
            JOIN file_versions fv ON fv.file_id = f.id
            WHERE fv.id = file_version_shares.version_id
            AND f.user_id = auth.uid()
        )
    );

-- Users can update version shares they created
CREATE POLICY "Users can update version shares they created" ON file_version_shares
    FOR UPDATE USING (shared_by = auth.uid());

-- Users can delete version shares they created
CREATE POLICY "Users can delete version shares they created" ON file_version_shares
    FOR DELETE USING (shared_by = auth.uid());

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_file_version_shares_updated_at
    BEFORE UPDATE ON file_version_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();