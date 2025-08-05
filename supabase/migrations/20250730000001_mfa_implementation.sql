-- Multi-Factor Authentication Implementation
-- This migration adds comprehensive MFA support with TOTP, backup codes, and security logging
-- Designed to integrate seamlessly with existing Loom app database structure

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create MFA-related ENUM types
CREATE TYPE mfa_method_type AS ENUM ('totp', 'sms', 'email', 'webauthn');
CREATE TYPE mfa_status AS ENUM ('pending', 'active', 'disabled', 'suspended');
CREATE TYPE mfa_verification_status AS ENUM ('success', 'failed', 'expired', 'rate_limited');
CREATE TYPE backup_code_status AS ENUM ('active', 'used', 'expired');

-- Main MFA settings table for users
CREATE TABLE user_mfa_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    is_enforced BOOLEAN NOT NULL DEFAULT false, -- Admin can enforce MFA for specific users
    backup_codes_generated BOOLEAN NOT NULL DEFAULT false,
    last_backup_codes_generated_at TIMESTAMP WITH TIME ZONE,
    recovery_email TEXT, -- Optional recovery email for MFA reset
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one MFA setting per user
    UNIQUE(user_id)
);

-- MFA methods table (supports multiple methods per user for future extensibility)
CREATE TABLE user_mfa_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    method_type mfa_method_type NOT NULL,
    status mfa_status NOT NULL DEFAULT 'pending',
    method_name TEXT, -- User-friendly name (e.g., "My Phone", "Google Authenticator")
    
    -- TOTP-specific fields (encrypted)
    secret_encrypted BYTEA, -- Encrypted TOTP secret
    secret_salt BYTEA, -- Salt for secret encryption
    qr_code_url TEXT, -- Temporary QR code URL for setup
    
    -- SMS/Email specific fields
    phone_number TEXT,
    email_address TEXT,
    
    -- WebAuthn specific fields (for future implementation)
    credential_id TEXT,
    public_key BYTEA,
    
    -- Security and validation
    verification_code TEXT, -- Temporary verification code for setup
    verification_expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_totp_fields CHECK (
        (method_type = 'totp' AND secret_encrypted IS NOT NULL AND secret_salt IS NOT NULL) OR
        (method_type != 'totp')
    ),
    CONSTRAINT valid_sms_fields CHECK (
        (method_type = 'sms' AND phone_number IS NOT NULL) OR
        (method_type != 'sms')
    ),
    CONSTRAINT valid_email_fields CHECK (
        (method_type = 'email' AND email_address IS NOT NULL) OR
        (method_type != 'email')
    ),
    CONSTRAINT valid_webauthn_fields CHECK (
        (method_type = 'webauthn' AND credential_id IS NOT NULL AND public_key IS NOT NULL) OR
        (method_type != 'webauthn')
    )
);

-- MFA backup codes table
CREATE TABLE mfa_backup_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    code_hash TEXT NOT NULL, -- Hashed backup code (never store plaintext)
    code_salt BYTEA NOT NULL, -- Salt for hashing
    status backup_code_status NOT NULL DEFAULT 'active',
    used_at TIMESTAMP WITH TIME ZONE,
    used_ip INET,
    used_user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for quick lookups
    UNIQUE(user_id, code_hash)
);

-- MFA verification attempts table (for rate limiting and security monitoring)
CREATE TABLE mfa_verification_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    method_id UUID REFERENCES user_mfa_methods(id) ON DELETE SET NULL,
    method_type mfa_method_type NOT NULL,
    status mfa_verification_status NOT NULL,
    attempt_code TEXT, -- Hashed version of attempted code (for forensics)
    is_backup_code BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    failure_reason TEXT, -- Detailed failure reason
    processing_time_ms INTEGER, -- Performance monitoring
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Partition-ready for high volume
    CONSTRAINT valid_processing_time CHECK (processing_time_ms >= 0)
);

