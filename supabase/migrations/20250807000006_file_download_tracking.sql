-- Migration: File download tracking system
-- Creates comprehensive download analytics and usage tracking for files

-- Create file_download_logs table
CREATE TABLE file_download_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES file_uploads(id) ON DELETE CASCADE,
  downloaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous downloads
  download_type VARCHAR(50) NOT NULL DEFAULT 'direct', -- 'direct', 'temporary_share', 'permanent_share'
  share_id UUID, -- References temporary_file_shares or file_shares depending on type
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  country_code VARCHAR(2),
  city TEXT,
  file_size_at_download BIGINT,
  download_duration_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT,
  bandwidth_used BIGINT, -- Bytes transferred
  client_info JSONB DEFAULT '{}', -- Browser info, device type, etc.
  metadata JSONB DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT valid_download_type CHECK (download_type IN ('direct', 'temporary_share', 'permanent_share', 'version_download')),
  CONSTRAINT valid_file_size CHECK (file_size_at_download IS NULL OR file_size_at_download >= 0),
  CONSTRAINT valid_duration CHECK (download_duration_ms IS NULL OR download_duration_ms >= 0),
  CONSTRAINT valid_bandwidth CHECK (bandwidth_used IS NULL OR bandwidth_used >= 0)
);

-- Create file_analytics_summary table for aggregated data
CREATE TABLE file_analytics_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES file_uploads(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_downloads INTEGER DEFAULT 0,
  successful_downloads INTEGER DEFAULT 0,
  failed_downloads INTEGER DEFAULT 0,
  unique_downloaders INTEGER DEFAULT 0,
  unique_ip_addresses INTEGER DEFAULT 0,
  total_bandwidth_used BIGINT DEFAULT 0,
  average_download_duration_ms INTEGER,
  top_countries TEXT[], -- Array of most common countries
  top_user_agents TEXT[], -- Array of most common user agents
  download_methods JSONB DEFAULT '{}', -- Breakdown by download type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for file + date
  UNIQUE(file_id, date)
);

-- Create user_download_statistics table for user-level analytics
CREATE TABLE user_download_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_uploads(id) ON DELETE CASCADE,
  first_download_at TIMESTAMP WITH TIME ZONE,
  last_download_at TIMESTAMP WITH TIME ZONE,
  total_downloads INTEGER DEFAULT 0,
  total_bandwidth_used BIGINT DEFAULT 0,
  favorite_download_method VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for user + file
  UNIQUE(user_id, file_id)
);

-- Create indexes for performance
CREATE INDEX idx_file_download_logs_file_id ON file_download_logs(file_id);
CREATE INDEX idx_file_download_logs_downloaded_by ON file_download_logs(downloaded_by);
CREATE INDEX idx_file_download_logs_downloaded_at ON file_download_logs(downloaded_at);
CREATE INDEX idx_file_download_logs_download_type ON file_download_logs(download_type);
CREATE INDEX idx_file_download_logs_ip_address ON file_download_logs(ip_address);
CREATE INDEX idx_file_download_logs_success ON file_download_logs(success);
CREATE INDEX idx_file_download_logs_composite ON file_download_logs(file_id, downloaded_at, success);

CREATE INDEX idx_file_analytics_summary_file_id ON file_analytics_summary(file_id);
CREATE INDEX idx_file_analytics_summary_date ON file_analytics_summary(date);
CREATE INDEX idx_file_analytics_summary_composite ON file_analytics_summary(file_id, date);

CREATE INDEX idx_user_download_statistics_user_id ON user_download_statistics(user_id);
CREATE INDEX idx_user_download_statistics_file_id ON user_download_statistics(file_id);
CREATE INDEX idx_user_download_statistics_composite ON user_download_statistics(user_id, file_id);

-- Enable Row Level Security
ALTER TABLE file_download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_download_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_download_logs
CREATE POLICY "Users can view download logs for their files"
  ON file_download_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_uploads
      WHERE id = file_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert download logs"
  ON file_download_logs FOR INSERT
  WITH CHECK (true); -- Allow service to log downloads

-- RLS Policies for file_analytics_summary
CREATE POLICY "Users can view analytics for their files"
  ON file_analytics_summary FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_uploads
      WHERE id = file_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for user_download_statistics
CREATE POLICY "Users can view their own download statistics"
  ON user_download_statistics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "File owners can view download statistics for their files"
  ON user_download_statistics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_uploads
      WHERE id = file_id AND user_id = auth.uid()
    )
  );

-- Database functions for download tracking

-- Function to log a file download
CREATE OR REPLACE FUNCTION log_file_download(
  p_file_id UUID,
  p_downloaded_by UUID DEFAULT NULL,
  p_download_type VARCHAR(50) DEFAULT 'direct',
  p_share_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_country_code VARCHAR(2) DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_file_size_at_download BIGINT DEFAULT NULL,
  p_download_duration_ms INTEGER DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_failure_reason TEXT DEFAULT NULL,
  p_bandwidth_used BIGINT DEFAULT NULL,
  p_client_info JSONB DEFAULT '{}'
)
RETURNS UUID AS $$                                            
DECLARE                                                       
  log_id UUID;                                                
  v_current_date DATE;                                        
BEGIN
  -- Insert download log
  INSERT INTO file_download_logs (
    file_id,
    downloaded_by,
    download_type,
    share_id,
    ip_address,
    user_agent,
    country_code,
    city,
    file_size_at_download,
    download_duration_ms,
    success,
    failure_reason,
    bandwidth_used,
    client_info
  ) VALUES (
    p_file_id,
    p_downloaded_by,
    p_download_type,
    p_share_id,
    p_ip_address,
    p_user_agent,
    p_country_code,
    p_city,
    p_file_size_at_download,
    p_download_duration_ms,
    p_success,
    p_failure_reason,
    p_bandwidth_used,
    p_client_info
  ) RETURNING id INTO log_id;
  
  -- Update analytics summary (only for successful downloads)
  IF p_success THEN                                           
    v_current_date := CURRENT_DATE;                           
    
    INSERT INTO file_analytics_summary (
      file_id,
      date,
      total_downloads,
      successful_downloads,
      unique_downloaders,
      unique_ip_addresses,
      total_bandwidth_used,
      download_methods
    ) VALUES (
      p_file_id,
      v_current_date,                                         
      1,
      1,
      CASE WHEN p_downloaded_by IS NOT NULL THEN 1 ELSE 0 END,
      CASE WHEN p_ip_address IS NOT NULL THEN 1 ELSE 0 END,
      COALESCE(p_bandwidth_used, 0),
      jsonb_build_object(p_download_type, 1)
    )
    ON CONFLICT (file_id, date) 
    DO UPDATE SET
      total_downloads = file_analytics_summary.total_downloads + 1,
      successful_downloads = file_analytics_summary.successful_downloads + 1,
      unique_downloaders = (
        SELECT COUNT(DISTINCT downloaded_by)
        FROM file_download_logs
        WHERE file_id = p_file_id 
          AND downloaded_at::date = v_current_date
          AND downloaded_by IS NOT NULL
          AND success = true
      ),
      unique_ip_addresses = (
        SELECT COUNT(DISTINCT ip_address)
        FROM file_download_logs
        WHERE file_id = p_file_id 
          AND downloaded_at::date = v_current_date
          AND ip_address IS NOT NULL
          AND success = true
      ),
      total_bandwidth_used = file_analytics_summary.total_bandwidth_used + COALESCE(p_bandwidth_used, 0),
      download_methods = file_analytics_summary.download_methods || 
                        jsonb_build_object(
                          p_download_type, 
                          COALESCE((file_analytics_summary.download_methods->>p_download_type)::integer, 0) + 1
                        ),
      updated_at = NOW();
    
    -- Update user statistics (if user is logged in)
    IF p_downloaded_by IS NOT NULL THEN
      INSERT INTO user_download_statistics (
        user_id,
        file_id,
        first_download_at,
        last_download_at,
        total_downloads,
        total_bandwidth_used,
        favorite_download_method
      ) VALUES (
        p_downloaded_by,
        p_file_id,
        NOW(),
        NOW(),
        1,
        COALESCE(p_bandwidth_used, 0),
        p_download_type
      )
      ON CONFLICT (user_id, file_id)
      DO UPDATE SET
        last_download_at = NOW(),
        total_downloads = user_download_statistics.total_downloads + 1,
        total_bandwidth_used = user_download_statistics.total_bandwidth_used + COALESCE(p_bandwidth_used, 0),
        updated_at = NOW();
    END IF;
  ELSE
    -- Update failed downloads count
    v_current_date := CURRENT_DATE;                           
    
    INSERT INTO file_analytics_summary (
      file_id,
      date,
      total_downloads,
      failed_downloads
    ) VALUES (
      p_file_id,
      v_current_date,                                         
      1,
      1
    )
    ON CONFLICT (file_id, date)
    DO UPDATE SET
      total_downloads = file_analytics_summary.total_downloads + 1,
      failed_downloads = file_analytics_summary.failed_downloads + 1,
      updated_at = NOW();
  END IF;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get file download statistics
