-- Migration: Temporary sharing links system
-- Creates infrastructure for time-limited file access URLs with password protection and usage tracking

-- Create temporary_file_shares table
CREATE TABLE temporary_file_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES file_uploads(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT, -- Optional password protection
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_downloads INTEGER, -- Optional download limit
  current_downloads INTEGER DEFAULT 0,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT valid_max_downloads CHECK (max_downloads IS NULL OR max_downloads > 0),
  CONSTRAINT valid_current_downloads CHECK (current_downloads >= 0)
);

-- Create temporary_share_access_logs table for tracking
CREATE TABLE temporary_share_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES temporary_file_shares(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  country_code VARCHAR(2),
  city TEXT,
  access_type VARCHAR(50) NOT NULL DEFAULT 'view', -- 'view', 'download'
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT,
  bytes_served BIGINT,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_temporary_file_shares_file_id ON temporary_file_shares(file_id);
CREATE INDEX idx_temporary_file_shares_created_by ON temporary_file_shares(created_by);
CREATE INDEX idx_temporary_file_shares_share_token ON temporary_file_shares(share_token);
CREATE INDEX idx_temporary_file_shares_expires_at ON temporary_file_shares(expires_at);
CREATE INDEX idx_temporary_file_shares_is_active ON temporary_file_shares(is_active);

CREATE INDEX idx_temporary_share_access_logs_share_id ON temporary_share_access_logs(share_id);
CREATE INDEX idx_temporary_share_access_logs_accessed_at ON temporary_share_access_logs(accessed_at);
CREATE INDEX idx_temporary_share_access_logs_ip_address ON temporary_share_access_logs(ip_address);

-- Enable Row Level Security
ALTER TABLE temporary_file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_share_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for temporary_file_shares
CREATE POLICY "Users can view their own temporary shares"
  ON temporary_file_shares FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create temporary shares for their files"
  ON temporary_file_shares FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM file_uploads
      WHERE id = file_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own temporary shares"
  ON temporary_file_shares FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own temporary shares"
  ON temporary_file_shares FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for temporary_share_access_logs (read-only for creators)
CREATE POLICY "Users can view access logs for their temporary shares"
  ON temporary_share_access_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM temporary_file_shares
      WHERE id = share_id AND created_by = auth.uid()
    )
  );

-- Database functions for temporary shares

