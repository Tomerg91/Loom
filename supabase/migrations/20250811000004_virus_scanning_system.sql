-- Virus Scanning System
-- This migration creates tables for virus scan caching and logging

-- Create virus scan cache table
CREATE TABLE virus_scan_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_hash TEXT NOT NULL UNIQUE,
    is_safe BOOLEAN NOT NULL,
    threat_name TEXT,
    scan_details TEXT,
    scan_provider TEXT NOT NULL DEFAULT 'local',
    scan_id TEXT, -- External scan ID (e.g., from VirusTotal)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Constraints
    CONSTRAINT virus_scan_cache_valid_hash CHECK (
        file_hash ~ '^[a-f0-9]{64}$' -- SHA-256 hash
    ),
    CONSTRAINT virus_scan_cache_valid_provider CHECK (
        scan_provider IN ('local', 'clamav', 'virustotal')
    ),
    CONSTRAINT virus_scan_cache_future_expiry CHECK (
        expires_at > created_at
    )
);

-- Create virus scan logs table
CREATE TABLE virus_scan_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_hash TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    file_type TEXT,
    scan_provider TEXT NOT NULL DEFAULT 'local',
    is_safe BOOLEAN NOT NULL,
    threat_name TEXT,
    scan_details TEXT,
    scan_duration_ms INTEGER CHECK (scan_duration_ms >= 0),
    quarantined BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who initiated the scan
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT virus_scan_logs_valid_hash CHECK (
        file_hash ~ '^[a-f0-9]{64}$' -- SHA-256 hash
    ),
    CONSTRAINT virus_scan_logs_valid_provider CHECK (
        scan_provider IN ('local', 'clamav', 'virustotal')
    ),
    CONSTRAINT virus_scan_logs_valid_mime_type CHECK (
        file_type IS NULL OR file_type ~ '^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$'
    )
);

-- Create quarantined files table (for files that failed virus scan)
CREATE TABLE quarantined_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_hash TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    file_type TEXT,
    threat_name TEXT NOT NULL,
    scan_provider TEXT NOT NULL,
    scan_details TEXT,
    quarantine_reason TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    upload_ip_address INET,
    quarantined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_status TEXT CHECK (review_status IN ('pending', 'false_positive', 'confirmed_threat', 'deleted')),
    review_notes TEXT,
    auto_delete_at TIMESTAMP WITH TIME ZONE, -- Automatic deletion date
    
    -- Constraints
    CONSTRAINT quarantined_files_valid_hash CHECK (
        file_hash ~ '^[a-f0-9]{64}$'
    ),
    CONSTRAINT quarantined_files_valid_provider CHECK (
        scan_provider IN ('local', 'clamav', 'virustotal')
    )
);

-- Create indexes for performance
CREATE INDEX idx_virus_scan_cache_hash ON virus_scan_cache(file_hash);
CREATE INDEX idx_virus_scan_cache_expires ON virus_scan_cache(expires_at);
CREATE INDEX idx_virus_scan_cache_safe ON virus_scan_cache(is_safe);

CREATE INDEX idx_virus_scan_logs_hash ON virus_scan_logs(file_hash);
CREATE INDEX idx_virus_scan_logs_created ON virus_scan_logs(created_at);
CREATE INDEX idx_virus_scan_logs_user ON virus_scan_logs(user_id);
CREATE INDEX idx_virus_scan_logs_safe ON virus_scan_logs(is_safe);
CREATE INDEX idx_virus_scan_logs_provider ON virus_scan_logs(scan_provider);
CREATE INDEX idx_virus_scan_logs_quarantined ON virus_scan_logs(quarantined) WHERE quarantined = TRUE;

CREATE INDEX idx_quarantined_files_hash ON quarantined_files(file_hash);
CREATE INDEX idx_quarantined_files_uploaded_by ON quarantined_files(uploaded_by);
CREATE INDEX idx_quarantined_files_quarantined_at ON quarantined_files(quarantined_at);
CREATE INDEX idx_quarantined_files_review_status ON quarantined_files(review_status);
CREATE INDEX idx_quarantined_files_auto_delete ON quarantined_files(auto_delete_at) WHERE auto_delete_at IS NOT NULL;

-- Create RLS policies for virus scan cache
ALTER TABLE virus_scan_cache ENABLE ROW LEVEL SECURITY;

-- Admin can view all scan cache
CREATE POLICY "Admins can view all virus scan cache" ON virus_scan_cache
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Service role can manage scan cache (for internal operations)
CREATE POLICY "Service role can manage virus scan cache" ON virus_scan_cache
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for virus scan logs
ALTER TABLE virus_scan_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own scan logs
CREATE POLICY "Users can view their own scan logs" ON virus_scan_logs
    FOR SELECT USING (
        auth.role() = 'authenticated' AND user_id = auth.uid()
    );

