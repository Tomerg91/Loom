-- Row Level Security policies for File Versioning System

-- Ensure comparison table exists (if a previous migration skipped it)
CREATE TABLE IF NOT EXISTS file_version_comparisons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version_a_id UUID NOT NULL REFERENCES file_versions(id) ON DELETE CASCADE,
  version_b_id UUID NOT NULL REFERENCES file_versions(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  result JSONB
);

-- Enable RLS on new tables
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_version_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_version_comparisons ENABLE ROW LEVEL SECURITY;

-- File Versions RLS Policies

-- Users can view versions of files they own or have shared access to
DROP POLICY IF EXISTS "Users can view file versions they have access to" ON file_versions;
CREATE POLICY "Users can view file versions they have access to" ON file_versions
    FOR SELECT USING (
        -- File owner can see all versions
        EXISTS (
            SELECT 1 FROM file_uploads fu
            WHERE fu.id = file_versions.file_id 
            AND fu.user_id = auth.uid()
        )
        OR
        -- Users with file sharing access can see versions
        EXISTS (
            SELECT 1 FROM file_shares fs
            JOIN file_uploads fu ON fu.id = fs.file_id
            WHERE fu.id = file_versions.file_id
            AND fs.shared_with = auth.uid()
            AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
        )
        OR
        -- Users with version-specific sharing access
        EXISTS (
            SELECT 1 FROM file_version_shares fvs
            WHERE fvs.version_id = file_versions.id
            AND fvs.shared_with = auth.uid()
            AND (fvs.expires_at IS NULL OR fvs.expires_at > NOW())
        )
        OR
        -- Admin users can see all versions
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- File owners can create new versions
DROP POLICY IF EXISTS "File owners can create versions" ON file_versions;
CREATE POLICY "File owners can create versions" ON file_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM file_uploads fu
            WHERE fu.id = file_versions.file_id 
            AND fu.user_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- File owners can update their file versions (limited fields)
DROP POLICY IF EXISTS "File owners can update versions" ON file_versions;
CREATE POLICY "File owners can update versions" ON file_versions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM file_uploads fu
            WHERE fu.id = file_versions.file_id 
            AND fu.user_id = auth.uid()
        )
    );

-- File owners can delete their file versions (with restrictions)
DROP POLICY IF EXISTS "File owners can delete versions" ON file_versions;
CREATE POLICY "File owners can delete versions" ON file_versions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM file_uploads fu
            WHERE fu.id = file_versions.file_id 
            AND fu.user_id = auth.uid()
        )
        AND is_current_version = FALSE
    );

-- File Version Shares RLS Policies

-- Users can view version shares they're involved in
DROP POLICY IF EXISTS "Users can view their version shares" ON file_version_shares;
CREATE POLICY "Users can view their version shares" ON file_version_shares
    FOR SELECT USING (
        shared_by = auth.uid() 
        OR shared_with = auth.uid()
        OR
        -- File owners can see all shares of their file versions
        EXISTS (
            SELECT 1 FROM file_versions fv
            JOIN file_uploads fu ON fu.id = fv.file_id
            WHERE fv.id = file_version_shares.version_id
            AND fu.user_id = auth.uid()
        )
        OR
        -- Admin users can see all version shares
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Users can create version shares for files they own or have edit permission on
DROP POLICY IF EXISTS "Users can create version shares" ON file_version_shares;
CREATE POLICY "Users can create version shares" ON file_version_shares
    FOR INSERT WITH CHECK (
        shared_by = auth.uid()
        AND (
            -- File owner can share any version
            EXISTS (
                SELECT 1 FROM file_versions fv
                JOIN file_uploads fu ON fu.id = fv.file_id
                WHERE fv.id = file_version_shares.version_id
                AND fu.user_id = auth.uid()
            )
            OR
            -- Users with edit permission can share
            EXISTS (
                SELECT 1 FROM file_versions fv
                JOIN file_uploads fu ON fu.id = fv.file_id
                JOIN file_shares fs ON fs.file_id = fu.id
                WHERE fv.id = file_version_shares.version_id
                AND fs.shared_with = auth.uid()
                AND fs.permission_type = 'edit'
                AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
            )
        )
    );

-- Users can update version shares they created or for files they own
DROP POLICY IF EXISTS "Users can update their version shares" ON file_version_shares;
CREATE POLICY "Users can update their version shares" ON file_version_shares
    FOR UPDATE USING (
        shared_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM file_versions fv
            JOIN file_uploads fu ON fu.id = fv.file_id
            WHERE fv.id = file_version_shares.version_id
            AND fu.user_id = auth.uid()
        )
    );

