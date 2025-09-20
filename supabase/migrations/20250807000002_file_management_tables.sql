-- File Management Database Tables
-- This migration creates the database tables to track file metadata and relationships

-- Create enum for file categories
CREATE TYPE file_category AS ENUM (
  'preparation',    -- Pre-session files (homework, materials)
  'notes',         -- Session notes and documentation
  'recording',     -- Session recordings
  'resource',      -- Shared resources and materials
  'personal',      -- Personal files
  'avatar',        -- User avatar files
  'document'       -- General documents
);

-- Create enum for file sharing permissions
CREATE TYPE file_permission_type AS ENUM (
  'view',     -- Can view the file
  'download', -- Can download the file
  'edit'      -- Can edit file metadata (not content)
);

-- File uploads metadata table
CREATE TABLE file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL, -- Optional session association
    filename TEXT NOT NULL, -- Display filename (user-friendly)
    original_filename TEXT NOT NULL, -- Original filename when uploaded
    storage_path TEXT NOT NULL UNIQUE, -- Path in Supabase Storage
    file_type TEXT NOT NULL, -- MIME type
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    file_category file_category NOT NULL DEFAULT 'document',
    bucket_name TEXT NOT NULL, -- Storage bucket name
    description TEXT, -- User-provided file description
    tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Searchable tags
    is_shared BOOLEAN NOT NULL DEFAULT FALSE, -- Whether file is shared
    download_count INTEGER NOT NULL DEFAULT 0, -- Track download metrics
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT file_uploads_valid_bucket CHECK (
      bucket_name IN ('avatars', 'documents', 'session-files', 'uploads')
    ),
    CONSTRAINT file_uploads_valid_mime_type CHECK (
      file_type ~ '^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$'
    )
);

-- File sharing permissions table
CREATE TABLE file_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE NOT NULL,
    shared_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    shared_with UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    permission_type file_permission_type NOT NULL DEFAULT 'view',
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    access_count INTEGER NOT NULL DEFAULT 0, -- Track access metrics
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT file_shares_no_self_sharing CHECK (shared_by != shared_with),
    CONSTRAINT file_shares_unique_sharing UNIQUE (file_id, shared_by, shared_with),
    CONSTRAINT file_shares_future_expiration CHECK (
      expires_at IS NULL OR expires_at > created_at
    )
);

-- Session-file associations table (many-to-many relationship)
CREATE TABLE session_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    file_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE NOT NULL,
    file_category file_category NOT NULL DEFAULT 'resource',
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Who attached it to session
    is_required BOOLEAN NOT NULL DEFAULT FALSE, -- Required for session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate file attachments to same session
    CONSTRAINT session_files_unique_attachment UNIQUE (session_id, file_id)
);

-- Create indexes for performance
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX idx_file_uploads_session_id ON file_uploads(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_file_uploads_created_at ON file_uploads(created_at);
CREATE INDEX idx_file_uploads_file_category ON file_uploads(file_category);
CREATE INDEX idx_file_uploads_is_shared ON file_uploads(is_shared) WHERE is_shared = TRUE;
CREATE INDEX idx_file_uploads_tags ON file_uploads USING GIN(tags);
CREATE INDEX idx_file_uploads_storage_path ON file_uploads(storage_path);
CREATE INDEX idx_file_uploads_bucket_name ON file_uploads(bucket_name);

CREATE INDEX idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX idx_file_shares_shared_with ON file_shares(shared_with);
CREATE INDEX idx_file_shares_shared_by ON file_shares(shared_by);
CREATE INDEX idx_file_shares_expires_at ON file_shares(expires_at) WHERE expires_at IS NOT NULL;
-- Avoid non-immutable predicate; index rows without expiration for common lookups
CREATE INDEX idx_file_shares_active ON file_shares(shared_with, created_at) 
  WHERE expires_at IS NULL;

CREATE INDEX idx_session_files_session_id ON session_files(session_id);
CREATE INDEX idx_session_files_file_id ON session_files(file_id);
CREATE INDEX idx_session_files_category ON session_files(file_category);
CREATE INDEX idx_session_files_required ON session_files(session_id, is_required) WHERE is_required = TRUE;

-- Add trigger to update updated_at timestamp on file_uploads
CREATE OR REPLACE FUNCTION update_file_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER file_uploads_updated_at_trigger
    BEFORE UPDATE ON file_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_file_uploads_updated_at();

-- Add function to increment download count
CREATE OR REPLACE FUNCTION increment_file_download_count(file_upload_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE file_uploads 
    SET download_count = download_count + 1
    WHERE id = file_upload_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to track file share access
CREATE OR REPLACE FUNCTION track_file_share_access(share_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE file_shares 
    SET 
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE id = share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to clean up expired file shares
CREATE OR REPLACE FUNCTION cleanup_expired_file_shares()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM file_shares 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get user's file storage usage
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_uuid UUID)
RETURNS TABLE (
    total_files BIGINT,
    total_size_bytes BIGINT,
    total_size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(file_size), 0) as total_size_bytes,
        COALESCE(ROUND(SUM(file_size)::NUMERIC / (1024 * 1024), 2), 0) as total_size_mb
    FROM file_uploads 
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get files shared with a user
CREATE OR REPLACE FUNCTION get_files_shared_with_user(user_uuid UUID)
RETURNS TABLE (
    file_id UUID,
    filename TEXT,
    file_type TEXT,
    file_size BIGINT,
    shared_by_name TEXT,
    permission_type file_permission_type,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as file_id,
        f.filename,
        f.file_type,
        f.file_size,
        (u.first_name || ' ' || COALESCE(u.last_name, ''))::TEXT as shared_by_name,
        fs.permission_type,
        fs.expires_at,
        fs.created_at
    FROM file_shares fs
    JOIN file_uploads f ON f.id = fs.file_id
    JOIN users u ON u.id = fs.shared_by
    WHERE fs.shared_with = user_uuid
    AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
    ORDER BY fs.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
