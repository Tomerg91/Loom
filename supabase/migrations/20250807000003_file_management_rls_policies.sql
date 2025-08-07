-- Row Level Security Policies for File Management Tables
-- This migration adds RLS policies to secure file metadata and sharing

-- Enable RLS on all file management tables
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_files ENABLE ROW LEVEL SECURITY;

-- File uploads table policies
CREATE POLICY "Users can view their own files" ON file_uploads
    FOR SELECT USING (
        auth.uid() = user_id OR
        -- Users can see files shared with them
        EXISTS (
            SELECT 1 FROM file_shares fs 
            WHERE fs.file_id = file_uploads.id 
            AND fs.shared_with = auth.uid()
            AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
        ) OR
        -- Users can see session files they participate in
        EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.id = file_uploads.session_id
            AND (s.coach_id = auth.uid() OR s.client_id = auth.uid())
        )
    );

CREATE POLICY "Users can create their own files" ON file_uploads
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own files" ON file_uploads
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete their own files" ON file_uploads
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- Coaches can view client files in shared sessions
CREATE POLICY "Coaches can view client session files" ON file_uploads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions s
            JOIN users u ON u.id = auth.uid()
            WHERE s.id = file_uploads.session_id
            AND s.coach_id = auth.uid()
            AND s.client_id = file_uploads.user_id
            AND u.role = 'coach'
        )
    );

-- Clients can view coach files in shared sessions
CREATE POLICY "Clients can view coach session files" ON file_uploads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions s
            JOIN users u ON u.id = auth.uid()
            WHERE s.id = file_uploads.session_id
            AND s.client_id = auth.uid()
            AND s.coach_id = file_uploads.user_id
            AND u.role = 'client'
        )
    );

-- Admins can manage all files
CREATE POLICY "Admins can manage all files" ON file_uploads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- File shares table policies
CREATE POLICY "Users can view shares they created" ON file_shares
    FOR SELECT USING (
        auth.uid() = shared_by
    );

CREATE POLICY "Users can view shares for their files" ON file_shares
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM file_uploads f
            WHERE f.id = file_shares.file_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view shares made with them" ON file_shares
    FOR SELECT USING (
        auth.uid() = shared_with
    );

CREATE POLICY "Users can share their own files" ON file_shares
    FOR INSERT WITH CHECK (
        auth.uid() = shared_by AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM file_uploads f
            WHERE f.id = file_shares.file_id
            AND f.user_id = auth.uid()
        ) AND
        -- Ensure sharing is within coach-client relationship
        (
            -- Coach sharing with their client
            EXISTS (
                SELECT 1 FROM sessions s
                JOIN users coach ON coach.id = auth.uid()
                WHERE s.coach_id = auth.uid()
                AND s.client_id = file_shares.shared_with
                AND coach.role = 'coach'
            ) OR
            -- Client sharing with their coach
            EXISTS (
                SELECT 1 FROM sessions s
                JOIN users client ON client.id = auth.uid()
                WHERE s.client_id = auth.uid()
                AND s.coach_id = file_shares.shared_with
                AND client.role = 'client'
            ) OR
            -- Admin can share with anyone
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.role = 'admin'
            )
        )
    );

CREATE POLICY "Users can update their own file shares" ON file_shares
    FOR UPDATE USING (
        auth.uid() = shared_by
    );

CREATE POLICY "Users can delete their own file shares" ON file_shares
    FOR DELETE USING (
        auth.uid() = shared_by
    );

-- Session files table policies
CREATE POLICY "Session participants can view session files" ON session_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.id = session_files.session_id
            AND (s.coach_id = auth.uid() OR s.client_id = auth.uid())
        )
    );

CREATE POLICY "Session participants can attach files" ON session_files
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        auth.uid() = uploaded_by AND
        EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.id = session_files.session_id
            AND (s.coach_id = auth.uid() OR s.client_id = auth.uid())
        ) AND
        -- File must belong to the user or be shared with them
        EXISTS (
            SELECT 1 FROM file_uploads f
            WHERE f.id = session_files.file_id
            AND (
                f.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM file_shares fs
                    WHERE fs.file_id = f.id
                    AND fs.shared_with = auth.uid()
                    AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
                )
            )
        )
    );

CREATE POLICY "Users can update session files they uploaded" ON session_files
    FOR UPDATE USING (
        auth.uid() = uploaded_by
    );

CREATE POLICY "Users can remove session files they uploaded" ON session_files
    FOR DELETE USING (
        auth.uid() = uploaded_by
    );

-- Coaches can manage session files in their sessions
CREATE POLICY "Coaches can manage session files" ON session_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sessions s
            JOIN users u ON u.id = auth.uid()
            WHERE s.id = session_files.session_id
            AND s.coach_id = auth.uid()
            AND u.role = 'coach'
        )
    );

-- Admins can manage all session files
CREATE POLICY "Admins can manage all session files" ON session_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create view for user's accessible files (own + shared)
CREATE VIEW user_accessible_files AS
SELECT DISTINCT
    f.id,
    f.user_id,
    f.session_id,
    f.filename,
    f.original_filename,
    f.storage_path,
    f.file_type,
    f.file_size,
    f.file_category,
    f.bucket_name,
    f.description,
    f.tags,
    f.is_shared,
    f.download_count,
    f.created_at,
    f.updated_at,
    CASE 
        WHEN f.user_id = auth.uid() THEN 'owner'
        ELSE 'shared'
    END as access_type,
    fs.permission_type,
    fs.expires_at,
    (u.first_name || ' ' || COALESCE(u.last_name, ''))::TEXT as owner_name
FROM file_uploads f
LEFT JOIN file_shares fs ON fs.file_id = f.id AND fs.shared_with = auth.uid()
LEFT JOIN users u ON u.id = f.user_id
WHERE 
    -- User owns the file
    f.user_id = auth.uid() OR
    -- File is shared with user and not expired
    (fs.id IS NOT NULL AND (fs.expires_at IS NULL OR fs.expires_at > NOW())) OR
    -- User participates in session where file is attached
    EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = f.session_id
        AND (s.coach_id = auth.uid() OR s.client_id = auth.uid())
    );

-- Grant access to the view
GRANT SELECT ON user_accessible_files TO authenticated;