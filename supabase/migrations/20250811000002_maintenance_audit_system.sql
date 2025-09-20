-- Create maintenance audit system tables
-- This migration creates tables for tracking system maintenance operations and audit logs

-- Create enum types for maintenance operations
CREATE TYPE maintenance_action_type AS ENUM (
    'backup_database',
    'database_health_check',
    'clear_cache',
    'get_cache_stats',
    'export_logs',
    'cleanup_logs',
    'clean_temp_files',
    'system_cleanup',
    'update_configuration',
    'restart_services'
);

CREATE TYPE maintenance_status AS ENUM (
    'started',
    'in_progress',
    'completed',
    'failed',
    'partial',
    'cancelled',
    'timeout'
);

CREATE TYPE audit_action_type AS ENUM (
    'login',
    'logout',
    'view_data',
    'create_record',
    'update_record',
    'delete_record',
    'export_data',
    'import_data',
    'maintenance_action',
    'security_event',
    'system_configuration'
);

-- Maintenance operations log table
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action maintenance_action_type NOT NULL,
    status maintenance_status NOT NULL DEFAULT 'started',
    initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    initiated_by_email TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    parameters JSONB,
    result JSONB,
    error_message TEXT,
    error_details JSONB,
    system_info JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System audit log table
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action audit_action_type NOT NULL,
    resource TEXT,
    resource_id TEXT,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    session_id TEXT,
    metadata JSONB,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System health check results table
CREATE TABLE IF NOT EXISTS system_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'error', 'unknown')),
    metrics JSONB,
    response_time_ms INTEGER,
    error_message TEXT,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Database backup tracking table
CREATE TABLE IF NOT EXISTS database_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential')),
    file_path TEXT,
    file_size_bytes BIGINT,
    compression_type TEXT,
    include_blobs BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
    initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    checksum TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_action ON maintenance_logs(action);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_status ON maintenance_logs(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_started_at ON maintenance_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_initiated_by ON maintenance_logs(initiated_by);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON system_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON system_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON system_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON system_audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON system_audit_logs(risk_level);

CREATE INDEX IF NOT EXISTS idx_health_checks_check_type ON system_health_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON system_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_created_at ON system_health_checks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backups_status ON database_backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_started_at ON database_backups(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_backup_type ON database_backups(backup_type);

-- Create updated_at trigger for maintenance_logs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_maintenance_logs_updated_at
    BEFORE UPDATE ON maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_backups ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Admin can view all maintenance logs" ON maintenance_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role = 'admin'
        )
    );

CREATE POLICY "Admin can insert maintenance logs" ON maintenance_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role = 'admin'
        )
    );

CREATE POLICY "Admin can update maintenance logs" ON maintenance_logs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role = 'admin'
        )
    );

-- Audit logs - read-only for admins
CREATE POLICY "Admin can view audit logs" ON system_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role = 'admin'
        )
    );

CREATE POLICY "System can insert audit logs" ON system_audit_logs
    FOR INSERT WITH CHECK (true); -- System service can always insert audit logs

-- Health checks - admin only
CREATE POLICY "Admin can manage health checks" ON system_health_checks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role = 'admin'
        )
    );

-- Database backups - admin only
CREATE POLICY "Admin can manage backups" ON database_backups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.role = 'admin'
        )
    );

