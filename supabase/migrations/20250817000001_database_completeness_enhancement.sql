-- Database Completeness Enhancement Migration
-- Date: 2025-08-17
-- Purpose: Add any missing enums and minor enhancements to complete the comprehensive schema

-- Add missing enum value for session_status if not exists
DO $$
BEGIN
  BEGIN
    ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'no_show';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Add missing enum values for file_permission_type (already exists but ensuring completeness)
-- file_permission_type already has: 'view', 'download', 'edit'

-- Create additional indexes for optimal performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_sessions_coach_client ON sessions(coach_id, client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status_scheduled_at ON sessions(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_owner_session ON file_uploads(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action_time ON system_audit_logs(user_id, action, created_at);

-- Add composite index for better file management performance
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_category_created ON file_uploads(user_id, file_category, created_at DESC);

-- Add composite index for session file associations
CREATE INDEX IF NOT EXISTS idx_session_files_session_category ON session_files(session_id, file_category);

-- Add composite index for better notification analytics
CREATE INDEX IF NOT EXISTS idx_notifications_type_channel_created ON notifications(type, channel, created_at);

-- Add function to get comprehensive database stats (if not exists)
CREATE OR REPLACE FUNCTION get_database_statistics()
RETURNS TABLE(
    table_name TEXT,
    record_count BIGINT,
    table_size TEXT,
    index_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins + n_tup_upd as record_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to verify database integrity
CREATE OR REPLACE FUNCTION verify_database_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    
    -- Check for orphaned records
    SELECT 
        'Orphaned session files'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Found ' || COUNT(*) || ' orphaned session files'::TEXT
    FROM session_files sf
    LEFT JOIN sessions s ON sf.session_id = s.id
    WHERE s.id IS NULL
    
    UNION ALL
    
    -- Check notification preferences for all users
    SELECT 
        'Missing notification preferences'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::TEXT,
        'Found ' || COUNT(*) || ' users without notification preferences'::TEXT
    FROM users u
    LEFT JOIN notification_preferences np ON u.id = np.user_id
    WHERE np.user_id IS NULL
    
    UNION ALL
    
    -- Check for expired shares
    SELECT 
        'Expired file shares'::TEXT,
        'INFO'::TEXT,
        'Found ' || COUNT(*) || ' expired file shares that could be cleaned up'::TEXT
    FROM file_shares
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
    
    UNION ALL
    
    -- Check MFA setup consistency
    SELECT 
        'MFA consistency check'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::TEXT,
        'Found ' || COUNT(*) || ' users with mfa_enabled=true but no MFA configuration'::TEXT
    FROM users u
    LEFT JOIN user_mfa um ON u.id = um.user_id
    WHERE u.mfa_enabled = true AND (um.id IS NULL OR um.is_enabled = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comprehensive cleanup function for maintenance
CREATE OR REPLACE FUNCTION comprehensive_database_cleanup(
    dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE(
    cleanup_type TEXT,
    records_affected INTEGER,
    action_taken TEXT
) AS $$
DECLARE
    deleted_notifications INTEGER := 0;
    deleted_logs INTEGER := 0;
    deleted_attempts INTEGER := 0;
    deleted_typing INTEGER := 0;
    deleted_shares INTEGER := 0;
BEGIN
    IF dry_run THEN
        -- Just count what would be deleted
        RETURN QUERY
        SELECT 'Expired notifications'::TEXT, 
               (SELECT COUNT(*)::INTEGER FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()),
               'Would delete expired notifications'::TEXT
        UNION ALL
        SELECT 'Old audit logs'::TEXT,
               (SELECT COUNT(*)::INTEGER FROM system_audit_logs WHERE created_at < NOW() - INTERVAL '6 months'),
               'Would delete audit logs older than 6 months'::TEXT
        UNION ALL
        SELECT 'Old MFA attempts'::TEXT,
               (SELECT COUNT(*)::INTEGER FROM mfa_attempts WHERE created_at < NOW() - INTERVAL '30 days'),
               'Would delete MFA attempts older than 30 days'::TEXT
        UNION ALL
        SELECT 'Expired typing indicators'::TEXT,
               (SELECT COUNT(*)::INTEGER FROM typing_indicators WHERE expires_at < NOW()),
               'Would delete expired typing indicators'::TEXT
        UNION ALL
        SELECT 'Expired file shares'::TEXT,
               (SELECT COUNT(*)::INTEGER FROM file_shares WHERE expires_at IS NOT NULL AND expires_at < NOW()),
               'Would delete expired file shares'::TEXT;
    ELSE
        -- Actually perform cleanup
        
        -- Clean expired notifications
        DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW();
        GET DIAGNOSTICS deleted_notifications = ROW_COUNT;
        
        -- Clean old audit logs (keep 6 months)
        DELETE FROM system_audit_logs WHERE created_at < NOW() - INTERVAL '6 months';
        GET DIAGNOSTICS deleted_logs = ROW_COUNT;
        
        -- Clean old MFA attempts (keep 30 days)
        DELETE FROM mfa_attempts WHERE created_at < NOW() - INTERVAL '30 days';
        GET DIAGNOSTICS deleted_attempts = ROW_COUNT;
        
        -- Clean expired typing indicators
        DELETE FROM typing_indicators WHERE expires_at < NOW();
        GET DIAGNOSTICS deleted_typing = ROW_COUNT;
        
        -- Clean expired file shares
        DELETE FROM file_shares WHERE expires_at IS NOT NULL AND expires_at < NOW();
        GET DIAGNOSTICS deleted_shares = ROW_COUNT;
        
        RETURN QUERY
        SELECT 'Expired notifications'::TEXT, deleted_notifications, 'Deleted expired notifications'::TEXT
        UNION ALL
        SELECT 'Old audit logs'::TEXT, deleted_logs, 'Deleted old audit logs'::TEXT
        UNION ALL
        SELECT 'Old MFA attempts'::TEXT, deleted_attempts, 'Deleted old MFA attempts'::TEXT
        UNION ALL
        SELECT 'Expired typing indicators'::TEXT, deleted_typing, 'Deleted expired typing indicators'::TEXT
        UNION ALL
        SELECT 'Expired file shares'::TEXT, deleted_shares, 'Deleted expired file shares'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_database_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_database_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION comprehensive_database_cleanup(BOOLEAN) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_database_statistics() IS 'Provides comprehensive database table statistics including sizes';
COMMENT ON FUNCTION verify_database_integrity() IS 'Performs integrity checks across all database tables';
COMMENT ON FUNCTION comprehensive_database_cleanup(BOOLEAN) IS 'Comprehensive cleanup function with dry-run support';

-- Create a summary view of all tables for easy reference
CREATE OR REPLACE VIEW database_schema_summary AS
SELECT 
    table_schema,
    table_name,
    table_type,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = t.table_schema) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

COMMENT ON VIEW database_schema_summary IS 'Summary view of all database tables with basic metadata';
