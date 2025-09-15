-- Fix Function Search Path Security Issues
-- This migration addresses 120+ function security warnings by setting explicit search_path

-- SECURITY: All functions will be altered to use a secure, immutable search_path
-- This prevents search path injection attacks and ensures consistent schema resolution

-- ============================================================================
-- PART 1: Core System Functions
-- ============================================================================

-- Basic utility functions
ALTER FUNCTION update_updated_at_column() SET search_path = '';
ALTER FUNCTION handle_new_user() SET search_path = '';
ALTER FUNCTION update_user_last_seen() SET search_path = '';
ALTER FUNCTION db_health_check() SET search_path = '';

-- Validation and access control functions  
ALTER FUNCTION validate_session_access() SET search_path = '';
ALTER FUNCTION validate_user_access() SET search_path = '';
ALTER FUNCTION validate_user_role() SET search_path = '';
ALTER FUNCTION check_suspicious_activity() SET search_path = '';
ALTER FUNCTION is_admin() SET search_path = '';
ALTER FUNCTION is_coach() SET search_path = '';
ALTER FUNCTION is_client() SET search_path = '';
ALTER FUNCTION get_user_role() SET search_path = '';

-- ============================================================================
-- PART 2: Authentication & MFA Functions
-- ============================================================================

-- MFA enforcement and rate limiting
ALTER FUNCTION check_mfa_enforcement() SET search_path = '';
ALTER FUNCTION check_mfa_rate_limit(UUID, INET, INTERVAL, INTEGER) SET search_path = '';
ALTER FUNCTION check_mfa_rate_limit(UUID, INET) SET search_path = '';
ALTER FUNCTION log_mfa_event(UUID, mfa_event_type, INET, TEXT, JSONB) SET search_path = '';
ALTER FUNCTION get_user_mfa_status() SET search_path = '';

-- MFA session and device management
ALTER FUNCTION cleanup_expired_mfa_sessions() SET search_path = '';
ALTER FUNCTION use_backup_code(UUID, TEXT) SET search_path = '';
ALTER FUNCTION generate_backup_codes(UUID, INTEGER) SET search_path = '';
ALTER FUNCTION generate_backup_codes(INTEGER) SET search_path = '';
ALTER FUNCTION verify_backup_code() SET search_path = '';

-- TOTP encryption/decryption
ALTER FUNCTION encrypt_totp_secret() SET search_path = '';
ALTER FUNCTION decrypt_totp_secret() SET search_path = '';

-- ============================================================================
-- PART 3: Notification System Functions
-- ============================================================================

-- Core notification functions
ALTER FUNCTION send_notification(UUID, TEXT, TEXT, JSONB) SET search_path = '';
ALTER FUNCTION send_notification(UUID, TEXT, TEXT) SET search_path = '';
ALTER FUNCTION get_unread_notification_count() SET search_path = '';
ALTER FUNCTION mark_notification_read() SET search_path = '';
ALTER FUNCTION mark_all_notifications_read() SET search_path = '';
ALTER FUNCTION mark_notifications_read() SET search_path = '';
ALTER FUNCTION cleanup_old_notifications() SET search_path = '';
ALTER FUNCTION can_send_notification() SET search_path = '';
ALTER FUNCTION create_notification_from_template() SET search_path = '';

-- Push notification functions
ALTER FUNCTION send_push_notification() SET search_path = '';
ALTER FUNCTION update_push_subscription_status() SET search_path = '';
ALTER FUNCTION log_push_delivery_status() SET search_path = '';
ALTER FUNCTION cleanup_old_push_subscriptions() SET search_path = '';

-- Notification scheduling
ALTER FUNCTION schedule_session_reminders() SET search_path = '';
ALTER FUNCTION cancel_scheduled_notifications() SET search_path = '';
ALTER FUNCTION process_notification_jobs() SET search_path = '';
ALTER FUNCTION cleanup_notification_system() SET search_path = '';

-- ============================================================================
-- PART 4: Session Management Functions
-- ============================================================================

-- Session operations
ALTER FUNCTION get_upcoming_sessions(UUID) SET search_path = '';
ALTER FUNCTION create_session() SET search_path = '';
ALTER FUNCTION is_time_slot_available(UUID, TIMESTAMP WITH TIME ZONE, INTEGER) SET search_path = '';
ALTER FUNCTION get_available_time_slots(UUID, DATE, INTEGER) SET search_path = '';
ALTER FUNCTION validate_session_availability_with_timezone() SET search_path = '';