-- Function to generate a unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(255) AS $$
DECLARE
  token VARCHAR(255);
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 32-character token (URL-safe base64)
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
    
    -- Check if token already exists
    SELECT EXISTS(
      SELECT 1 FROM temporary_file_shares WHERE share_token = token
    ) INTO token_exists;
    
    -- Exit loop if token is unique
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to create a temporary file share
CREATE OR REPLACE FUNCTION create_temporary_file_share(
  p_file_id UUID,
  p_created_by UUID,
  p_expires_at TIMESTAMP WITH TIME ZONE,
  p_password_hash TEXT DEFAULT NULL,
  p_max_downloads INTEGER DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS temporary_file_shares AS $$
DECLARE
  new_share temporary_file_shares;
  share_token VARCHAR(255);
BEGIN
  -- Verify file exists and user owns it
  IF NOT EXISTS (
    SELECT 1 FROM file_uploads
    WHERE id = p_file_id AND user_id = p_created_by
  ) THEN
    RAISE EXCEPTION 'File not found or access denied';
  END IF;
  
  -- Generate unique token
  share_token := generate_share_token();
  
  -- Insert new share
  INSERT INTO temporary_file_shares (
    file_id,
    created_by,
    share_token,
    password_hash,
    expires_at,
    max_downloads,
    description
  ) VALUES (
    p_file_id,
    p_created_by,
    share_token,
    p_password_hash,
    p_expires_at,
    p_max_downloads,
    p_description
  ) RETURNING * INTO new_share;
  
  RETURN new_share;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and access a temporary share
CREATE OR REPLACE FUNCTION validate_temporary_share_access(
  p_share_token VARCHAR(255),
  p_password TEXT DEFAULT NULL
)
RETURNS TABLE (
  share_id UUID,
  file_id UUID,
  can_access BOOLEAN,
  failure_reason TEXT,
  file_info JSONB
) AS $$
DECLARE
  share_record temporary_file_shares;
  file_record file_uploads;
BEGIN
  -- Get the share record
  SELECT * INTO share_record
  FROM temporary_file_shares
  WHERE share_token = p_share_token AND is_active = true;
  
  -- Check if share exists
  IF share_record IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::UUID, 
      false, 
      'Share not found or inactive'::TEXT, 
      NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if expired
  IF share_record.expires_at <= NOW() THEN
    RETURN QUERY SELECT 
      share_record.id, 
      share_record.file_id, 
      false, 
      'Share has expired'::TEXT, 
      NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check download limit
  IF share_record.max_downloads IS NOT NULL AND 
     share_record.current_downloads >= share_record.max_downloads THEN
    RETURN QUERY SELECT 
      share_record.id, 
      share_record.file_id, 
      false, 
      'Download limit exceeded'::TEXT, 
      NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check password if required
  IF share_record.password_hash IS NOT NULL THEN
    IF p_password IS NULL OR 
       crypt(p_password, share_record.password_hash) != share_record.password_hash THEN
      RETURN QUERY SELECT 
        share_record.id, 
        share_record.file_id, 
        false, 
        'Invalid password'::TEXT, 
        NULL::JSONB;
      RETURN;
    END IF;
  END IF;
  
  -- Get file info
  SELECT * INTO file_record
  FROM file_uploads
  WHERE id = share_record.file_id;
  
  -- Return success with file info
  RETURN QUERY SELECT 
    share_record.id,
    share_record.file_id,
    true,
    NULL::TEXT,
    jsonb_build_object(
      'id', file_record.id,
      'filename', file_record.filename,
      'original_filename', file_record.original_filename,
      'file_type', file_record.file_type,
      'file_size', file_record.file_size,
      'storage_path', file_record.storage_path,
      'created_at', file_record.created_at,
      'description', share_record.description,
      'expires_at', share_record.expires_at,
      'max_downloads', share_record.max_downloads,
      'current_downloads', share_record.current_downloads
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log share access
CREATE OR REPLACE FUNCTION log_share_access(
  p_share_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_access_type VARCHAR(50) DEFAULT 'view',
  p_success BOOLEAN DEFAULT true,
  p_failure_reason TEXT DEFAULT NULL,
  p_bytes_served BIGINT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO temporary_share_access_logs (
    share_id,
    ip_address,
    user_agent,
    access_type,
    success,
    failure_reason,
    bytes_served
  ) VALUES (
    p_share_id,
    p_ip_address,
    p_user_agent,
    p_access_type,
    p_success,
    p_failure_reason,
    p_bytes_served
  ) RETURNING id INTO log_id;
  
  -- Increment download counter if successful download
  IF p_success AND p_access_type = 'download' THEN
    UPDATE temporary_file_shares
    SET 
      current_downloads = current_downloads + 1,
      updated_at = NOW()
    WHERE id = p_share_id;
  END IF;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get share statistics
CREATE OR REPLACE FUNCTION get_share_statistics(p_share_id UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_accesses', COUNT(*),
    'successful_accesses', COUNT(*) FILTER (WHERE success = true),
    'downloads', COUNT(*) FILTER (WHERE access_type = 'download' AND success = true),
    'views', COUNT(*) FILTER (WHERE access_type = 'view' AND success = true),
    'unique_ips', COUNT(DISTINCT ip_address),
    'first_access', MIN(accessed_at),
    'last_access', MAX(accessed_at),
    'countries', array_agg(DISTINCT country_code) FILTER (WHERE country_code IS NOT NULL),
    'top_failure_reasons', (
      SELECT jsonb_object_agg(failure_reason, cnt)
      FROM (
        SELECT failure_reason, COUNT(*) as cnt
        FROM temporary_share_access_logs
        WHERE share_id = p_share_id AND success = false AND failure_reason IS NOT NULL
        GROUP BY failure_reason
        ORDER BY cnt DESC
        LIMIT 5
      ) t
    )
  ) INTO stats
  FROM temporary_share_access_logs
  WHERE share_id = p_share_id;
  
  RETURN COALESCE(stats, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired shares (should be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deactivate expired shares
  UPDATE temporary_file_shares
  SET is_active = false, updated_at = NOW()
  WHERE expires_at <= NOW() AND is_active = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Optional: Delete very old expired shares and their logs (older than 30 days)
  DELETE FROM temporary_file_shares
  WHERE expires_at < NOW() - INTERVAL '30 days';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger for temporary_file_shares
CREATE TRIGGER set_timestamp_temporary_file_shares
  BEFORE UPDATE ON temporary_file_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_share_token() TO authenticated;
GRANT EXECUTE ON FUNCTION create_temporary_file_share(UUID, UUID, TIMESTAMP WITH TIME ZONE, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_temporary_share_access(VARCHAR, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_share_access(UUID, INET, TEXT, VARCHAR, BOOLEAN, TEXT, BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_share_statistics(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE temporary_file_shares IS 'Stores temporary file sharing links with expiration and access controls';
COMMENT ON TABLE temporary_share_access_logs IS 'Logs all access attempts to temporary file shares for analytics';
COMMENT ON FUNCTION create_temporary_file_share IS 'Creates a new temporary file share with optional password protection';
COMMENT ON FUNCTION validate_temporary_share_access IS 'Validates access to a temporary share and returns file info';
COMMENT ON FUNCTION log_share_access IS 'Records access attempts to temporary shares';
COMMENT ON FUNCTION get_share_statistics IS 'Returns analytics data for a specific share';
COMMENT ON FUNCTION cleanup_expired_shares IS 'Deactivates expired shares (run via cron)';
