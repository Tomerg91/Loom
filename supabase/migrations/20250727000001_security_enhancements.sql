-- Security enhancement functions for role validation and audit logging
-- This migration adds database-level security functions to complement RLS policies

-- Create audit log table for security events
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Enable RLS on audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON security_audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON security_audit_log
    FOR INSERT WITH CHECK (true);

-- Function to validate user role with enhanced security checks
CREATE OR REPLACE FUNCTION validate_user_role(
    user_id UUID,
    expected_role user_role
)
RETURNS BOOLEAN AS $$
DECLARE
    actual_role user_role;
    user_status user_status;
    account_created TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user details with security checks
    SELECT role, status, created_at 
    INTO actual_role, user_status, account_created
    FROM users 
    WHERE id = user_id;
    
    -- Check if user exists
    IF NOT FOUND THEN
        -- Log security event
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (user_id, 'role_validation_failed', 
                jsonb_build_object('reason', 'user_not_found', 'expected_role', expected_role),
                'warning');
        RETURN FALSE;
    END IF;
    
    -- Check if user is active
    IF user_status != 'active' THEN
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (user_id, 'role_validation_failed', 
                jsonb_build_object('reason', 'user_inactive', 'status', user_status, 'expected_role', expected_role),
                'warning');
        RETURN FALSE;
    END IF;
    
    -- Check for suspicious account creation date
    IF account_created > NOW() THEN
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (user_id, 'role_validation_failed', 
                jsonb_build_object('reason', 'invalid_creation_date', 'created_at', account_created),
                'error');
        RETURN FALSE;
    END IF;
    
    -- Validate role
    IF actual_role != expected_role THEN
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (user_id, 'role_validation_failed', 
                jsonb_build_object('reason', 'role_mismatch', 'actual_role', actual_role, 'expected_role', expected_role),
                'warning');
        RETURN FALSE;
    END IF;
    
    -- Log successful validation
    INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
    VALUES (user_id, 'role_validation_success', 
            jsonb_build_object('role', actual_role),
            'info');
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate user can access another user's data
CREATE OR REPLACE FUNCTION validate_user_access(
    accessing_user_id UUID,
    target_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    accessing_role user_role;
    target_role user_role;
    has_relationship BOOLEAN := FALSE;
BEGIN
    -- Get roles
    SELECT role INTO accessing_role FROM users WHERE id = accessing_user_id;
    SELECT role INTO target_role FROM users WHERE id = target_user_id;
    
    -- Check if users exist
    IF accessing_role IS NULL OR target_role IS NULL THEN
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (accessing_user_id, 'access_validation_failed', 
                jsonb_build_object('reason', 'user_not_found', 'target_user_id', target_user_id),
                'warning');
        RETURN FALSE;
    END IF;
    
    -- Admin can access anyone
    IF accessing_role = 'admin' THEN
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (accessing_user_id, 'access_validation_success', 
                jsonb_build_object('reason', 'admin_access', 'target_user_id', target_user_id),
                'info');
        RETURN TRUE;
    END IF;
    
    -- Users can access themselves
    IF accessing_user_id = target_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Coach can access their clients
    IF accessing_role = 'coach' AND target_role = 'client' THEN
        SELECT EXISTS(
            SELECT 1 FROM sessions 
            WHERE coach_id = accessing_user_id AND client_id = target_user_id
        ) INTO has_relationship;
        
        IF has_relationship THEN
            INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
            VALUES (accessing_user_id, 'access_validation_success', 
                    jsonb_build_object('reason', 'coach_client_relationship', 'target_user_id', target_user_id),
                    'info');
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Client can access their coach
    IF accessing_role = 'client' AND target_role = 'coach' THEN
        SELECT EXISTS(
            SELECT 1 FROM sessions 
            WHERE coach_id = target_user_id AND client_id = accessing_user_id
        ) INTO has_relationship;
        
        IF has_relationship THEN
            INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
            VALUES (accessing_user_id, 'access_validation_success', 
                    jsonb_build_object('reason', 'client_coach_relationship', 'target_user_id', target_user_id),
                    'info');
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Log failed access attempt
    INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
    VALUES (accessing_user_id, 'access_validation_failed', 
            jsonb_build_object('reason', 'no_relationship', 'accessing_role', accessing_role, 'target_role', target_role, 'target_user_id', target_user_id),
            'warning');
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate session access with enhanced security
CREATE OR REPLACE FUNCTION validate_session_access(
    user_id UUID,
    session_id UUID,
    action TEXT DEFAULT 'read'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role user_role;
    session_coach_id UUID;
    session_client_id UUID;
    session_status session_status;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = user_id;
    
    -- Get session details
    SELECT coach_id, client_id, status 
    INTO session_coach_id, session_client_id, session_status
    FROM sessions 
    WHERE id = session_id;
    
    -- Check if session exists
    IF session_coach_id IS NULL THEN
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (user_id, 'session_access_failed', 
                jsonb_build_object('reason', 'session_not_found', 'session_id', session_id, 'action', action),
                'warning');
        RETURN FALSE;
    END IF;
    
    -- Admin can access any session
    IF user_role = 'admin' THEN
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (user_id, 'session_access_success', 
                jsonb_build_object('reason', 'admin_access', 'session_id', session_id, 'action', action),
                'info');
        RETURN TRUE;
    END IF;
    
    -- Coach can access their sessions
    IF user_role = 'coach' AND user_id = session_coach_id THEN
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (user_id, 'session_access_success', 
                jsonb_build_object('reason', 'coach_owns_session', 'session_id', session_id, 'action', action),
                'info');
        RETURN TRUE;
    END IF;
    
    -- Client can access their sessions (read-only for most actions)
    IF user_role = 'client' AND user_id = session_client_id THEN
        -- Clients can only modify certain fields
        IF action IN ('read', 'update_notes') OR (action = 'update' AND session_status = 'scheduled') THEN
            INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
            VALUES (user_id, 'session_access_success', 
                    jsonb_build_object('reason', 'client_owns_session', 'session_id', session_id, 'action', action),
                    'info');
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Log failed access attempt
    INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
    VALUES (user_id, 'session_access_failed', 
            jsonb_build_object('reason', 'insufficient_permissions', 'user_role', user_role, 'session_id', session_id, 'action', action),
            'warning');
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events from application code
CREATE OR REPLACE FUNCTION log_security_event(
    user_id UUID,
    event_type TEXT,
    event_details JSONB DEFAULT NULL,
    severity TEXT DEFAULT 'info',
    ip_address INET DEFAULT NULL,
    user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO security_audit_log (user_id, event_type, event_details, severity, ip_address, user_agent)
    VALUES (log_security_event.user_id, log_security_event.event_type, log_security_event.event_details, 
            log_security_event.severity, log_security_event.ip_address, log_security_event.user_agent)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for suspicious activity patterns
CREATE OR REPLACE FUNCTION check_suspicious_activity(
    user_id UUID,
    time_window INTERVAL DEFAULT '1 hour'
)
RETURNS JSONB AS $$
DECLARE
    failed_attempts INTEGER;
    warning_events INTEGER;
    error_events INTEGER;
    different_ips INTEGER;
    result JSONB;
BEGIN
    -- Count failed authentication attempts
    SELECT COUNT(*) INTO failed_attempts
    FROM security_audit_log
    WHERE user_id = check_suspicious_activity.user_id
    AND event_type LIKE '%_failed'
    AND timestamp > NOW() - time_window;
    
    -- Count warning events
    SELECT COUNT(*) INTO warning_events
    FROM security_audit_log
    WHERE user_id = check_suspicious_activity.user_id
    AND severity = 'warning'
    AND timestamp > NOW() - time_window;
    
    -- Count error events
    SELECT COUNT(*) INTO error_events
    FROM security_audit_log
    WHERE user_id = check_suspicious_activity.user_id
    AND severity = 'error'
    AND timestamp > NOW() - time_window;
    
    -- Count different IP addresses
    SELECT COUNT(DISTINCT ip_address) INTO different_ips
    FROM security_audit_log
    WHERE user_id = check_suspicious_activity.user_id
    AND ip_address IS NOT NULL
    AND timestamp > NOW() - time_window;
    
    result := jsonb_build_object(
        'user_id', user_id,
        'time_window', time_window,
        'failed_attempts', failed_attempts,
        'warning_events', warning_events,
        'error_events', error_events,
        'different_ips', different_ips,
        'is_suspicious', (failed_attempts > 5 OR warning_events > 10 OR error_events > 3 OR different_ips > 5),
        'risk_score', LEAST(100, (failed_attempts * 5) + (warning_events * 2) + (error_events * 10) + (different_ips * 3))
    );
    
    -- Log if suspicious activity detected
    IF (result->>'is_suspicious')::boolean THEN
        INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
        VALUES (user_id, 'suspicious_activity_detected', result, 'error');
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION validate_user_role(UUID, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_user_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_session_access(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(UUID, TEXT, JSONB, TEXT, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_suspicious_activity(UUID, INTERVAL) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_timestamp ON security_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_severity ON security_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_ip_address ON security_audit_log(ip_address);

-- Create a view for security dashboard (admin only)
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    date_trunc('hour', timestamp) as hour,
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM security_audit_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', timestamp), event_type, severity
ORDER BY hour DESC, event_count DESC;

GRANT SELECT ON security_dashboard TO authenticated;

-- Create RLS policy for security dashboard (admin only)
CREATE POLICY "Admins can view security dashboard" ON security_audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );