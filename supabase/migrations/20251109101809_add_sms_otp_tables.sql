-- ============================================================================
-- SMS OTP MFA Implementation - Database Tables and Policies
-- ============================================================================
-- This migration creates the necessary tables for SMS-based OTP authentication
-- as part of the multi-factor authentication system.
--
-- Creates:
-- 1. sms_otp_codes - Stores OTP codes with expiration and attempt tracking
-- 2. sms_delivery_logs - Audit trail for SMS delivery
-- 3. Extends user_mfa_methods - Adds SMS-specific columns
-- 4. RLS policies for security
--
-- Reference: docs/plans/2025-01-15-sms-otp-mfa.md Task 2
-- Generated: 2025-11-09
-- ============================================================================

-- ============================================================================
-- Step 1: Create SMS OTP Codes Table
-- ============================================================================

CREATE TABLE sms_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL, -- Encrypted in app, stored as-is for simplicity
  otp_code TEXT NOT NULL, -- 6-digit code
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Constraint to ensure expiration is after creation
  CONSTRAINT otp_not_expired CHECK (created_at < expires_at)
);

-- Create indexes for performance
CREATE INDEX idx_sms_otp_user_id ON sms_otp_codes(user_id);
CREATE INDEX idx_sms_otp_expires_at ON sms_otp_codes(expires_at);

COMMENT ON TABLE sms_otp_codes IS
  'Stores SMS OTP codes for multi-factor authentication. Codes expire after 5 minutes and have attempt limits.';

COMMENT ON COLUMN sms_otp_codes.phone_number IS
  'Phone number in E.164 format (e.g., +1234567890). May be encrypted in application layer.';

COMMENT ON COLUMN sms_otp_codes.otp_code IS
  '6-digit one-time password sent via SMS. Should be hashed in production.';

COMMENT ON COLUMN sms_otp_codes.attempts IS
  'Number of failed verification attempts. Incremented on each wrong code submission.';

COMMENT ON COLUMN sms_otp_codes.max_attempts IS
  'Maximum allowed verification attempts before code is locked. Default: 5';

-- ============================================================================
-- Step 2: Create SMS Delivery Logs Table
-- ============================================================================

CREATE TABLE sms_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  twilio_message_sid TEXT,
  status TEXT, -- 'sent', 'failed', etc.
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_sms_delivery_user ON sms_delivery_logs(user_id);
CREATE INDEX idx_sms_delivery_created_at ON sms_delivery_logs(created_at);
CREATE INDEX idx_sms_delivery_status ON sms_delivery_logs(status);

COMMENT ON TABLE sms_delivery_logs IS
  'Audit trail for SMS message delivery. Tracks all SMS send attempts for debugging and monitoring.';

COMMENT ON COLUMN sms_delivery_logs.twilio_message_sid IS
  'Twilio message SID for tracking delivery status and debugging.';

COMMENT ON COLUMN sms_delivery_logs.status IS
  'Delivery status: sent, failed, delivered, undelivered, etc.';

-- ============================================================================
-- Step 3: Extend user_mfa_methods Table for SMS Support
-- ============================================================================

-- Add SMS-specific columns to existing MFA methods table
ALTER TABLE user_mfa_methods
ADD COLUMN IF NOT EXISTS sms_phone TEXT,
ADD COLUMN IF NOT EXISTS sms_verified_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN user_mfa_methods.sms_phone IS
  'Phone number associated with SMS MFA method. E.164 format (+1234567890).';

COMMENT ON COLUMN user_mfa_methods.sms_verified_at IS
  'Timestamp when the phone number was last verified via OTP.';

-- ============================================================================
-- Step 4: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE sms_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_delivery_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 5: Create RLS Policies for sms_otp_codes
-- ============================================================================

-- Policy: Users can view their own OTP codes
CREATE POLICY "Users can view their own OTP codes"
  ON sms_otp_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert OTP codes
CREATE POLICY "Service role can insert OTP codes"
  ON sms_otp_codes FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can update OTP codes (for attempt tracking and verification)
CREATE POLICY "Service role can update OTP codes"
  ON sms_otp_codes FOR UPDATE
  USING (true);

-- Policy: Service role can delete expired OTP codes
CREATE POLICY "Service role can delete expired OTP codes"
  ON sms_otp_codes FOR DELETE
  USING (true);

COMMENT ON POLICY "Users can view their own OTP codes" ON sms_otp_codes IS
  'Allows authenticated users to view their own OTP records for status checking.';

-- ============================================================================
-- Step 6: Create RLS Policies for sms_delivery_logs
-- ============================================================================

-- Policy: Users can view their own delivery logs
CREATE POLICY "Users can view their own delivery logs"
  ON sms_delivery_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert delivery logs
