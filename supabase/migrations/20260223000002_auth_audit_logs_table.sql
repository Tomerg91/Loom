-- Migration: Auth Audit Logs Table
-- Description: Creates table for tracking authentication and session-related audit events
-- Date: 2026-02-23

-- Create auth_audit_logs table
CREATE TABLE IF NOT EXISTS public.auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  device_id TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Add indexes for common query patterns
  CONSTRAINT auth_audit_logs_event_type_check CHECK (event_type IN (
    'session_refresh_started',
    'session_refresh_success',
    'session_refresh_failed',
    'session_refresh_retry',
    'forced_signout',
    'auth_token_expired',
    'auth_token_refresh_retry',
    'auth_circuit_breaker_opened',
    'auth_circuit_breaker_closed',
    'supabase_client_initialized',
    'supabase_validation_failed'
  ))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON public.auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type ON public.auth_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created_at ON public.auth_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_success ON public.auth_audit_logs(success) WHERE success = false;
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_ip_address ON public.auth_audit_logs(ip_address);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_created ON public.auth_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_created ON public.auth_audit_logs(event_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admin users can view all audit logs
CREATE POLICY "Admins can view all auth audit logs"
  ON public.auth_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can view their own audit logs
CREATE POLICY "Users can view own auth audit logs"
  ON public.auth_audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only the system (service_role) can insert audit logs
-- No INSERT policy for authenticated users - logs are inserted via service_role only

-- Grant permissions
GRANT SELECT ON public.auth_audit_logs TO authenticated;
GRANT ALL ON public.auth_audit_logs TO service_role;

-- Add helpful comments
COMMENT ON TABLE public.auth_audit_logs IS 'Audit log for authentication and session-related events';
COMMENT ON COLUMN public.auth_audit_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN public.auth_audit_logs.user_id IS 'User associated with the event (nullable for system-level events)';
COMMENT ON COLUMN public.auth_audit_logs.event_type IS 'Type of authentication/session event';
COMMENT ON COLUMN public.auth_audit_logs.event_data IS 'Additional event-specific data stored as JSON';
COMMENT ON COLUMN public.auth_audit_logs.ip_address IS 'IP address from which the event originated';
COMMENT ON COLUMN public.auth_audit_logs.user_agent IS 'User agent string from the request';
COMMENT ON COLUMN public.auth_audit_logs.device_id IS 'Device identifier if available';
COMMENT ON COLUMN public.auth_audit_logs.success IS 'Whether the event completed successfully';
COMMENT ON COLUMN public.auth_audit_logs.error_message IS 'Error message if the event failed';
COMMENT ON COLUMN public.auth_audit_logs.created_at IS 'Timestamp when the event occurred';

-- Create helper function to clean up old audit logs (optional retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_old_auth_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete audit logs older than retention period
  DELETE FROM public.auth_audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_auth_audit_logs IS 'Removes auth audit logs older than the specified retention period (default 90 days)';

-- Create function to get recent auth events for a user
CREATE OR REPLACE FUNCTION public.get_user_auth_events(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if requester is admin or the user themselves
  IF NOT (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin') OR
    auth.uid() = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.event_type,
    a.event_data,
    a.ip_address,
    a.user_agent,
    a.success,
    a.error_message,
    a.created_at
  FROM public.auth_audit_logs a
  WHERE a.user_id = p_user_id
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_user_auth_events IS 'Retrieves auth audit events for a specific user (admin or self only)';

-- Create function to get auth event statistics
CREATE OR REPLACE FUNCTION public.get_auth_event_stats(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  event_type TEXT,
  total_count BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  unique_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if requester is admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    a.event_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE a.success = true) as success_count,
    COUNT(*) FILTER (WHERE a.success = false) as failure_count,
    COUNT(DISTINCT a.user_id) as unique_users
  FROM public.auth_audit_logs a
  WHERE a.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY a.event_type
  ORDER BY total_count DESC;
END;
$$;

COMMENT ON FUNCTION public.get_auth_event_stats IS 'Gets statistics for auth events within specified time window (admin only)';