-- Admins can view all scan logs
CREATE POLICY "Admins can view all scan logs" ON virus_scan_logs
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Service role can manage scan logs
CREATE POLICY "Service role can manage scan logs" ON virus_scan_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for quarantined files
ALTER TABLE quarantined_files ENABLE ROW LEVEL SECURITY;

-- Users can view quarantined files they uploaded
CREATE POLICY "Users can view their quarantined files" ON quarantined_files
    FOR SELECT USING (
        auth.role() = 'authenticated' AND uploaded_by = auth.uid()
    );

-- Admins can manage all quarantined files
CREATE POLICY "Admins can manage all quarantined files" ON quarantined_files
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Service role can manage quarantined files
CREATE POLICY "Service role can manage quarantined files" ON quarantined_files
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to clean up expired scan cache
CREATE OR REPLACE FUNCTION cleanup_expired_virus_scan_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM virus_scan_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-delete old quarantined files
CREATE OR REPLACE FUNCTION cleanup_expired_quarantined_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM quarantined_files 
    WHERE auto_delete_at IS NOT NULL AND auto_delete_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get virus scan statistics
CREATE OR REPLACE FUNCTION get_virus_scan_statistics(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_scans BIGINT,
    safe_files BIGINT,
    threats_detected BIGINT,
    quarantined_files BIGINT,
    avg_scan_duration_ms NUMERIC,
    scans_by_provider JSONB,
    top_threats JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_scans,
        COUNT(*) FILTER (WHERE is_safe = TRUE) as safe_files,
        COUNT(*) FILTER (WHERE is_safe = FALSE) as threats_detected,
        COUNT(*) FILTER (WHERE quarantined = TRUE) as quarantined_files,
        ROUND(AVG(scan_duration_ms), 2) as avg_scan_duration_ms,
        jsonb_object_agg(scan_provider, provider_count) as scans_by_provider,
        (
            SELECT jsonb_agg(jsonb_build_object('threat', threat_name, 'count', threat_count))
            FROM (
                SELECT threat_name, COUNT(*) as threat_count
                FROM virus_scan_logs
                WHERE created_at BETWEEN start_date AND end_date
                AND threat_name IS NOT NULL
                GROUP BY threat_name
                ORDER BY threat_count DESC
                LIMIT 10
            ) threats
        ) as top_threats
    FROM (
        SELECT 
            is_safe, 
            quarantined, 
            scan_duration_ms,
            scan_provider,
            COUNT(*) as provider_count
        FROM virus_scan_logs
        WHERE created_at BETWEEN start_date AND end_date
        GROUP BY is_safe, quarantined, scan_duration_ms, scan_provider
    ) grouped_scans
    GROUP BY ();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to quarantine a file
CREATE OR REPLACE FUNCTION quarantine_file(
    p_file_hash TEXT,
    p_file_name TEXT,
    p_file_size BIGINT,
    p_file_type TEXT,
    p_threat_name TEXT,
    p_scan_provider TEXT,
    p_scan_details TEXT,
    p_uploaded_by UUID DEFAULT NULL,
    p_upload_ip INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    quarantine_id UUID;
    auto_delete_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Set auto-delete date to 30 days from now
    auto_delete_date := NOW() + INTERVAL '30 days';
    
    INSERT INTO quarantined_files (
        file_hash,
        original_file_name,
        file_size,
        file_type,
        threat_name,
        scan_provider,
        scan_details,
        quarantine_reason,
        uploaded_by,
        upload_ip_address,
        review_status,
        auto_delete_at
    ) VALUES (
        p_file_hash,
        p_file_name,
        p_file_size,
        p_file_type,
        p_threat_name,
        p_scan_provider,
        p_scan_details,
        'Virus scan detected threat: ' || p_threat_name,
        p_uploaded_by,
        p_upload_ip,
        'pending',
        auto_delete_date
    )
    RETURNING id INTO quarantine_id;
    
    RETURN quarantine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set review timestamp
CREATE OR REPLACE FUNCTION update_quarantine_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.review_status IS DISTINCT FROM OLD.review_status AND NEW.review_status != 'pending' THEN
        NEW.reviewed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quarantined_files_review_trigger
    BEFORE UPDATE ON quarantined_files
    FOR EACH ROW
    EXECUTE FUNCTION update_quarantine_review_timestamp();

-- Add comment on tables
COMMENT ON TABLE virus_scan_cache IS 'Cache for virus scan results to avoid rescanning identical files';
COMMENT ON TABLE virus_scan_logs IS 'Log of all virus scans performed, for security auditing';
COMMENT ON TABLE quarantined_files IS 'Files that failed virus scans and have been quarantined';

-- Add comments on key columns
COMMENT ON COLUMN virus_scan_cache.file_hash IS 'SHA-256 hash of the file content';
COMMENT ON COLUMN virus_scan_cache.expires_at IS 'When this cache entry expires';
COMMENT ON COLUMN virus_scan_logs.scan_duration_ms IS 'Time taken to complete the virus scan in milliseconds';
COMMENT ON COLUMN quarantined_files.auto_delete_at IS 'When this quarantined file will be automatically deleted';