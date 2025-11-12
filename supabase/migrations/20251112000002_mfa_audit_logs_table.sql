-- Migration: MFA Audit Logs Table
-- Description: Comprehensive audit logging for all MFA-related events
-- Created: 2025-11-12

-- Create MFA audit logs table
CREATE TABLE IF NOT EXISTS public.mfa_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    device_id TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT mfa_audit_logs_event_type_check CHECK (
        event_type IN (
            'mfa_setup_started',
            'mfa_setup_completed',
            'mfa_setup_failed',
            'mfa_setup_cancelled',
            'mfa_verification_started',
            'mfa_verification_success',
            'mfa_verification_failed',
            'mfa_verification_blocked',
            'mfa_backup_code_used',
            'mfa_backup_code_regenerated',
            'mfa_device_trusted',
            'mfa_device_untrusted',
            'mfa_disabled',
            'mfa_method_changed',
            'mfa_recovery_initiated',
            'mfa_rate_limit_hit'
        )
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mfa_audit_logs_user_id
    ON public.mfa_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_logs_event_type
    ON public.mfa_audit_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_logs_created_at
    ON public.mfa_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_logs_success
    ON public.mfa_audit_logs(success)
    WHERE success = false;

CREATE INDEX IF NOT EXISTS idx_mfa_audit_logs_user_created
    ON public.mfa_audit_logs(user_id, created_at DESC);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_mfa_audit_logs_user_event_created
    ON public.mfa_audit_logs(user_id, event_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.mfa_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own audit logs
CREATE POLICY "Users can view their own MFA audit logs"
    ON public.mfa_audit_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert audit logs
CREATE POLICY "Service role can insert MFA audit logs"
    ON public.mfa_audit_logs
    FOR INSERT
    WITH CHECK (true);

-- RLS Policy: Service role can view all audit logs
CREATE POLICY "Service role can view all MFA audit logs"
    ON public.mfa_audit_logs
    FOR SELECT
    USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policy: Admins can view all audit logs
CREATE POLICY "Admins can view all MFA audit logs"
    ON public.mfa_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Create function to get MFA audit log summary for a user
CREATE OR REPLACE FUNCTION public.get_mfa_audit_summary(
    target_user_id UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    event_type TEXT,
    total_count BIGINT,
    success_count BIGINT,
    failure_count BIGINT,
    last_occurrence TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Security check: Only allow users to view their own summary or admins
    IF auth.uid() != target_user_id AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized access to MFA audit logs';
    END IF;

    RETURN QUERY
    SELECT
        mal.event_type,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE mal.success = true) as success_count,
        COUNT(*) FILTER (WHERE mal.success = false) as failure_count,
        MAX(mal.created_at) as last_occurrence
    FROM public.mfa_audit_logs mal
    WHERE mal.user_id = target_user_id
        AND mal.created_at >= (now() - (days_back || ' days')::interval)
    GROUP BY mal.event_type
    ORDER BY last_occurrence DESC;
END;
$$;

-- Create function to detect suspicious MFA activity
CREATE OR REPLACE FUNCTION public.detect_suspicious_mfa_activity(
    target_user_id UUID,
    time_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    alert_type TEXT,
    alert_severity TEXT,
    event_count BIGINT,
    first_occurrence TIMESTAMPTZ,
    last_occurrence TIMESTAMPTZ,
    details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    threshold_failed_verifications INTEGER := 5;
    threshold_different_ips INTEGER := 3;
BEGIN
    -- Security check
    IF auth.uid() != target_user_id AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized access to MFA audit logs';
    END IF;

    -- Check for excessive failed verification attempts
    RETURN QUERY
    SELECT
        'excessive_failed_verifications'::TEXT as alert_type,
        'high'::TEXT as alert_severity,
        COUNT(*) as event_count,
        MIN(mal.created_at) as first_occurrence,
        MAX(mal.created_at) as last_occurrence,
        jsonb_build_object(
            'threshold', threshold_failed_verifications,
            'unique_ips', COUNT(DISTINCT mal.ip_address),
            'event_type', 'mfa_verification_failed'
        ) as details
    FROM public.mfa_audit_logs mal
    WHERE mal.user_id = target_user_id
        AND mal.event_type = 'mfa_verification_failed'
        AND mal.created_at >= (now() - (time_window_minutes || ' minutes')::interval)
    HAVING COUNT(*) >= threshold_failed_verifications;

    -- Check for multiple IPs attempting verification
    RETURN QUERY
    SELECT
        'multiple_ip_addresses'::TEXT as alert_type,
        'medium'::TEXT as alert_severity,
        COUNT(*) as event_count,
        MIN(mal.created_at) as first_occurrence,
        MAX(mal.created_at) as last_occurrence,
        jsonb_build_object(
            'threshold', threshold_different_ips,
            'unique_ips', COUNT(DISTINCT mal.ip_address),
            'ip_addresses', jsonb_agg(DISTINCT mal.ip_address)
        ) as details
    FROM public.mfa_audit_logs mal
    WHERE mal.user_id = target_user_id
        AND mal.event_type IN ('mfa_verification_started', 'mfa_verification_failed')
        AND mal.created_at >= (now() - (time_window_minutes || ' minutes')::interval)
    HAVING COUNT(DISTINCT mal.ip_address) >= threshold_different_ips;

    -- Check for rate limit hits
    RETURN QUERY
    SELECT
        'rate_limit_triggered'::TEXT as alert_type,
        'medium'::TEXT as alert_severity,
        COUNT(*) as event_count,
        MIN(mal.created_at) as first_occurrence,
        MAX(mal.created_at) as last_occurrence,
        jsonb_build_object(
            'event_type', 'mfa_rate_limit_hit',
            'unique_ips', COUNT(DISTINCT mal.ip_address)
        ) as details
    FROM public.mfa_audit_logs mal
    WHERE mal.user_id = target_user_id
        AND mal.event_type = 'mfa_rate_limit_hit'
        AND mal.created_at >= (now() - (time_window_minutes || ' minutes')::interval)
    HAVING COUNT(*) > 0;
END;
$$;

-- Create function to clean up old audit logs (optional, for data retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_mfa_audit_logs(
    retention_days INTEGER DEFAULT 365
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Only allow service role to run cleanup
    IF auth.jwt()->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Only service role can cleanup audit logs';
    END IF;

    DELETE FROM public.mfa_audit_logs
    WHERE created_at < (now() - (retention_days || ' days')::interval);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- Grant appropriate permissions
GRANT SELECT ON public.mfa_audit_logs TO authenticated;
GRANT INSERT ON public.mfa_audit_logs TO service_role;
GRANT ALL ON public.mfa_audit_logs TO postgres;

-- Add helpful comment
COMMENT ON TABLE public.mfa_audit_logs IS 'Comprehensive audit trail for all MFA-related events including setup, verification, and security events';
COMMENT ON FUNCTION public.get_mfa_audit_summary IS 'Returns summary statistics of MFA events for a user over a specified time period';
COMMENT ON FUNCTION public.detect_suspicious_mfa_activity IS 'Analyzes recent MFA activity to detect potential security threats';
COMMENT ON FUNCTION public.cleanup_old_mfa_audit_logs IS 'Removes audit logs older than the specified retention period';