-- Rating functions
ALTER FUNCTION get_coach_average_rating(UUID, DATE, DATE) SET search_path = '';
ALTER FUNCTION get_coach_average_rating(UUID) SET search_path = '';
ALTER FUNCTION get_system_average_rating(DATE, DATE) SET search_path = '';

-- ============================================================================
-- PART 5: File Management Functions
-- ============================================================================

-- File upload and management
ALTER FUNCTION update_file_uploads_updated_at() SET search_path = '';
ALTER FUNCTION increment_file_download_count() SET search_path = '';
ALTER FUNCTION user_has_version_access() SET search_path = '';
ALTER FUNCTION get_next_version_number() SET search_path = '';
ALTER FUNCTION create_file_version() SET search_path = '';
ALTER FUNCTION rollback_to_version() SET search_path = '';
ALTER FUNCTION get_version_comparison() SET search_path = '';
ALTER FUNCTION get_file_version_stats() SET search_path = '';

-- File sharing and security
ALTER FUNCTION cleanup_expired_shares() SET search_path = '';
ALTER FUNCTION validate_temporary_share_access() SET search_path = '';
ALTER FUNCTION track_file_share_access() SET search_path = '';
ALTER FUNCTION cleanup_expired_file_shares() SET search_path = '';
ALTER FUNCTION generate_share_token() SET search_path = '';
ALTER FUNCTION create_temporary_file_share() SET search_path = '';
ALTER FUNCTION log_share_access() SET search_path = '';

-- File storage and analytics
ALTER FUNCTION get_user_storage_usage() SET search_path = '';
ALTER FUNCTION get_files_shared_with_user() SET search_path = '';
ALTER FUNCTION get_share_statistics() SET search_path = '';
ALTER FUNCTION get_file_download_stats() SET search_path = '';
ALTER FUNCTION get_user_download_history() SET search_path = '';
ALTER FUNCTION get_popular_files() SET search_path = '';

-- ============================================================================
-- PART 6: Security and Audit Functions
-- ============================================================================

-- IP blocking and security
ALTER FUNCTION block_ip_address() SET search_path = '';
ALTER FUNCTION unblock_ip_address() SET search_path = '';
ALTER FUNCTION is_ip_blocked() SET search_path = '';
ALTER FUNCTION log_security_event(TEXT, TEXT, UUID, INET, TEXT, JSONB) SET search_path = '';
ALTER FUNCTION log_security_event(TEXT, UUID, INET, TEXT, JSONB) SET search_path = '';
ALTER FUNCTION log_file_security_event() SET search_path = '';
ALTER FUNCTION get_security_statistics() SET search_path = '';
ALTER FUNCTION cleanup_old_security_logs() SET search_path = '';

-- Virus scanning and quarantine
ALTER FUNCTION cleanup_expired_virus_scan_cache() SET search_path = '';
ALTER FUNCTION cleanup_expired_quarantined_files() SET search_path = '';
ALTER FUNCTION get_virus_scan_statistics() SET search_path = '';
ALTER FUNCTION quarantine_file() SET search_path = '';
ALTER FUNCTION update_quarantine_review_timestamp() SET search_path = '';

-- ============================================================================
-- PART 7: Messaging System Functions
-- ============================================================================

-- Messaging and conversations
ALTER FUNCTION update_conversation_last_message() SET search_path = '';
ALTER FUNCTION can_user_message_user() SET search_path = '';
ALTER FUNCTION get_unread_message_count() SET search_path = '';
ALTER FUNCTION mark_conversation_as_read() SET search_path = '';
ALTER FUNCTION get_or_create_direct_conversation() SET search_path = '';
ALTER FUNCTION cleanup_expired_typing_indicators() SET search_path = '';

-- ============================================================================
-- PART 8: System Health and Maintenance Functions
-- ============================================================================

-- System health monitoring
ALTER FUNCTION update_system_health() SET search_path = '';
ALTER FUNCTION get_system_health_stats() SET search_path = '';
ALTER FUNCTION check_connection() SET search_path = '';
ALTER FUNCTION get_active_connections() SET search_path = '';
ALTER FUNCTION get_database_size() SET search_path = '';
ALTER FUNCTION get_long_running_queries() SET search_path = '';
ALTER FUNCTION get_system_statistics() SET search_path = '';
ALTER FUNCTION get_database_statistics() SET search_path = '';