-- Users can delete version shares they created or for files they own
DROP POLICY IF EXISTS "Users can delete their version shares" ON file_version_shares;
CREATE POLICY "Users can delete their version shares" ON file_version_shares
    FOR DELETE USING (
        shared_by = auth.uid()
        OR shared_with = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM file_versions fv
            JOIN file_uploads fu ON fu.id = fv.file_id
            WHERE fv.id = file_version_shares.version_id
            AND fu.user_id = auth.uid()
        )
    );

-- File Version Comparisons RLS Policies

-- Users can view comparisons for versions they have access to
DROP POLICY IF EXISTS "Users can view version comparisons they have access to" ON file_version_comparisons;
CREATE POLICY "Users can view version comparisons they have access to" ON file_version_comparisons
    FOR SELECT USING (
        -- User has access to both versions being compared
        EXISTS (
            SELECT 1 FROM file_versions fv
            JOIN file_uploads fu ON fu.id = fv.file_id
            WHERE fv.id = file_version_comparisons.version_a_id
            AND (
                fu.user_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM file_shares fs
                    WHERE fs.file_id = fu.id
                    AND fs.shared_with = auth.uid()
                    AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
                )
                OR
                EXISTS (
                    SELECT 1 FROM file_version_shares fvs
                    WHERE fvs.version_id = fv.id
                    AND fvs.shared_with = auth.uid()
                    AND (fvs.expires_at IS NULL OR fvs.expires_at > NOW())
                )
            )
        )
        AND
        EXISTS (
            SELECT 1 FROM file_versions fv
            JOIN file_uploads fu ON fu.id = fv.file_id
            WHERE fv.id = file_version_comparisons.version_b_id
            AND (
                fu.user_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM file_shares fs
                    WHERE fs.file_id = fu.id
                    AND fs.shared_with = auth.uid()
                    AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
                )
                OR
                EXISTS (
                    SELECT 1 FROM file_version_shares fvs
                    WHERE fvs.version_id = fv.id
                    AND fvs.shared_with = auth.uid()
                    AND (fvs.expires_at IS NULL OR fvs.expires_at > NOW())
                )
            )
        )
    );

-- Users can create comparisons for versions they have access to
DROP POLICY IF EXISTS "Users can create version comparisons" ON file_version_comparisons;
CREATE POLICY "Users can create version comparisons" ON file_version_comparisons
    FOR INSERT WITH CHECK (
        -- User has access to both versions being compared
        EXISTS (
            SELECT 1 FROM file_versions fv
            JOIN file_uploads fu ON fu.id = fv.file_id
            WHERE fv.id = file_version_comparisons.version_a_id
            AND (
                fu.user_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM file_shares fs
                    WHERE fs.file_id = fu.id
                    AND fs.shared_with = auth.uid()
                    AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
                )
            )
        )
        AND
        EXISTS (
            SELECT 1 FROM file_versions fv
            JOIN file_uploads fu ON fu.id = fv.file_id
            WHERE fv.id = file_version_comparisons.version_b_id
            AND (
                fu.user_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM file_shares fs
                    WHERE fs.file_id = fu.id
                    AND fs.shared_with = auth.uid()
                    AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
                )
            )
        )
    );

