-- Critical Security Fix: Repair broken PostgreSQL functions
-- This migration fixes ambiguous column references, missing FROM-clauses, 
-- and type casting issues in security-related database functions

-- Fix 1: is_time_slot_available - resolve ambiguous column reference "coach_id"
CREATE OR REPLACE FUNCTION is_time_slot_available(
  p_coach_id UUID,
  start_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  end_time TIMESTAMP WITH TIME ZONE;
  conflict_count INTEGER;
BEGIN
  end_time := start_time + (duration_minutes || ' minutes')::INTERVAL;
  
  SELECT COUNT(*)
  INTO conflict_count
  FROM sessions s
  WHERE s.coach_id = p_coach_id
    AND s.status IN ('scheduled', 'in_progress')
    AND (
      (s.scheduled_at <= start_time AND s.scheduled_at + (s.duration_minutes || ' minutes')::INTERVAL > start_time)
      OR
      (s.scheduled_at < end_time AND s.scheduled_at + (s.duration_minutes || ' minutes')::INTERVAL >= end_time)
      OR
      (s.scheduled_at >= start_time AND s.scheduled_at + (s.duration_minutes || ' minutes')::INTERVAL <= end_time)
    );
  
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: get_available_time_slots - resolve missing FROM-clause and ambiguous references
CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_coach_id UUID,
  target_date DATE,
  slot_duration INTEGER DEFAULT 60
)
RETURNS TABLE (
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN
) AS $$
DECLARE
  day_of_week INTEGER;
  availability_record RECORD;
  slot_time TIME;
  slot_start TIME;
  slot_end TIME;
BEGIN
  -- Get day of week (0 = Sunday, 1 = Monday, etc.)
  day_of_week := EXTRACT(DOW FROM target_date);
  
  -- Get coach availability for this day
  FOR availability_record IN
    SELECT ca.start_time, ca.end_time, ca.is_available
    FROM coach_availability ca
    WHERE ca.coach_id = p_coach_id
      AND ca.day_of_week = day_of_week
      AND ca.is_available = true
  LOOP
    -- Generate time slots within availability window
    slot_time := availability_record.start_time;
    
    WHILE slot_time + (slot_duration || ' minutes')::INTERVAL <= availability_record.end_time::TIME LOOP
      slot_start := slot_time;
      slot_end := slot_time + (slot_duration || ' minutes')::INTERVAL;
      
      -- Check if this slot conflicts with existing sessions
      RETURN QUERY
      SELECT 
        slot_start,
        slot_end,
        is_time_slot_available(
          p_coach_id,
          target_date + slot_start,
          slot_duration
        );
      
      slot_time := slot_time + (slot_duration || ' minutes')::INTERVAL;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 3: check_suspicious_activity - resolve ambiguous column reference "user_id"
