-- Add MFA support to the users table
ALTER TABLE users 
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN mfa_secret TEXT,
ADD COLUMN mfa_backup_codes TEXT[],
ADD COLUMN mfa_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN mfa_setup_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN remember_device_enabled BOOLEAN DEFAULT FALSE;

-- Create MFA sessions table for partial authentication tracking
CREATE TABLE mfa_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    password_verified BOOLEAN DEFAULT FALSE,
    mfa_verified BOOLEAN DEFAULT FALSE,
    device_fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT mfa_sessions_future_expiry CHECK (expires_at > created_at)
);

-- Create trusted devices table for remember device functionality
CREATE TABLE trusted_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    ip_address INET,
    user_agent TEXT,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, device_fingerprint),
    CONSTRAINT trusted_devices_future_expiry CHECK (expires_at > created_at)
);

-- Create MFA audit log for security monitoring
CREATE TABLE mfa_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL, -- 'setup', 'verify_success', 'verify_failure', 'disable', 'backup_code_used'
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_mfa_sessions_user_id ON mfa_sessions(user_id);
CREATE INDEX idx_mfa_sessions_session_token ON mfa_sessions(session_token);
CREATE INDEX idx_mfa_sessions_expires_at ON mfa_sessions(expires_at);

CREATE INDEX idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX idx_trusted_devices_device_fingerprint ON trusted_devices(device_fingerprint);
CREATE INDEX idx_trusted_devices_expires_at ON trusted_devices(expires_at);

CREATE INDEX idx_mfa_audit_log_user_id ON mfa_audit_log(user_id);
CREATE INDEX idx_mfa_audit_log_action ON mfa_audit_log(action);
CREATE INDEX idx_mfa_audit_log_created_at ON mfa_audit_log(created_at);

CREATE INDEX idx_users_mfa_enabled ON users(mfa_enabled);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_mfa_sessions_updated_at BEFORE UPDATE ON mfa_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired MFA sessions
CREATE OR REPLACE FUNCTION cleanup_expired_mfa_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM mfa_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM trusted_devices WHERE expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure backup codes
CREATE OR REPLACE FUNCTION generate_backup_codes(user_uuid UUID, code_count INTEGER DEFAULT 10)
RETURNS TEXT[] AS $$
DECLARE
    backup_codes TEXT[] := '{}';
    code TEXT;
    i INTEGER;
BEGIN
    FOR i IN 1..code_count LOOP
        -- Generate 8-character alphanumeric code
        code := UPPER(SUBSTRING(encode(gen_random_bytes(6), 'base64') FROM 1 FOR 8));
        code := REPLACE(code, '/', '');
        code := REPLACE(code, '+', '');
        code := REPLACE(code, '=', '');
        
        -- Ensure we have 8 characters
        WHILE LENGTH(code) < 8 LOOP
            code := code || SUBSTRING('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (RANDOM() * 32)::INTEGER + 1, 1);
        END LOOP;
        
        backup_codes := array_append(backup_codes, SUBSTRING(code FROM 1 FOR 8));
    END LOOP;
    
    RETURN backup_codes;
END;
$$ LANGUAGE plpgsql;

-- Function to validate backup code usage
CREATE OR REPLACE FUNCTION use_backup_code(user_uuid UUID, backup_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_codes TEXT[];
    updated_codes TEXT[];
    code_found BOOLEAN := FALSE;
    code TEXT;
BEGIN
    -- Get current backup codes
    SELECT mfa_backup_codes INTO current_codes
    FROM users
    WHERE id = user_uuid AND mfa_enabled = TRUE;
    
    IF current_codes IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if code exists and remove it
    FOREACH code IN ARRAY current_codes LOOP
        IF UPPER(code) = UPPER(backup_code) THEN
            code_found := TRUE;
        ELSE
            updated_codes := array_append(updated_codes, code);
        END IF;
    END LOOP;
    
    IF code_found THEN
        -- Update user with remaining codes
        UPDATE users 
        SET mfa_backup_codes = updated_codes,
            updated_at = NOW()
        WHERE id = user_uuid;
        
        -- Log the usage
        INSERT INTO mfa_audit_log (user_id, action, details)
        VALUES (user_uuid, 'backup_code_used', jsonb_build_object('remaining_codes', array_length(updated_codes, 1)));
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the MFA workflow
COMMENT ON TABLE mfa_sessions IS 'Tracks partial authentication sessions during MFA flow';
COMMENT ON TABLE trusted_devices IS 'Stores trusted devices for remember device functionality';
COMMENT ON TABLE mfa_audit_log IS 'Security audit log for MFA-related actions';

COMMENT ON COLUMN users.mfa_enabled IS 'Whether MFA is enabled for this user';
COMMENT ON COLUMN users.mfa_secret IS 'Encrypted TOTP secret for authenticator apps';
COMMENT ON COLUMN users.mfa_backup_codes IS 'Array of backup codes for MFA recovery';
COMMENT ON COLUMN users.mfa_verified_at IS 'Timestamp of last successful MFA verification';
COMMENT ON COLUMN users.mfa_setup_completed IS 'Whether user has completed MFA setup process';
COMMENT ON COLUMN users.remember_device_enabled IS 'Whether user has enabled remember device option';