CREATE OR REPLACE FUNCTION get_file_download_stats(
  p_file_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  date_from DATE;
  date_to DATE;
BEGIN
  -- Set date range (default to last 30 days)
  date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days');
  date_to := COALESCE(p_date_to, CURRENT_DATE);
  
  SELECT jsonb_build_object(
    'total_downloads', COALESCE(SUM(total_downloads), 0),
    'successful_downloads', COALESCE(SUM(successful_downloads), 0),
    'failed_downloads', COALESCE(SUM(failed_downloads), 0),
    'unique_downloaders', (
      SELECT COUNT(DISTINCT downloaded_by)
      FROM file_download_logs
      WHERE file_id = p_file_id 
        AND downloaded_at::date BETWEEN date_from AND date_to
        AND downloaded_by IS NOT NULL
        AND success = true
    ),
    'unique_ip_addresses', (
      SELECT COUNT(DISTINCT ip_address)
      FROM file_download_logs
      WHERE file_id = p_file_id 
        AND downloaded_at::date BETWEEN date_from AND date_to
        AND ip_address IS NOT NULL
        AND success = true
    ),
    'total_bandwidth_used', COALESCE(SUM(total_bandwidth_used), 0),
    'average_download_duration', (
      SELECT AVG(download_duration_ms)
      FROM file_download_logs
      WHERE file_id = p_file_id 
        AND downloaded_at::date BETWEEN date_from AND date_to
        AND success = true
        AND download_duration_ms IS NOT NULL
    ),
    'download_methods', (
      SELECT jsonb_object_agg(download_type, count)
      FROM (
        SELECT download_type, COUNT(*) as count
        FROM file_download_logs
        WHERE file_id = p_file_id 
          AND downloaded_at::date BETWEEN date_from AND date_to
          AND success = true
        GROUP BY download_type
      ) t
    ),
    'top_countries', (
      SELECT array_agg(country_code ORDER BY count DESC)
      FROM (
        SELECT country_code, COUNT(*) as count
        FROM file_download_logs
        WHERE file_id = p_file_id 
          AND downloaded_at::date BETWEEN date_from AND date_to
          AND success = true
          AND country_code IS NOT NULL
        GROUP BY country_code
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    'downloads_by_date', (
      SELECT jsonb_object_agg(date, downloads)
      FROM (
        SELECT downloaded_at::date as date, COUNT(*) as downloads
        FROM file_download_logs
        WHERE file_id = p_file_id 
          AND downloaded_at::date BETWEEN date_from AND date_to
          AND success = true
        GROUP BY downloaded_at::date
        ORDER BY date
      ) t
    ),
    'peak_download_hour', (
      SELECT EXTRACT(hour FROM downloaded_at) as hour
      FROM file_download_logs
      WHERE file_id = p_file_id 
        AND downloaded_at::date BETWEEN date_from AND date_to
        AND success = true
      GROUP BY EXTRACT(hour FROM downloaded_at)
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )
  ) INTO stats
  FROM file_analytics_summary
  WHERE file_id = p_file_id 
    AND date BETWEEN date_from AND date_to;
  
  RETURN COALESCE(stats, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user download history
CREATE OR REPLACE FUNCTION get_user_download_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  download_id UUID,
  file_id UUID,
  filename TEXT,
  file_type TEXT,
  download_type TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE,
  file_size BIGINT,
  success BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fdl.id,
    fdl.file_id,
    fu.filename,
    fu.file_type,
    fdl.download_type,
    fdl.downloaded_at,
    fdl.file_size_at_download,
    fdl.success
  FROM file_download_logs fdl
  JOIN file_uploads fu ON fdl.file_id = fu.id
  WHERE fdl.downloaded_by = p_user_id
  ORDER BY fdl.downloaded_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get popular files (most downloaded)
CREATE OR REPLACE FUNCTION get_popular_files(
  p_limit INTEGER DEFAULT 10,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  file_id UUID,
  filename TEXT,
  file_type TEXT,
  file_size BIGINT,
  total_downloads BIGINT,
  unique_downloaders BIGINT
) AS $$
DECLARE
  date_from DATE;
  date_to DATE;
BEGIN
  date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days');
  date_to := COALESCE(p_date_to, CURRENT_DATE);
  
  RETURN QUERY
  SELECT 
    fu.id,
    fu.filename,
    fu.file_type,
    fu.file_size,
    COUNT(*) as total_downloads,
    COUNT(DISTINCT fdl.downloaded_by) as unique_downloaders
  FROM file_uploads fu
  JOIN file_download_logs fdl ON fu.id = fdl.file_id
  WHERE fdl.downloaded_at::date BETWEEN date_from AND date_to
    AND fdl.success = true
  GROUP BY fu.id, fu.filename, fu.file_type, fu.file_size
  ORDER BY total_downloads DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at triggers
CREATE TRIGGER set_timestamp_file_analytics_summary
  BEFORE UPDATE ON file_analytics_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_user_download_statistics
  BEFORE UPDATE ON user_download_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION log_file_download TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_file_download_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_download_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_files TO authenticated;

-- Comments for documentation
COMMENT ON TABLE file_download_logs IS 'Detailed logs of all file download attempts with analytics data';
COMMENT ON TABLE file_analytics_summary IS 'Daily aggregated download statistics per file';
COMMENT ON TABLE user_download_statistics IS 'Per-user download statistics for each file';
COMMENT ON FUNCTION log_file_download IS 'Records a file download attempt with comprehensive analytics';
COMMENT ON FUNCTION get_file_download_stats IS 'Returns detailed download statistics for a file';
COMMENT ON FUNCTION get_user_download_history IS 'Returns download history for a specific user';
COMMENT ON FUNCTION get_popular_files IS 'Returns most downloaded files in a date range';