-- Maintenance and optimization
ALTER FUNCTION log_maintenance_action() SET search_path = '';
ALTER FUNCTION get_recent_maintenance_operations() SET search_path = '';
ALTER FUNCTION log_audit_event() SET search_path = '';
ALTER FUNCTION cleanup_old_logs() SET search_path = '';
ALTER FUNCTION maintenance_cleanup_old_data() SET search_path = '';
ALTER FUNCTION maintenance_optimize_tables() SET search_path = '';
ALTER FUNCTION comprehensive_database_cleanup() SET search_path = '';
ALTER FUNCTION verify_database_integrity() SET search_path = '';

-- Performance monitoring
ALTER FUNCTION get_index_usage_stats() SET search_path = '';
ALTER FUNCTION get_table_sizes() SET search_path = '';
ALTER FUNCTION get_slow_queries() SET search_path = '';

-- ============================================================================
-- PART 9: Analytics and Reporting Functions
-- ============================================================================

-- User and session analytics
ALTER FUNCTION get_daily_user_growth() SET search_path = '';
ALTER FUNCTION get_daily_session_metrics() SET search_path = '';
ALTER FUNCTION get_coach_performance_metrics() SET search_path = '';
ALTER FUNCTION get_enhanced_coach_performance_metrics(DATE, DATE) SET search_path = '';
ALTER FUNCTION get_system_overview_metrics(DATE, DATE) SET search_path = '';

-- Notification analytics
ALTER FUNCTION get_notification_queue_stats() SET search_path = '';
ALTER FUNCTION get_notification_overview_stats() SET search_path = '';
ALTER FUNCTION get_top_performing_notifications() SET search_path = '';
ALTER FUNCTION get_user_engagement_metrics() SET search_path = '';
ALTER FUNCTION get_notification_preferences_stats() SET search_path = '';
ALTER FUNCTION cleanup_notification_analytics_data() SET search_path = '';
ALTER FUNCTION refresh_daily_notification_stats() SET search_path = '';
ALTER FUNCTION get_notification_time_series() SET search_path = '';
ALTER FUNCTION get_notification_delivery_health() SET search_path = '';

-- ============================================================================
-- PART 10: Handle Materialized View Security
-- ============================================================================

-- Restrict access to the materialized view to admin users only
REVOKE SELECT ON daily_notification_stats FROM anon, authenticated;

-- Grant access only to admin users through a security definer function
CREATE OR REPLACE FUNCTION get_daily_notification_stats()
RETURNS TABLE (
    stat_date DATE,
    total_sent BIGINT,
    total_delivered BIGINT,
    total_failed BIGINT,
    delivery_rate NUMERIC,
    avg_delivery_time_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only admins can access this data
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    RETURN QUERY
    SELECT 
        dns.stat_date,
        dns.total_sent,
        dns.total_delivered,
        dns.total_failed,
        dns.delivery_rate,
        dns.avg_delivery_time_minutes
    FROM public.daily_notification_stats dns
    ORDER BY dns.stat_date DESC;
END;
$$;

-- Grant execute permission to authenticated users (access control handled within function)
GRANT EXECUTE ON FUNCTION get_daily_notification_stats() TO authenticated;

-- ============================================================================
-- PART 11: Add Comments and Documentation
-- ============================================================================

COMMENT ON FUNCTION get_daily_notification_stats() IS 
'Admin-only function to access daily notification statistics. Replaces direct access to daily_notification_stats materialized view.';

-- Migration summary comment
COMMENT ON SCHEMA public IS 
'Schema updated with secure search_path settings on all functions to prevent search path injection attacks. Migration 20250914000002 applied.';

-- ============================================================================
-- MIGRATION COMPLETION LOG
-- ============================================================================

-- Log the completion of this security migration
DO $$
BEGIN
    RAISE NOTICE 'Security Migration 20250914000002 completed successfully:';
    RAISE NOTICE '- Fixed search_path for 120+ functions';
    RAISE NOTICE '- Secured daily_notification_stats materialized view';
    RAISE NOTICE '- All functions now have immutable search_path = ''''';
    RAISE NOTICE '- Function access patterns preserved with enhanced security';
END;
$$;