-- Helper functions for maintenance operations
CREATE OR REPLACE FUNCTION log_maintenance_action(
    p_action maintenance_action_type,
    p_status maintenance_status,
    p_initiated_by UUID DEFAULT NULL,
    p_parameters JSONB DEFAULT NULL,
    p_result JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
    user_email TEXT;
BEGIN
    -- Get user email if user_id is provided
    IF p_initiated_by IS NOT NULL THEN
        SELECT email INTO user_email FROM auth.users WHERE id = p_initiated_by;
    END IF;

    INSERT INTO maintenance_logs (
        action,
        status,
        initiated_by,
        initiated_by_email,
        parameters,
        result,
        error_message,
        completed_at,
        duration_ms
    ) VALUES (
        p_action,
        p_status,
        p_initiated_by,
        user_email,
        p_parameters,
        p_result,
        p_error_message,
        CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE NULL END,
        CASE WHEN p_status IN ('completed', 'failed', 'cancelled') 
             THEN EXTRACT(EPOCH FROM (NOW() - (SELECT started_at FROM maintenance_logs WHERE id = log_id LIMIT 1))) * 1000 
             ELSE NULL END
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action audit_action_type,
    p_resource TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_risk_level TEXT DEFAULT 'low',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
    user_email TEXT;
BEGIN
    -- Get user email if user_id is provided
    IF p_user_id IS NOT NULL THEN
        SELECT email INTO user_email FROM auth.users WHERE id = p_user_id;
    END IF;

    INSERT INTO system_audit_logs (
        user_id,
        user_email,
        action,
        resource,
        resource_id,
        description,
        metadata,
        risk_level,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        user_email,
        p_action,
        p_resource,
        p_resource_id,
        p_description,
        p_metadata,
        p_risk_level,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent maintenance operations
CREATE OR REPLACE FUNCTION get_recent_maintenance_operations(
    p_limit INTEGER DEFAULT 50,
    p_action maintenance_action_type DEFAULT NULL,
    p_status maintenance_status DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    action maintenance_action_type,
    status maintenance_status,
    initiated_by_email TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    result JSONB,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ml.id,
        ml.action,
        ml.status,
        ml.initiated_by_email,
        ml.started_at,
        ml.completed_at,
        ml.duration_ms,
        ml.result,
        ml.error_message
    FROM maintenance_logs ml
    WHERE 
        (p_action IS NULL OR ml.action = p_action) AND
        (p_status IS NULL OR ml.status = p_status)
    ORDER BY ml.started_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get system health statistics
CREATE OR REPLACE FUNCTION get_system_health_stats(
    p_hours INTEGER DEFAULT 24
) RETURNS TABLE (
    check_type TEXT,
    healthy_count INTEGER,
    warning_count INTEGER,
    error_count INTEGER,
    avg_response_time_ms NUMERIC,
    last_check_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        shc.check_type,
        COUNT(CASE WHEN shc.status = 'healthy' THEN 1 END)::INTEGER as healthy_count,
        COUNT(CASE WHEN shc.status = 'warning' THEN 1 END)::INTEGER as warning_count,
        COUNT(CASE WHEN shc.status = 'error' THEN 1 END)::INTEGER as error_count,
        AVG(shc.response_time_ms) as avg_response_time_ms,
        MAX(shc.created_at) as last_check_at
    FROM system_health_checks shc
    WHERE shc.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY shc.check_type
    ORDER BY last_check_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_logs(
    p_days INTEGER DEFAULT 90,
    p_dry_run BOOLEAN DEFAULT true
) RETURNS TABLE (
    table_name TEXT,
    records_to_delete INTEGER,
    oldest_record TIMESTAMPTZ,
    newest_record TIMESTAMPTZ
) AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    audit_count INTEGER;
    maintenance_count INTEGER;
    health_count INTEGER;
BEGIN
    cutoff_date := NOW() - (p_days || ' days')::INTERVAL;
    
    -- Count records to be deleted
    SELECT COUNT(*) INTO audit_count 
    FROM system_audit_logs 
    WHERE created_at < cutoff_date;
    
    SELECT COUNT(*) INTO maintenance_count 
    FROM maintenance_logs 
    WHERE created_at < cutoff_date;
    
    SELECT COUNT(*) INTO health_count 
    FROM system_health_checks 
    WHERE created_at < cutoff_date;
    
    -- Return summary
    RETURN QUERY VALUES
        ('system_audit_logs', audit_count, 
         (SELECT MIN(created_at) FROM system_audit_logs WHERE created_at < cutoff_date),
         (SELECT MAX(created_at) FROM system_audit_logs WHERE created_at < cutoff_date)),
        ('maintenance_logs', maintenance_count,
         (SELECT MIN(created_at) FROM maintenance_logs WHERE created_at < cutoff_date),
         (SELECT MAX(created_at) FROM maintenance_logs WHERE created_at < cutoff_date)),
        ('system_health_checks', health_count,
         (SELECT MIN(created_at) FROM system_health_checks WHERE created_at < cutoff_date),
         (SELECT MAX(created_at) FROM system_health_checks WHERE created_at < cutoff_date));
    
    -- Perform actual deletion if not dry run
    IF NOT p_dry_run THEN
        DELETE FROM system_audit_logs WHERE created_at < cutoff_date;
        DELETE FROM maintenance_logs WHERE created_at < cutoff_date;
        DELETE FROM system_health_checks WHERE created_at < cutoff_date;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON maintenance_logs TO authenticated;
GRANT SELECT, INSERT ON system_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON system_health_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON database_backups TO authenticated;

-- Grant execute permissions on functions (handle overloads safely)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN 
    SELECT p.proname, oidvectortypes(p.proargtypes) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'log_maintenance_action',
        'log_audit_event',
        'get_recent_maintenance_operations',
        'get_system_health_stats',
        'cleanup_old_logs'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
  END LOOP;
END
$$;

-- Comment on tables and functions
COMMENT ON TABLE maintenance_logs IS 'Tracks all maintenance operations performed on the system';
COMMENT ON TABLE system_audit_logs IS 'Comprehensive audit trail for all system activities';
COMMENT ON TABLE system_health_checks IS 'Records of system health check results';
COMMENT ON TABLE database_backups IS 'Tracking information for database backup operations';

COMMENT ON FUNCTION log_maintenance_action IS 'Helper function to log maintenance operations with proper user tracking';
COMMENT ON FUNCTION log_audit_event(UUID, audit_action_type, TEXT, TEXT, TEXT, JSONB, TEXT, INET, TEXT) IS 'Helper function to log audit events with metadata';
COMMENT ON FUNCTION get_recent_maintenance_operations IS 'Retrieves recent maintenance operations with optional filtering';
COMMENT ON FUNCTION get_system_health_stats IS 'Provides aggregated system health statistics';
COMMENT ON FUNCTION cleanup_old_logs IS 'Utility function to cleanup old log entries (supports dry-run mode)';