-- System/admin cleanup of comparisons
DROP POLICY IF EXISTS "System can manage version comparisons" ON file_version_comparisons;
CREATE POLICY "System can manage version comparisons" ON file_version_comparisons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Additional security functions

-- Function to check if user has version access
CREATE OR REPLACE FUNCTION user_has_version_access(
    user_id UUID, 
    version_id UUID, 
    required_permission TEXT DEFAULT 'view'
)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN := FALSE;
BEGIN
    -- Check if user owns the file
    SELECT EXISTS (
        SELECT 1 FROM file_versions fv
        JOIN file_uploads fu ON fu.id = fv.file_id
        WHERE fv.id = version_id AND fu.user_id = user_id
    ) INTO has_access;
    
    IF has_access THEN
        RETURN TRUE;
    END IF;
    
    -- Check file-level sharing
    IF required_permission IN ('view', 'download') THEN
        SELECT EXISTS (
            SELECT 1 FROM file_versions fv
            JOIN file_uploads fu ON fu.id = fv.file_id
            JOIN file_shares fs ON fs.file_id = fu.id
            WHERE fv.id = version_id 
            AND fs.shared_with = user_id
            AND fs.permission_type IN ('view', 'download', 'edit')
            AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
        ) INTO has_access;
        
        IF has_access THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Check edit permission
    IF required_permission = 'edit' THEN
        SELECT EXISTS (
            SELECT 1 FROM file_versions fv
            JOIN file_uploads fu ON fu.id = fv.file_id
            JOIN file_shares fs ON fs.file_id = fu.id
            WHERE fv.id = version_id 
            AND fs.shared_with = user_id
            AND fs.permission_type = 'edit'
            AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
        ) INTO has_access;
        
        IF has_access THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Check version-specific sharing
    SELECT EXISTS (
        SELECT 1 FROM file_version_shares fvs
        WHERE fvs.version_id = version_id
        AND fvs.shared_with = user_id
        AND (
            (required_permission = 'view' AND fvs.permission_type IN ('view', 'download', 'edit'))
            OR (required_permission = 'download' AND fvs.permission_type IN ('download', 'edit'))
            OR (required_permission = 'edit' AND fvs.permission_type = 'edit')
        )
        AND (fvs.expires_at IS NULL OR fvs.expires_at > NOW())
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON file_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON file_version_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON file_version_comparisons TO authenticated;

-- Conditionally grant execute permissions on functions if they exist
DO $$ BEGIN
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'get_next_version_number';
  IF FOUND THEN EXECUTE 'GRANT EXECUTE ON FUNCTION get_next_version_number(UUID) TO authenticated'; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'create_file_version';
  IF FOUND THEN EXECUTE 'GRANT EXECUTE ON FUNCTION create_file_version(UUID, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, BOOLEAN, UUID) TO authenticated'; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'rollback_to_version';
  IF FOUND THEN EXECUTE 'GRANT EXECUTE ON FUNCTION rollback_to_version(UUID, INTEGER, UUID, TEXT) TO authenticated'; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'cleanup_old_versions';
  IF FOUND THEN EXECUTE 'GRANT EXECUTE ON FUNCTION cleanup_old_versions(UUID, INTEGER) TO authenticated'; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'get_file_version_history';
  IF FOUND THEN EXECUTE 'GRANT EXECUTE ON FUNCTION get_file_version_history(UUID, INTEGER, INTEGER) TO authenticated'; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'user_has_version_access';
  IF FOUND THEN EXECUTE 'GRANT EXECUTE ON FUNCTION user_has_version_access(UUID, UUID, TEXT) TO authenticated'; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'get_user_versioning_storage_usage';
  IF FOUND THEN EXECUTE 'GRANT EXECUTE ON FUNCTION get_user_versioning_storage_usage(UUID) TO authenticated'; END IF;
END $$;