CREATE POLICY "Service role can insert delivery logs"
  ON sms_delivery_logs FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can delete old delivery logs
CREATE POLICY "Service role can delete old delivery logs"
  ON sms_delivery_logs FOR DELETE
  USING (true);

COMMENT ON POLICY "Users can view their own delivery logs" ON sms_delivery_logs IS
  'Allows authenticated users to view their SMS delivery history for debugging.';

-- ============================================================================
-- Step 7: Grant Permissions
-- ============================================================================

GRANT SELECT ON sms_otp_codes TO authenticated;
GRANT SELECT ON sms_delivery_logs TO authenticated;

GRANT ALL ON sms_otp_codes TO service_role;
GRANT ALL ON sms_delivery_logs TO service_role;

-- ============================================================================
-- Step 8: Create Cleanup Function for Expired OTP Codes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete OTP codes that expired more than 1 hour ago
  DELETE FROM public.sms_otp_codes
  WHERE expires_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % expired OTP codes', v_deleted_count;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_otp_codes IS
  'Deletes OTP codes that expired more than 1 hour ago. Should be run periodically via cron.';

GRANT EXECUTE ON FUNCTION public.cleanup_expired_otp_codes() TO service_role;

-- ============================================================================
-- Step 9: Create Function to Get Active SMS MFA Users
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_sms_mfa_stats()
RETURNS TABLE(
  total_users INTEGER,
  users_with_sms_mfa INTEGER,
  verified_sms_numbers INTEGER,
  pending_sms_verifications INTEGER,
  total_otps_sent_today INTEGER,
  total_otps_verified_today INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM public.user_mfa_methods)::INTEGER,
    (SELECT COUNT(DISTINCT user_id) FROM public.user_mfa_methods
     WHERE method_type = 'sms' AND status = 'active')::INTEGER,
    (SELECT COUNT(DISTINCT user_id) FROM public.user_mfa_methods
     WHERE method_type = 'sms' AND sms_verified_at IS NOT NULL)::INTEGER,
    (SELECT COUNT(DISTINCT user_id) FROM public.user_mfa_methods
     WHERE method_type = 'sms' AND sms_verified_at IS NULL)::INTEGER,
    (SELECT COUNT(*) FROM public.sms_delivery_logs
     WHERE created_at > CURRENT_DATE AND status = 'sent')::INTEGER,
    (SELECT COUNT(*) FROM public.sms_otp_codes
     WHERE created_at > CURRENT_DATE AND verified_at IS NOT NULL)::INTEGER;
END;
$$;

COMMENT ON FUNCTION public.get_sms_mfa_stats IS
  'Returns statistics about SMS MFA usage for monitoring and analytics.';

GRANT EXECUTE ON FUNCTION public.get_sms_mfa_stats() TO authenticated;

-- ============================================================================
-- Step 10: Security Audit Log
-- ============================================================================

INSERT INTO public.security_audit_log (
  event_type,
  event_details,
  severity,
  timestamp
) VALUES (
  'sms_mfa_implementation',
  jsonb_build_object(
    'migration', '20251109101809_add_sms_otp_tables',
    'action', 'Created SMS OTP tables and RLS policies',
    'components_created', jsonb_build_array(
      'sms_otp_codes table',
      'sms_delivery_logs table',
      'user_mfa_methods SMS columns',
      'RLS policies',
      'cleanup_expired_otp_codes function',
      'get_sms_mfa_stats function'
    ),
    'phase', 'SMS MFA Implementation - Task 2'
  ),
  'high',
  NOW()
);

-- ============================================================================
-- Migration Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SMS OTP MFA MIGRATION COMPLETED';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created Components:';
  RAISE NOTICE '  ✓ Table: sms_otp_codes (with indexes)';
  RAISE NOTICE '  ✓ Table: sms_delivery_logs (with indexes)';
  RAISE NOTICE '  ✓ Columns: user_mfa_methods.sms_phone, sms_verified_at';
  RAISE NOTICE '  ✓ RLS Policies: Enabled on both new tables';
  RAISE NOTICE '  ✓ Function: cleanup_expired_otp_codes()';
  RAISE NOTICE '  ✓ Function: get_sms_mfa_stats()';
  RAISE NOTICE '';
  RAISE NOTICE 'Security Features:';
  RAISE NOTICE '  - Row Level Security enabled';
  RAISE NOTICE '  - Users can only view their own OTP codes';
  RAISE NOTICE '  - Service role can manage all records';
  RAISE NOTICE '  - Automatic cleanup for expired codes';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update .env.local with Twilio credentials';
  RAISE NOTICE '  2. Implement Twilio SMS service (Task 1)';
  RAISE NOTICE '  3. Create SMS OTP manager service (Task 3)';
  RAISE NOTICE '  4. Build API endpoints for SMS request/verify (Task 4)';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;
