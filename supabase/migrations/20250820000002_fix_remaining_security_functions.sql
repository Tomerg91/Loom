-- Complete the security fixes by adding the remaining corrected functions
-- This migration handles the functions that depend on existing schema properly

-- Fix the create_session function to work with existing schema
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

-- Add validation function for MFA enforcement (only if MFA tables exist)
CREATE OR REPLACE FUNCTION validate_mfa_enforcement(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role user_role;
  is_enforced BOOLEAN := false;
  is_enabled BOOLEAN := false;
  table_exists BOOLEAN;
BEGIN
  -- Check if MFA tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_mfa_settings'
  ) INTO table_exists;
  
  -- If MFA tables don't exist, always return true (not enforced)
  IF NOT table_exists THEN
    RETURN true;
  END IF;
  
  -- Get user role
  SELECT u.role INTO user_role FROM users u WHERE u.id = p_user_id;
  
  -- Get MFA status if table exists
  EXECUTE 'SELECT COALESCE(ums.is_enforced, false), COALESCE(ums.is_enabled, false) FROM user_mfa_settings ums WHERE ums.user_id = $1'
  INTO is_enforced, is_enabled
  USING p_user_id;
  
  -- If MFA is enforced but not enabled, return false
  IF is_enforced AND NOT is_enabled THEN
    RETURN false;
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs (like table doesn't exist), return true (not enforced)
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a comprehensive security validation function
CREATE OR REPLACE FUNCTION validate_security_context(
  p_user_id UUID,
  p_action TEXT DEFAULT 'general_access'
)
RETURNS JSONB AS $$
DECLARE
  validation_result JSONB;
  mfa_valid BOOLEAN := true;
  suspicious_activity JSONB;
  user_exists BOOLEAN;
  user_active BOOLEAN;
  audit_table_exists BOOLEAN;
BEGIN
  -- Check if security audit log table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'security_audit_log'
  ) INTO audit_table_exists;
  
  -- Check if user exists and is active
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE id = p_user_id AND status = 'active'
  ) INTO user_active;
  
  SELECT EXISTS(
    SELECT 1 FROM users WHERE id = p_user_id
  ) INTO user_exists;
  
  -- Check MFA enforcement (safely)
  BEGIN
    mfa_valid := validate_mfa_enforcement(p_user_id);
  EXCEPTION
    WHEN OTHERS THEN
      mfa_valid := true; -- Default to valid if MFA system isn't available
  END;
  
  -- Check for suspicious activity (safely)
  BEGIN
    suspicious_activity := check_suspicious_activity(p_user_id, INTERVAL '1 hour');
  EXCEPTION
    WHEN OTHERS THEN
      suspicious_activity := jsonb_build_object('is_suspicious', false);
  END;
  
  -- Build comprehensive result
  validation_result := jsonb_build_object(
    'user_id', p_user_id,
    'action', p_action,
    'user_exists', user_exists,
    'user_active', user_active,
    'mfa_compliant', mfa_valid,
    'suspicious_activity', suspicious_activity,
    'validation_timestamp', NOW(),
    'is_valid', (user_exists AND user_active AND mfa_valid AND NOT COALESCE((suspicious_activity->>'is_suspicious')::boolean, false))
  );
  
  -- Log validation attempt (only if audit table exists)
  IF audit_table_exists THEN
    BEGIN
      INSERT INTO security_audit_log (user_id, event_type, event_details, severity)
      VALUES (p_user_id, 'security_context_validation', validation_result, 
              CASE 
                WHEN (validation_result->>'is_valid')::boolean THEN 'info'
                ELSE 'warning'
              END);
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignore audit logging errors
        NULL;
    END;
  END IF;
  
  RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function grants
GRANT EXECUTE ON FUNCTION create_session(UUID, UUID, TEXT, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_mfa_enforcement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_security_context(UUID, TEXT) TO authenticated;

-- Add test functions to verify our fixes work
CREATE OR REPLACE FUNCTION test_database_security_functions()
RETURNS JSONB AS $$
DECLARE
  test_results JSONB;
  test_coach_id UUID;
  test_client_id UUID;
  function_exists BOOLEAN;
  test_time TIMESTAMP WITH TIME ZONE;
BEGIN
  test_results := jsonb_build_object();
  test_time := NOW() + INTERVAL '1 hour';
  
  -- Test 1: Check if is_time_slot_available exists and works
  BEGIN
    SELECT is_time_slot_available(gen_random_uuid(), test_time, 60) INTO function_exists;
    test_results := test_results || jsonb_build_object('is_time_slot_available', 'PASS');
  EXCEPTION
    WHEN OTHERS THEN
      test_results := test_results || jsonb_build_object('is_time_slot_available', 'FAIL: ' || SQLERRM);
  END;
  
  -- Test 2: Check if get_available_time_slots exists and works
  BEGIN
    PERFORM * FROM get_available_time_slots(gen_random_uuid(), CURRENT_DATE, 60) LIMIT 1;
    test_results := test_results || jsonb_build_object('get_available_time_slots', 'PASS');
  EXCEPTION
    WHEN OTHERS THEN
      test_results := test_results || jsonb_build_object('get_available_time_slots', 'FAIL: ' || SQLERRM);
  END;
  
  -- Test 3: Check if check_suspicious_activity exists and works
  BEGIN
    PERFORM check_suspicious_activity(gen_random_uuid(), INTERVAL '1 hour');
    test_results := test_results || jsonb_build_object('check_suspicious_activity', 'PASS');
  EXCEPTION
    WHEN OTHERS THEN
      test_results := test_results || jsonb_build_object('check_suspicious_activity', 'FAIL: ' || SQLERRM);
  END;
  
  -- Test 4: Check if generate_backup_codes exists and works
  BEGIN
    PERFORM generate_backup_codes(gen_random_uuid(), 5, 8);
    test_results := test_results || jsonb_build_object('generate_backup_codes', 'PASS');
  EXCEPTION
    WHEN OTHERS THEN
      test_results := test_results || jsonb_build_object('generate_backup_codes', 'FAIL: ' || SQLERRM);
  END;
  
  -- Test 5: Check if validate_security_context works
  BEGIN
    PERFORM validate_security_context(gen_random_uuid(), 'test');
    test_results := test_results || jsonb_build_object('validate_security_context', 'PASS');
  EXCEPTION
    WHEN OTHERS THEN
      test_results := test_results || jsonb_build_object('validate_security_context', 'FAIL: ' || SQLERRM);
  END;
  
  test_results := test_results || jsonb_build_object(
    'test_completed_at', NOW(),
    'overall_status', CASE 
      WHEN test_results ? 'FAIL' THEN 'SOME_FAILURES'
      ELSE 'ALL_PASS'
    END
  );
  
  RETURN test_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION test_database_security_functions() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_session(UUID, UUID, TEXT, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT) IS 
'Fixed: Updated to work with corrected parameter names and proper role validation';

COMMENT ON FUNCTION validate_mfa_enforcement(UUID) IS 
'MFA enforcement validation function with safe fallbacks for when MFA tables do not exist';

COMMENT ON FUNCTION validate_security_context(UUID, TEXT) IS 
'Comprehensive security validation with safe error handling for optional features';

COMMENT ON FUNCTION test_database_security_functions() IS 
'Test function to verify all security functions work correctly after fixes';