CREATE OR REPLACE FUNCTION check_suspicious_activity(
  p_user_id UUID,
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
  FROM security_audit_log sal
  WHERE sal.user_id = p_user_id
  AND sal.event_type LIKE '%_failed'
  AND sal.timestamp > NOW() - time_window;
  
  -- Count warning events
  SELECT COUNT(*) INTO warning_events
  FROM security_audit_log sal
  WHERE sal.user_id = p_user_id
  AND sal.severity = 'warning'
  AND sal.timestamp > NOW() - time_window;
  
  -- Count error events
  SELECT COUNT(*) INTO error_events
  FROM security_audit_log sal
  WHERE sal.user_id = p_user_id
  AND sal.severity = 'error'
  AND sal.timestamp > NOW() - time_window;
  
  -- Count different IP addresses
  SELECT COUNT(DISTINCT sal.ip_address) INTO different_ips
  FROM security_audit_log sal
  WHERE sal.user_id = p_user_id
  AND sal.ip_address IS NOT NULL
  AND sal.timestamp > NOW() - time_window;
  
  result := jsonb_build_object(
    'user_id', p_user_id,
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
    VALUES (p_user_id, 'suspicious_activity_detected', result, 'error');
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 4: generate_backup_codes - resolve type casting and variable issues
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
  SET status = 'expired'::backup_code_status
  WHERE user_id = target_user_id AND status = 'active'::backup_code_status;
  
  -- Initialize backup codes array
  backup_codes := ARRAY[]::TEXT[];
  
  -- Generate new backup codes
  FOR i IN 1..codes_count LOOP
    -- Generate cryptographically secure random code
    -- Use proper casting and length calculation
    code := upper(encode(gen_random_bytes(GREATEST(4, code_length/2)), 'hex'));
    -- Truncate to desired length if needed
    IF length(code) > code_length THEN
      code := substring(code, 1, code_length);
    END IF;
    
    -- Add to return array
    backup_codes := array_append(backup_codes, code);
    
    -- Generate salt and hash for storage
    code_salt := gen_random_bytes(32);
    code_hash := encode(digest(code || encode(code_salt, 'hex'), 'sha256'), 'hex');
    
    -- Store hashed version with proper type casting
    INSERT INTO mfa_backup_codes (user_id, code_hash, code_salt, status)
    VALUES (target_user_id, code_hash, code_salt, 'active'::backup_code_status);
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

-- Fix 5: Update create_session function to use the corrected parameter name
CREATE OR REPLACE FUNCTION create_session(
  p_coach_id UUID,
  p_client_id UUID,
  p_title TEXT,
  p_scheduled_at TIMESTAMP WITH TIME ZONE,
  p_duration_minutes INTEGER DEFAULT 60,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_session_id UUID;
  coach_role user_role;
  client_role user_role;
BEGIN
  -- Validate user roles
  SELECT u.role INTO coach_role FROM users u WHERE u.id = p_coach_id;
  SELECT u.role INTO client_role FROM users u WHERE u.id = p_client_id;
  
  IF coach_role != 'coach' THEN
    RAISE EXCEPTION 'Coach ID must reference a user with coach role';
  END IF;
  
  IF client_role != 'client' THEN
    RAISE EXCEPTION 'Client ID must reference a user with client role';
  END IF;
  
  -- Check if time slot is available using the fixed function
  IF NOT is_time_slot_available(p_coach_id, p_scheduled_at, p_duration_minutes) THEN
    RAISE EXCEPTION 'Time slot is not available';
  END IF;
  
  -- Create the session
  INSERT INTO sessions (coach_id, client_id, title, description, scheduled_at, duration_minutes)
  VALUES (p_coach_id, p_client_id, p_title, p_description, p_scheduled_at, p_duration_minutes)
  RETURNING id INTO new_session_id;
  
  RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function grants with correct parameter signatures
GRANT EXECUTE ON FUNCTION is_time_slot_available(UUID, TIMESTAMP WITH TIME ZONE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_time_slots(UUID, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_suspicious_activity(UUID, INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_backup_codes(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_session(UUID, UUID, TEXT, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT) TO authenticated;

-- Add validation function for MFA enforcement
CREATE OR REPLACE FUNCTION validate_mfa_enforcement(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role user_role;
  is_enforced BOOLEAN;
  is_enabled BOOLEAN;
BEGIN
  -- Get user role and MFA status
  SELECT u.role INTO user_role FROM users u WHERE u.id = p_user_id;
  
  SELECT 
    COALESCE(ums.is_enforced, false),
    COALESCE(ums.is_enabled, false)
  INTO is_enforced, is_enabled
  FROM user_mfa_settings ums 
  WHERE ums.user_id = p_user_id;
  
  -- If MFA is enforced but not enabled, return false
  IF is_enforced AND NOT is_enabled THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_mfa_enforcement(UUID) TO authenticated;

-- Create a comprehensive security validation function
CREATE OR REPLACE FUNCTION validate_security_context(
  p_user_id UUID,
  p_action TEXT DEFAULT 'general_access'
)
RETURNS JSONB AS $$
DECLARE
  validation_result JSONB;
  mfa_valid BOOLEAN;
  suspicious_activity JSONB;
  user_exists BOOLEAN;
  user_active BOOLEAN;
BEGIN
  -- Check if user exists and is active
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE id = p_user_id AND status = 'active'
  ) INTO user_active;
  
  SELECT EXISTS(
    SELECT 1 FROM users WHERE id = p_user_id
  ) INTO user_exists;
  
  -- Check MFA enforcement
  mfa_valid := validate_mfa_enforcement(p_user_id);
  
  -- Check for suspicious activity
  suspicious_activity := check_suspicious_activity(p_user_id, INTERVAL '1 hour');
  
  -- Build comprehensive result
  validation_result := jsonb_build_object(
    'user_id', p_user_id,
    'action', p_action,
    'user_exists', user_exists,
    'user_active', user_active,
    'mfa_compliant', mfa_valid,
    'suspicious_activity', suspicious_activity,
    'validation_timestamp', NOW(),
    'is_valid', (user_exists AND user_active AND mfa_valid AND NOT (suspicious_activity->>'is_suspicious')::boolean)
  );
  
  -- Log validation attempt
  INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
  VALUES (p_user_id, 'security_context_validation', validation_result, 
          CASE 
            WHEN (validation_result->>'is_valid')::boolean THEN 'info'
            ELSE 'warning'
          END);
  
  RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_security_context(UUID, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION is_time_slot_available(UUID, TIMESTAMP WITH TIME ZONE, INTEGER) IS 
'Fixed: Resolves ambiguous column reference by using proper table aliases and parameter prefixes';

COMMENT ON FUNCTION get_available_time_slots(UUID, DATE, INTEGER) IS 
'Fixed: Resolves missing FROM-clause entry and ambiguous column references with proper parameter naming';

COMMENT ON FUNCTION check_suspicious_activity(UUID, INTERVAL) IS 
'Fixed: Resolves ambiguous column references by using table aliases and proper parameter naming';

COMMENT ON FUNCTION generate_backup_codes(UUID, INTEGER, INTEGER) IS 
'Fixed: Resolves type casting problems and variable scope issues with proper enum casting and array handling';

COMMENT ON FUNCTION validate_security_context(UUID, TEXT) IS 
'Security validation function that performs comprehensive checks including MFA compliance and suspicious activity detection';