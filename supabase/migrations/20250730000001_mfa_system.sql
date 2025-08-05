-- MFA System Migration
-- This migration adds Multi-Factor Authentication support to the Loom app

-- Create MFA-related enums
CREATE TYPE mfa_method AS ENUM ('totp', 'backup_code');
CREATE TYPE mfa_event_type AS ENUM ('setup', 'enable', 'disable', 'verify_success', 'verify_failure', 'backup_code_used', 'backup_codes_regenerated');

-- Create user_mfa table to store MFA settings per user
CREATE TABLE user_mfa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    secret_key TEXT, -- Encrypted TOTP secret
    backup_codes TEXT[], -- Array of encrypted backup codes
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one MFA record per user
    UNIQUE(user_id)
);

-- Create mfa_attempts table for rate limiting and security monitoring
CREATE TABLE mfa_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    method mfa_method NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mfa_events table for audit logging
CREATE TABLE mfa_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    event_type mfa_event_type NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_mfa_user_id ON user_mfa(user_id);
CREATE INDEX idx_user_mfa_enabled ON user_mfa(is_enabled);

CREATE INDEX idx_mfa_attempts_user_id ON mfa_attempts(user_id);
CREATE INDEX idx_mfa_attempts_created_at ON mfa_attempts(created_at);
CREATE INDEX idx_mfa_attempts_ip_address ON mfa_attempts(ip_address);
CREATE INDEX idx_mfa_attempts_success ON mfa_attempts(success);

CREATE INDEX idx_mfa_events_user_id ON mfa_events(user_id);
CREATE INDEX idx_mfa_events_event_type ON mfa_events(event_type);
CREATE INDEX idx_mfa_events_created_at ON mfa_events(created_at);

-- Add updated_at trigger for user_mfa table
CREATE TRIGGER update_user_mfa_updated_at BEFORE UPDATE ON user_mfa
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add MFA column to users table to indicate if MFA is required
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT false;

-- Create index for the new column
CREATE INDEX idx_users_mfa_enabled ON users(mfa_enabled);

-- Function to check rate limiting for MFA attempts
CREATE OR REPLACE FUNCTION check_mfa_rate_limit(
    user_uuid UUID,
    ip_addr INET,
    time_window INTERVAL DEFAULT '15 minutes',
    max_attempts INTEGER DEFAULT 5
) RETURNS BOOLEAN AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    -- Count failed attempts in the time window
    SELECT COUNT(*)
    INTO attempt_count
    FROM mfa_attempts
    WHERE (user_id = user_uuid OR ip_address = ip_addr)
    AND success = false
    AND created_at > NOW() - time_window;
    
    RETURN attempt_count < max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log MFA events
CREATE OR REPLACE FUNCTION log_mfa_event(
    user_uuid UUID,
    event_type_val mfa_event_type,
    ip_addr INET DEFAULT NULL,
    user_agent_val TEXT DEFAULT NULL,
    metadata_val JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO mfa_events (user_id, event_type, ip_address, user_agent, metadata)
    VALUES (user_uuid, event_type_val, ip_addr, user_agent_val, metadata_val)
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old MFA attempts and events (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_mfa_data(
    attempts_retention INTERVAL DEFAULT '30 days',
    events_retention INTERVAL DEFAULT '90 days'
) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean up old attempts
    DELETE FROM mfa_attempts
    WHERE created_at < NOW() - attempts_retention;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old events (keep important events longer)
    DELETE FROM mfa_events
    WHERE created_at < NOW() - events_retention
    AND event_type NOT IN ('setup', 'enable', 'disable');
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for MFA tables
ALTER TABLE user_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_events ENABLE ROW LEVEL SECURITY;

-- Users can only access their own MFA data
CREATE POLICY user_mfa_policy ON user_mfa
    USING (auth.uid() = user_id);

-- Users can only view their own MFA attempts
CREATE POLICY mfa_attempts_policy ON mfa_attempts
    USING (auth.uid() = user_id);

-- Users can only view their own MFA events
CREATE POLICY mfa_events_policy ON mfa_events
    USING (auth.uid() = user_id);

-- Admin policies (users with admin role can access all MFA data)
CREATE POLICY admin_user_mfa_policy ON user_mfa
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY admin_mfa_attempts_policy ON mfa_attempts
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY admin_mfa_events_policy ON mfa_events
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create a view for MFA statistics (for admin dashboard)
CREATE VIEW mfa_statistics AS
SELECT 
    COUNT(*) FILTER (WHERE mfa_enabled = true) as users_with_mfa_enabled,
    COUNT(*) FILTER (WHERE mfa_enabled = false) as users_without_mfa,
    COUNT(DISTINCT mfa_attempts.user_id) FILTER (WHERE mfa_attempts.created_at > NOW() - INTERVAL '24 hours') as active_mfa_users_24h,
    COUNT(*) FILTER (WHERE mfa_attempts.success = false AND mfa_attempts.created_at > NOW() - INTERVAL '24 hours') as failed_attempts_24h,
    COUNT(*) FILTER (WHERE mfa_events.event_type = 'setup' AND mfa_events.created_at > NOW() - INTERVAL '7 days') as new_mfa_setups_7d
FROM users
LEFT JOIN mfa_attempts ON users.id = mfa_attempts.user_id
LEFT JOIN mfa_events ON users.id = mfa_events.user_id;

-- Grant access to the statistics view for admins
CREATE POLICY admin_mfa_statistics_policy ON mfa_statistics
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

COMMENT ON TABLE user_mfa IS 'Stores MFA configuration for each user';
COMMENT ON TABLE mfa_attempts IS 'Logs all MFA verification attempts for security monitoring';
COMMENT ON TABLE mfa_events IS 'Audit log for MFA-related events';
COMMENT ON FUNCTION check_mfa_rate_limit IS 'Checks if user/IP has exceeded MFA attempt rate limits';
COMMENT ON FUNCTION log_mfa_event IS 'Helper function to log MFA events with metadata';
COMMENT ON FUNCTION cleanup_mfa_data IS 'Maintenance function to clean up old MFA data';