-- MFA configuration table (system-wide settings)
CREATE TABLE mfa_system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Predefined configuration keys
    CONSTRAINT valid_setting_keys CHECK (
        setting_key IN (
            'totp_issuer_name',
            'totp_window_size',
            'backup_codes_count',
            'backup_codes_length',
            'max_verification_attempts',
            'lockout_duration_minutes',
            'rate_limit_window_minutes',
            'rate_limit_max_attempts',
            'qr_code_expiry_minutes',
            'enforce_mfa_for_admins',
            'enforce_mfa_for_coaches',
            'allow_mfa_reset_via_email'
        )
    )
);

-- Insert default MFA configuration
INSERT INTO mfa_system_config (setting_key, setting_value, description) VALUES
('totp_issuer_name', '"Loom Coaching App"', 'Name displayed in authenticator apps'),
('totp_window_size', '1', 'TOTP time window tolerance (30-second periods)'),
('backup_codes_count', '10', 'Number of backup codes to generate'),
('backup_codes_length', '8', 'Length of each backup code'),
('max_verification_attempts', '5', 'Max failed attempts before lockout'),
('lockout_duration_minutes', '15', 'Minutes to lock account after max failures'),
('rate_limit_window_minutes', '5', 'Rate limiting time window'),
('rate_limit_max_attempts', '10', 'Max attempts in rate limit window'),
('qr_code_expiry_minutes', '10', 'QR code validity duration'),
('enforce_mfa_for_admins', 'true', 'Require MFA for admin users'),
('enforce_mfa_for_coaches', 'false', 'Require MFA for coach users'),
('allow_mfa_reset_via_email', 'true', 'Allow MFA reset via email verification');

-- Enable Row Level Security on all MFA tables
ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_system_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_mfa_settings
CREATE POLICY "Users can view their own MFA settings" ON user_mfa_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own MFA settings" ON user_mfa_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MFA settings" ON user_mfa_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all MFA settings" ON user_mfa_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- RLS Policies for user_mfa_methods
CREATE POLICY "Users can manage their own MFA methods" ON user_mfa_methods
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all MFA methods" ON user_mfa_methods
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- RLS Policies for mfa_backup_codes
CREATE POLICY "Users can manage their own backup codes" ON mfa_backup_codes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view backup code status" ON mfa_backup_codes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- RLS Policies for mfa_verification_attempts
CREATE POLICY "Users can view their own verification attempts" ON mfa_verification_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert verification attempts" ON mfa_verification_attempts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all verification attempts" ON mfa_verification_attempts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- RLS Policies for mfa_system_config
CREATE POLICY "Authenticated users can view MFA config" ON mfa_system_config
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage MFA config" ON mfa_system_config
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Performance indexes
CREATE INDEX idx_user_mfa_settings_user_id ON user_mfa_settings(user_id);
CREATE INDEX idx_user_mfa_settings_enabled ON user_mfa_settings(is_enabled) WHERE is_enabled = true;

CREATE INDEX idx_user_mfa_methods_user_id ON user_mfa_methods(user_id);
CREATE INDEX idx_user_mfa_methods_status ON user_mfa_methods(status);
CREATE INDEX idx_user_mfa_methods_type ON user_mfa_methods(method_type);
CREATE INDEX idx_user_mfa_methods_last_used ON user_mfa_methods(last_used_at);

CREATE INDEX idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX idx_mfa_backup_codes_status ON mfa_backup_codes(status) WHERE status = 'active';
CREATE INDEX idx_mfa_backup_codes_expires_at ON mfa_backup_codes(expires_at);

CREATE INDEX idx_mfa_verification_attempts_user_id ON mfa_verification_attempts(user_id);
CREATE INDEX idx_mfa_verification_attempts_created_at ON mfa_verification_attempts(created_at);
CREATE INDEX idx_mfa_verification_attempts_status ON mfa_verification_attempts(status);
CREATE INDEX idx_mfa_verification_attempts_ip_address ON mfa_verification_attempts(ip_address);

