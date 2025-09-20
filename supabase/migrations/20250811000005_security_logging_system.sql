-- Security Logging System
-- This migration creates tables for security event logging and monitoring

-- Create enum for severity levels
CREATE TYPE security_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create security logs table
CREATE TABLE security_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    details TEXT,
    user_agent TEXT,
    referer TEXT,
    request_path TEXT,
    request_method TEXT,
    severity security_severity NOT NULL DEFAULT 'low',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    -- Constraints
    CONSTRAINT security_logs_valid_activity CHECK (
        activity_type IN (
            'sql_injection_attempt',
            'xss_attempt', 
            'path_traversal_attempt',
            'honeypot_access',
            'suspicious_user_agent',
            'rate_limit_exceeded',
            'invalid_request_format',
            'ip_blocked',
            'unauthorized_access_attempt',
            'csrf_violation',
            'malicious_file_upload',
            'account_lockout',
            'brute_force_attempt',
            'session_hijacking_attempt'
        )
    ),
    CONSTRAINT security_logs_resolution_check CHECK (
        (resolved_at IS NULL AND resolved_by IS NULL) OR
        (resolved_at IS NOT NULL AND resolved_by IS NOT NULL)
    )
);

-- Create IP blocking table
CREATE TABLE blocked_ips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    blocked_reason TEXT NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who blocked, NULL for automatic
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    unblocked_at TIMESTAMP WITH TIME ZONE,
    unblocked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    unblock_reason TEXT,
    
    -- Constraints
    CONSTRAINT blocked_ips_expiry_check CHECK (
        expires_at IS NULL OR expires_at > blocked_at
    ),
    CONSTRAINT blocked_ips_unblock_check CHECK (
        (unblocked_at IS NULL AND unblocked_by IS NULL AND unblock_reason IS NULL) OR
        (unblocked_at IS NOT NULL AND unblocked_by IS NOT NULL)
    )
);

-- Create file security events table (specific to file operations)
CREATE TABLE file_security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET NOT NULL,
    event_type TEXT NOT NULL,
    event_details JSONB,
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    file_hash TEXT, -- SHA-256 hash of file content
    quarantined BOOLEAN DEFAULT FALSE,
    severity security_severity NOT NULL DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT file_security_events_valid_event CHECK (
        event_type IN (
            'malicious_file_detected',
            'file_upload_blocked',
            'suspicious_file_content',
            'unauthorized_file_access',
            'file_quarantined',
            'virus_scan_failed',
            'file_size_violation',
            'invalid_file_type',
            'file_content_mismatch',
            'excessive_upload_attempts'
        )
    ),
    CONSTRAINT file_security_events_valid_hash CHECK (
        file_hash IS NULL OR file_hash ~ '^[a-f0-9]{64}$'
    )
);

-- Create rate limiting tracking table
CREATE TABLE rate_limit_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    limit_exceeded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT rate_limit_violations_window_check CHECK (
        window_end > window_start
    ),
    CONSTRAINT rate_limit_violations_count_check CHECK (
        request_count > 0
    )
);

-- Create indexes for performance
CREATE INDEX idx_security_logs_ip_address ON security_logs(ip_address);
CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX idx_security_logs_activity_type ON security_logs(activity_type);
CREATE INDEX idx_security_logs_severity ON security_logs(severity);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_security_logs_unresolved ON security_logs(timestamp) WHERE resolved_at IS NULL;

CREATE INDEX idx_blocked_ips_address ON blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_active ON blocked_ips(is_active, blocked_at) WHERE is_active = TRUE;
CREATE INDEX idx_blocked_ips_expires ON blocked_ips(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_file_security_events_file_id ON file_security_events(file_id);
CREATE INDEX idx_file_security_events_user_id ON file_security_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_file_security_events_ip ON file_security_events(ip_address);
CREATE INDEX idx_file_security_events_created ON file_security_events(created_at);
CREATE INDEX idx_file_security_events_event_type ON file_security_events(event_type);
CREATE INDEX idx_file_security_events_severity ON file_security_events(severity);
CREATE INDEX idx_file_security_events_quarantined ON file_security_events(quarantined) WHERE quarantined = TRUE;

CREATE INDEX idx_rate_limit_violations_ip ON rate_limit_violations(ip_address);
CREATE INDEX idx_rate_limit_violations_endpoint ON rate_limit_violations(endpoint);
CREATE INDEX idx_rate_limit_violations_window ON rate_limit_violations(window_start, window_end);
CREATE INDEX idx_rate_limit_violations_exceeded ON rate_limit_violations(limit_exceeded_at);

-- Enable RLS on all tables
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_logs
-- Only admins and service role can access security logs
CREATE POLICY "Admins can view all security logs" ON security_logs
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Service role can manage security logs" ON security_logs
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for blocked_ips
CREATE POLICY "Admins can manage blocked IPs" ON blocked_ips
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Service role can manage blocked IPs" ON blocked_ips
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for file_security_events
-- Users can see events related to their own files
CREATE POLICY "Users can view their file security events" ON file_security_events
    FOR SELECT USING (
        auth.role() = 'authenticated' AND user_id = auth.uid()
    );

-- Admins can see all file security events
CREATE POLICY "Admins can view all file security events" ON file_security_events
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Service role can manage file security events" ON file_security_events
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for rate_limit_violations
-- Users can see their own rate limit violations
CREATE POLICY "Users can view their rate limit violations" ON rate_limit_violations
    FOR SELECT USING (
        auth.role() = 'authenticated' AND user_id = auth.uid()
    );

CREATE POLICY "Admins can view all rate limit violations" ON rate_limit_violations
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Service role can manage rate limit violations" ON rate_limit_violations
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for security management

-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(check_ip INET)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_ips
        WHERE ip_address = check_ip
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to block an IP address
CREATE OR REPLACE FUNCTION block_ip_address(
    p_ip_address INET,
    p_reason TEXT,
    p_blocked_by UUID DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    blocked_ip_id UUID;
BEGIN
    INSERT INTO blocked_ips (
        ip_address,
        blocked_reason,
        blocked_by,
        expires_at,
        is_active
    ) VALUES (
        p_ip_address,
        p_reason,
        p_blocked_by,
        p_expires_at,
        TRUE
    )
    ON CONFLICT (ip_address) DO UPDATE SET
        blocked_reason = EXCLUDED.blocked_reason,
        blocked_at = NOW(),
        blocked_by = EXCLUDED.blocked_by,
        expires_at = EXCLUDED.expires_at,
        is_active = TRUE,
        unblocked_at = NULL,
        unblocked_by = NULL,
        unblock_reason = NULL
    RETURNING id INTO blocked_ip_id;
    
    RETURN blocked_ip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unblock an IP address
CREATE OR REPLACE FUNCTION unblock_ip_address(
    p_ip_address INET,
    p_unblocked_by UUID,
    p_unblock_reason TEXT DEFAULT 'Manual unblock'
)
RETURNS BOOLEAN AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE blocked_ips
    SET 
        is_active = FALSE,
        unblocked_at = NOW(),
        unblocked_by = p_unblocked_by,
        unblock_reason = p_unblock_reason
    WHERE ip_address = p_ip_address
    AND is_active = TRUE;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security event
CREATE OR REPLACE FUNCTION log_security_event(
    p_ip_address INET,
    p_activity_type TEXT,
    p_details TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_referer TEXT DEFAULT NULL,
    p_request_path TEXT DEFAULT NULL,
    p_request_method TEXT DEFAULT NULL,
    p_severity security_severity DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO security_logs (
        ip_address,
        activity_type,
        details,
        user_id,
        user_agent,
        referer,
        request_path,
        request_method,
        severity
    ) VALUES (
        p_ip_address,
        p_activity_type,
        p_details,
        p_user_id,
        p_user_agent,
        p_referer,
        p_request_path,
        p_request_method,
        p_severity
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log file security event
CREATE OR REPLACE FUNCTION log_file_security_event(
    p_file_id UUID,
    p_user_id UUID,
    p_ip_address INET,
    p_event_type TEXT,
    p_event_details JSONB DEFAULT NULL,
    p_file_name TEXT DEFAULT NULL,
    p_file_size BIGINT DEFAULT NULL,
    p_file_type TEXT DEFAULT NULL,
    p_file_hash TEXT DEFAULT NULL,
    p_quarantined BOOLEAN DEFAULT FALSE,
    p_severity security_severity DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO file_security_events (
        file_id,
        user_id,
        ip_address,
        event_type,
        event_details,
        file_name,
        file_size,
        file_type,
        file_hash,
        quarantined,
        severity
    ) VALUES (
        p_file_id,
        p_user_id,
        p_ip_address,
        p_event_type,
        p_event_details,
        p_file_name,
        p_file_size,
        p_file_type,
        p_file_hash,
        p_quarantined,
        p_severity
    )
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get security statistics
CREATE OR REPLACE FUNCTION get_security_statistics(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_events BIGINT,
    critical_events BIGINT,
    high_events BIGINT,
    blocked_ips_count BIGINT,
    file_security_events BIGINT,
    quarantined_files BIGINT,
    rate_limit_violations BIGINT,
    top_attack_types JSONB,
    top_blocked_ips JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM security_logs WHERE timestamp BETWEEN start_date AND end_date) as total_events,
        (SELECT COUNT(*) FROM security_logs WHERE timestamp BETWEEN start_date AND end_date AND severity = 'critical') as critical_events,
        (SELECT COUNT(*) FROM security_logs WHERE timestamp BETWEEN start_date AND end_date AND severity = 'high') as high_events,
        (SELECT COUNT(*) FROM blocked_ips WHERE is_active = TRUE) as blocked_ips_count,
        (SELECT COUNT(*) FROM file_security_events WHERE created_at BETWEEN start_date AND end_date) as file_security_events,
        (SELECT COUNT(*) FROM file_security_events WHERE created_at BETWEEN start_date AND end_date AND quarantined = TRUE) as quarantined_files,
        (SELECT COUNT(*) FROM rate_limit_violations WHERE limit_exceeded_at BETWEEN start_date AND end_date) as rate_limit_violations,
        (
            SELECT jsonb_agg(jsonb_build_object('type', activity_type, 'count', event_count))
            FROM (
                SELECT activity_type, COUNT(*) as event_count
                FROM security_logs
                WHERE timestamp BETWEEN start_date AND end_date
                GROUP BY activity_type
                ORDER BY event_count DESC
                LIMIT 10
            ) top_types
        ) as top_attack_types,
        (
            SELECT jsonb_agg(jsonb_build_object('ip', ip_address, 'events', event_count))
            FROM (
                SELECT ip_address, COUNT(*) as event_count
                FROM security_logs
                WHERE timestamp BETWEEN start_date AND end_date
                GROUP BY ip_address
                ORDER BY event_count DESC
                LIMIT 10
            ) top_ips
        ) as top_blocked_ips;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old security logs (should be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs(
    retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    deleted_logs BIGINT,
    deleted_violations BIGINT,
    expired_blocks BIGINT
) AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
    logs_deleted BIGINT;
    violations_deleted BIGINT;
    blocks_expired BIGINT;
BEGIN
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Delete old security logs (keep critical events longer)
    DELETE FROM security_logs 
    WHERE timestamp < cutoff_date 
    AND severity NOT IN ('critical', 'high');
    
    GET DIAGNOSTICS logs_deleted = ROW_COUNT;
    
    -- Delete old rate limit violations
    DELETE FROM rate_limit_violations 
    WHERE limit_exceeded_at < cutoff_date;
    
    GET DIAGNOSTICS violations_deleted = ROW_COUNT;
    
    -- Expire old IP blocks
    UPDATE blocked_ips 
    SET is_active = FALSE, unblocked_at = NOW(), unblock_reason = 'Expired automatically'
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_active = TRUE;
    
    GET DIAGNOSTICS blocks_expired = ROW_COUNT;
    
    RETURN QUERY SELECT logs_deleted, violations_deleted, blocks_expired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE security_logs IS 'Comprehensive security event logging for audit and monitoring';
COMMENT ON TABLE blocked_ips IS 'IP addresses that have been blocked due to suspicious activity';
COMMENT ON TABLE file_security_events IS 'Security events specifically related to file operations';
COMMENT ON TABLE rate_limit_violations IS 'Records of rate limiting violations for analysis';

COMMENT ON FUNCTION is_ip_blocked IS 'Check if an IP address is currently blocked';
COMMENT ON FUNCTION block_ip_address IS 'Block an IP address with optional expiration';
COMMENT ON FUNCTION log_security_event(INET, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, security_severity) IS 'Log a general security event';
COMMENT ON FUNCTION log_file_security_event IS 'Log a file-specific security event';