-- Trigger functions for updated_at timestamps
CREATE TRIGGER update_user_mfa_settings_updated_at BEFORE UPDATE ON user_mfa_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_mfa_methods_updated_at BEFORE UPDATE ON user_mfa_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Security function: Encrypt TOTP secret
CREATE OR REPLACE FUNCTION encrypt_totp_secret(
    secret TEXT,
    user_id UUID
)
RETURNS TABLE(encrypted_secret BYTEA, salt BYTEA) AS $$
DECLARE
    secret_salt BYTEA;
    encryption_key BYTEA;
BEGIN
    -- Generate a random salt
    secret_salt := gen_random_bytes(32);
    
    -- Create encryption key from user ID and salt
    encryption_key := digest(user_id::TEXT || encode(secret_salt, 'hex'), 'sha256');
    
    -- Return encrypted secret and salt
    RETURN QUERY SELECT 
        pgp_sym_encrypt(secret, encode(encryption_key, 'hex'))::BYTEA,
        secret_salt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security function: Decrypt TOTP secret
CREATE OR REPLACE FUNCTION decrypt_totp_secret(
    encrypted_secret BYTEA,
    secret_salt BYTEA,
    user_id UUID
)
RETURNS TEXT AS $$
DECLARE
    encryption_key BYTEA;
    decrypted_secret TEXT;
BEGIN
    -- Recreate encryption key
    encryption_key := digest(user_id::TEXT || encode(secret_salt, 'hex'), 'sha256');
    
    -- Decrypt and return secret
    SELECT pgp_sym_decrypt(encrypted_secret, encode(encryption_key, 'hex')) INTO decrypted_secret;
    
    RETURN decrypted_secret;
EXCEPTION
    WHEN OTHERS THEN
        -- Log decryption failure
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (user_id, 'mfa_secret_decryption_failed', 
                jsonb_build_object('error', SQLERRM),
                'error');
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security function: Generate secure backup codes
CREATE OR REPLACE FUNCTION generate_backup_codes(
    target_user_id UUID,
    codes_count INTEGER DEFAULT 10,
    code_length INTEGER DEFAULT 8
)
RETURNS TEXT[] AS $$
DECLARE
    backup_codes TEXT[];
    code TEXT;
    code_hash TEXT;
    code_salt BYTEA;
    i INTEGER;
BEGIN
    -- Validate inputs
    IF codes_count <= 0 OR codes_count > 20 THEN
        RAISE EXCEPTION 'Invalid codes count. Must be between 1 and 20.';
    END IF;
    
    IF code_length < 6 OR code_length > 12 THEN
        RAISE EXCEPTION 'Invalid code length. Must be between 6 and 12.';
    END IF;
    
    -- Deactivate existing backup codes
    UPDATE mfa_backup_codes 
    SET status = 'expired' 
    WHERE user_id = target_user_id AND status = 'active';
    
    -- Generate new backup codes
    backup_codes := ARRAY[]::TEXT[];
    
    FOR i IN 1..codes_count LOOP
        -- Generate cryptographically secure random code
        code := upper(encode(gen_random_bytes(code_length/2), 'hex'));
        
        -- Add to return array
        backup_codes := array_append(backup_codes, code);
        
        -- Generate salt and hash for storage
        code_salt := gen_random_bytes(32);
        code_hash := encode(digest(code || encode(code_salt, 'hex'), 'sha256'), 'hex');
        
        -- Store hashed version
        INSERT INTO mfa_backup_codes (user_id, code_hash, code_salt)
        VALUES (target_user_id, code_hash, code_salt);
    END LOOP;
    
    -- Update MFA settings
    UPDATE user_mfa_settings 
    SET backup_codes_generated = true,
        last_backup_codes_generated_at = NOW(),
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Log security event
    INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
    VALUES (target_user_id, 'mfa_backup_codes_generated', 
            jsonb_build_object('codes_count', codes_count),
            'info');
    
    RETURN backup_codes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security function: Verify backup code
CREATE OR REPLACE FUNCTION verify_backup_code(
    target_user_id UUID,
    provided_code TEXT,
    client_ip INET DEFAULT NULL,
    client_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    stored_code RECORD;
    computed_hash TEXT;
    verification_success BOOLEAN := false;
BEGIN
    -- Check rate limiting
    IF NOT check_mfa_rate_limit(target_user_id, 'backup_code') THEN
        INSERT INTO mfa_verification_attempts 
        (user_id, method_type, status, is_backup_code, ip_address, user_agent, failure_reason)
        VALUES (target_user_id, 'totp', 'rate_limited', true, client_ip, client_user_agent, 'Rate limit exceeded');
        
        RETURN false;
    END IF;
    
    -- Find matching backup code
    FOR stored_code IN 
        SELECT id, code_hash, code_salt 
        FROM mfa_backup_codes 
        WHERE user_id = target_user_id AND status = 'active'
    LOOP
        -- Compute hash of provided code with stored salt
        computed_hash := encode(digest(upper(provided_code) || encode(stored_code.code_salt, 'hex'), 'sha256'), 'hex');
        
        IF computed_hash = stored_code.code_hash THEN
            -- Mark code as used
            UPDATE mfa_backup_codes 
            SET status = 'used',
                used_at = NOW(),
                used_ip = client_ip,
                used_user_agent = client_user_agent
            WHERE id = stored_code.id;
            
            verification_success := true;
            
            -- Log successful verification
            INSERT INTO mfa_verification_attempts 
            (user_id, method_type, status, is_backup_code, ip_address, user_agent)
            VALUES (target_user_id, 'totp', 'success', true, client_ip, client_user_agent);
            
            -- Log security event
            INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
            VALUES (target_user_id, 'mfa_backup_code_used', 
                    jsonb_build_object('code_id', stored_code.id, 'ip_address', client_ip),
                    'info');
            
            EXIT;
        END IF;
    END LOOP;
    
    -- Log failed attempt if no match found
    IF NOT verification_success THEN
        INSERT INTO mfa_verification_attempts 
        (user_id, method_type, status, is_backup_code, ip_address, user_agent, failure_reason)
        VALUES (target_user_id, 'totp', 'failed', true, client_ip, client_user_agent, 'Invalid backup code');
    END IF;
    
    RETURN verification_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security function: Check MFA rate limiting
CREATE OR REPLACE FUNCTION check_mfa_rate_limit(
    target_user_id UUID,
    method_type_param TEXT DEFAULT 'totp'
)
RETURNS BOOLEAN AS $$
DECLARE
    rate_limit_window INTEGER;
    rate_limit_max_attempts INTEGER;
    recent_attempts INTEGER;
    method_type_enum mfa_method_type;
BEGIN
    -- Get rate limiting configuration
    SELECT (setting_value::TEXT)::INTEGER INTO rate_limit_window
    FROM mfa_system_config WHERE setting_key = 'rate_limit_window_minutes';
    
    SELECT (setting_value::TEXT)::INTEGER INTO rate_limit_max_attempts
    FROM mfa_system_config WHERE setting_key = 'rate_limit_max_attempts';
    
    -- Convert string to enum
    method_type_enum := method_type_param::mfa_method_type;
    
    -- Count recent verification attempts
    SELECT COUNT(*) INTO recent_attempts
    FROM mfa_verification_attempts
    WHERE user_id = target_user_id
    AND method_type = method_type_enum
    AND created_at > NOW() - (rate_limit_window || ' minutes')::INTERVAL;
    
    RETURN recent_attempts < rate_limit_max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security function: Get MFA status for user
CREATE OR REPLACE FUNCTION get_user_mfa_status(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    mfa_settings RECORD;
    active_methods INTEGER;
    backup_codes_count INTEGER;
    recent_failures INTEGER;
    result JSONB;
BEGIN
    -- Get MFA settings
    SELECT * INTO mfa_settings
    FROM user_mfa_settings
    WHERE user_id = target_user_id;
    
    -- Count active methods
    SELECT COUNT(*) INTO active_methods
    FROM user_mfa_methods
    WHERE user_id = target_user_id AND status = 'active';
    
    -- Count available backup codes
    SELECT COUNT(*) INTO backup_codes_count
    FROM mfa_backup_codes
    WHERE user_id = target_user_id AND status = 'active' AND expires_at > NOW();
    
    -- Count recent failures
    SELECT COUNT(*) INTO recent_failures
    FROM mfa_verification_attempts
    WHERE user_id = target_user_id 
    AND status = 'failed' 
    AND created_at > NOW() - INTERVAL '24 hours';
    
    -- Build result
    result := jsonb_build_object(
        'is_enabled', COALESCE(mfa_settings.is_enabled, false),
        'is_enforced', COALESCE(mfa_settings.is_enforced, false),
        'active_methods_count', active_methods,
        'backup_codes_available', backup_codes_count,
        'backup_codes_generated', COALESCE(mfa_settings.backup_codes_generated, false),
        'recent_failures_24h', recent_failures,
        'last_backup_codes_generated', mfa_settings.last_backup_codes_generated_at,
        'recovery_email', mfa_settings.recovery_email
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for MFA dashboard (admin only)
CREATE OR REPLACE VIEW mfa_admin_dashboard AS
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    
    -- MFA Status
    COALESCE(mfa_settings.is_enabled, false) as mfa_enabled,
    COALESCE(mfa_settings.is_enforced, false) as mfa_enforced,
    mfa_settings.backup_codes_generated,
    mfa_settings.last_backup_codes_generated_at,
    
    -- Method counts
    COUNT(DISTINCT CASE WHEN methods.status = 'active' THEN methods.id END) as active_methods,
    COUNT(DISTINCT CASE WHEN methods.method_type = 'totp' AND methods.status = 'active' THEN methods.id END) as totp_methods,
    
    -- Backup codes
    COUNT(DISTINCT CASE WHEN codes.status = 'active' AND codes.expires_at > NOW() THEN codes.id END) as available_backup_codes,
    COUNT(DISTINCT CASE WHEN codes.status = 'used' THEN codes.id END) as used_backup_codes,
    
    -- Recent activity
    COUNT(DISTINCT CASE WHEN attempts.created_at > NOW() - INTERVAL '24 hours' AND attempts.status = 'success' THEN attempts.id END) as successful_verifications_24h,
    COUNT(DISTINCT CASE WHEN attempts.created_at > NOW() - INTERVAL '24 hours' AND attempts.status = 'failed' THEN attempts.id END) as failed_verifications_24h,
    
    -- Last activity
    MAX(methods.last_used_at) as last_mfa_used,
    MAX(attempts.created_at) as last_verification_attempt
    
FROM users u
LEFT JOIN user_mfa_settings mfa_settings ON u.id = mfa_settings.user_id
LEFT JOIN user_mfa_methods methods ON u.id = methods.user_id
LEFT JOIN mfa_backup_codes codes ON u.id = codes.user_id
LEFT JOIN mfa_verification_attempts attempts ON u.id = attempts.user_id
GROUP BY 
    u.id, u.email, u.role, u.first_name, u.last_name,
    mfa_settings.is_enabled, mfa_settings.is_enforced, 
    mfa_settings.backup_codes_generated, mfa_settings.last_backup_codes_generated_at;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION encrypt_totp_secret(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_totp_secret(BYTEA, BYTEA, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_backup_codes(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_backup_code(UUID, TEXT, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_mfa_rate_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_mfa_status(UUID) TO authenticated;

GRANT SELECT ON mfa_admin_dashboard TO authenticated;

-- Create RLS policy for admin dashboard view
CREATE POLICY "Admins can view MFA dashboard" ON mfa_admin_dashboard
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Add MFA enforcement trigger for admin/coach users based on system config
CREATE OR REPLACE FUNCTION check_mfa_enforcement()
RETURNS TRIGGER AS $$
DECLARE
    enforce_for_admins BOOLEAN;
    enforce_for_coaches BOOLEAN;
    user_role user_role;
    mfa_enabled BOOLEAN;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = NEW.id;
    
    -- Get enforcement settings
    SELECT (setting_value::TEXT)::BOOLEAN INTO enforce_for_admins
    FROM mfa_system_config WHERE setting_key = 'enforce_mfa_for_admins';
    
    SELECT (setting_value::TEXT)::BOOLEAN INTO enforce_for_coaches
    FROM mfa_system_config WHERE setting_key = 'enforce_mfa_for_coaches';
    
    -- Check if user has MFA enabled
    SELECT COALESCE(is_enabled, false) INTO mfa_enabled
    FROM user_mfa_settings WHERE user_id = NEW.id;
    
    -- Enforce MFA for admins if required
    IF user_role = 'admin' AND enforce_for_admins AND NOT mfa_enabled THEN
        -- Create or update MFA settings to enforce
        INSERT INTO user_mfa_settings (user_id, is_enforced)
        VALUES (NEW.id, true)
        ON CONFLICT (user_id) 
        DO UPDATE SET is_enforced = true, updated_at = NOW();
        
        -- Log enforcement
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (NEW.id, 'mfa_enforcement_applied', 
                jsonb_build_object('role', user_role, 'reason', 'admin_policy'),
                'info');
    END IF;
    
    -- Enforce MFA for coaches if required
    IF user_role = 'coach' AND enforce_for_coaches AND NOT mfa_enabled THEN
        INSERT INTO user_mfa_settings (user_id, is_enforced)
        VALUES (NEW.id, true)
        ON CONFLICT (user_id) 
        DO UPDATE SET is_enforced = true, updated_at = NOW();
        
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (NEW.id, 'mfa_enforcement_applied', 
                jsonb_build_object('role', user_role, 'reason', 'coach_policy'),
                'info');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check MFA enforcement on user updates
CREATE TRIGGER check_mfa_enforcement_trigger
    AFTER INSERT OR UPDATE OF role ON users
    FOR EACH ROW EXECUTE FUNCTION check_mfa_enforcement();

-- Cleanup function for expired data
CREATE OR REPLACE FUNCTION cleanup_mfa_data()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Clean up expired backup codes
    DELETE FROM mfa_backup_codes 
    WHERE status = 'active' AND expires_at < NOW();
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Clean up old verification attempts (keep 90 days)
    DELETE FROM mfa_verification_attempts 
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS cleanup_count = cleanup_count + ROW_COUNT;
    
    -- Clean up expired QR codes and verification codes
    UPDATE user_mfa_methods 
    SET qr_code_url = NULL,
        verification_code = NULL,
        verification_expires_at = NULL
    WHERE verification_expires_at < NOW();
    GET DIAGNOSTICS cleanup_count = cleanup_count + ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO security_audit_log (event_type, event_details, severity)
    VALUES ('mfa_data_cleanup', 
            jsonb_build_object('records_cleaned', cleanup_count),
            'info');
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant cleanup function to authenticated users (will be called by scheduled job)
GRANT EXECUTE ON FUNCTION cleanup_mfa_data() TO authenticated;

-- Create notification types for MFA events (extend existing enum)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type' AND typarray != 0) THEN
        -- If the enum doesn't support array operations, we need to recreate it
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mfa_setup_required';
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mfa_setup_completed';
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mfa_backup_codes_generated';
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mfa_method_added';
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mfa_method_removed';
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mfa_backup_code_used';
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mfa_login_failed';
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mfa_account_locked';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Comment: Due to PostgreSQL enum limitations, if the above fails, 
-- you may need to create a new migration to properly extend the notification_type enum
-- or create a separate mfa_notification_type enum for MFA-specific notifications.