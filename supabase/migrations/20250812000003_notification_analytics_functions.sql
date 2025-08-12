-- Notification Analytics Functions
-- Date: 2025-08-12
-- Purpose: Add comprehensive analytics functions for notification system

-- Function to get notification overview statistics
CREATE OR REPLACE FUNCTION get_notification_overview_stats(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    filter_channel TEXT DEFAULT NULL,
    filter_type notification_type DEFAULT NULL
)
RETURNS TABLE(
    total_sent BIGINT,
    total_delivered BIGINT,
    total_opened BIGINT,
    total_clicked BIGINT,
    delivery_rate NUMERIC,
    open_rate NUMERIC,
    click_rate NUMERIC
) AS $$
DECLARE
    sent_count BIGINT;
    delivered_count BIGINT;
    opened_count BIGINT;
    clicked_count BIGINT;
BEGIN
    -- Count total sent notifications
    SELECT COUNT(*) INTO sent_count
    FROM notifications n
    WHERE n.created_at >= start_date 
    AND n.created_at <= end_date
    AND (filter_channel IS NULL OR n.channel = filter_channel)
    AND (filter_type IS NULL OR n.type = filter_type);

    -- Count delivered notifications
    SELECT COUNT(DISTINCT ndl.notification_id) INTO delivered_count
    FROM notification_delivery_logs ndl
    JOIN notifications n ON n.id = ndl.notification_id
    WHERE ndl.status IN ('delivered', 'opened', 'clicked')
    AND ndl.created_at >= start_date 
    AND ndl.created_at <= end_date
    AND (filter_channel IS NULL OR ndl.channel = filter_channel)
    AND (filter_type IS NULL OR n.type = filter_type);

    -- Count opened notifications
    SELECT COUNT(DISTINCT ndl.notification_id) INTO opened_count
    FROM notification_delivery_logs ndl
    JOIN notifications n ON n.id = ndl.notification_id
    WHERE ndl.status IN ('opened', 'clicked')
    AND ndl.opened_at IS NOT NULL
    AND ndl.created_at >= start_date 
    AND ndl.created_at <= end_date
    AND (filter_channel IS NULL OR ndl.channel = filter_channel)
    AND (filter_type IS NULL OR n.type = filter_type);

    -- Count clicked notifications
    SELECT COUNT(DISTINCT ndl.notification_id) INTO clicked_count
    FROM notification_delivery_logs ndl
    JOIN notifications n ON n.id = ndl.notification_id
    WHERE ndl.status = 'clicked'
    AND ndl.clicked_at IS NOT NULL
    AND ndl.created_at >= start_date 
    AND ndl.created_at <= end_date
    AND (filter_channel IS NULL OR ndl.channel = filter_channel)
    AND (filter_type IS NULL OR n.type = filter_type);

    RETURN QUERY SELECT
        sent_count,
        delivered_count,
        opened_count,
        clicked_count,
        CASE WHEN sent_count > 0 THEN (delivered_count::NUMERIC / sent_count::NUMERIC) * 100 ELSE 0 END,
        CASE WHEN delivered_count > 0 THEN (opened_count::NUMERIC / delivered_count::NUMERIC) * 100 ELSE 0 END,
        CASE WHEN opened_count > 0 THEN (clicked_count::NUMERIC / opened_count::NUMERIC) * 100 ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get time series data for notifications
CREATE OR REPLACE FUNCTION get_notification_time_series(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    interval_type TEXT DEFAULT 'day',
    filter_channel TEXT DEFAULT NULL,
    filter_type notification_type DEFAULT NULL
)
RETURNS TABLE(
    date TEXT,
    sent BIGINT,
    delivered BIGINT,
    opened BIGINT,
    clicked BIGINT
) AS $$
DECLARE
    date_trunc_format TEXT;
BEGIN
    -- Determine date truncation format
    date_trunc_format := CASE 
        WHEN interval_type = 'hour' THEN 'hour'
        WHEN interval_type = 'day' THEN 'day'
        WHEN interval_type = 'week' THEN 'week'
        WHEN interval_type = 'month' THEN 'month'
        ELSE 'day'
    END;

    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            date_trunc(date_trunc_format, start_date),
            date_trunc(date_trunc_format, end_date),
            ('1 ' || date_trunc_format)::INTERVAL
        ) AS period_date
    ),
    notification_stats AS (
        SELECT 
            date_trunc(date_trunc_format, n.created_at) AS period_date,
            COUNT(*) AS sent_count,
            COUNT(CASE WHEN EXISTS(
                SELECT 1 FROM notification_delivery_logs ndl 
                WHERE ndl.notification_id = n.id 
                AND ndl.status IN ('delivered', 'opened', 'clicked')
            ) THEN 1 END) AS delivered_count,
            COUNT(CASE WHEN EXISTS(
                SELECT 1 FROM notification_delivery_logs ndl 
                WHERE ndl.notification_id = n.id 
                AND ndl.status IN ('opened', 'clicked')
                AND ndl.opened_at IS NOT NULL
            ) THEN 1 END) AS opened_count,
            COUNT(CASE WHEN EXISTS(
                SELECT 1 FROM notification_delivery_logs ndl 
                WHERE ndl.notification_id = n.id 
                AND ndl.status = 'clicked'
                AND ndl.clicked_at IS NOT NULL
            ) THEN 1 END) AS clicked_count
        FROM notifications n
        WHERE n.created_at >= start_date 
        AND n.created_at <= end_date
        AND (filter_channel IS NULL OR n.channel = filter_channel)
        AND (filter_type IS NULL OR n.type = filter_type)
        GROUP BY date_trunc(date_trunc_format, n.created_at)
    )
    SELECT 
        ds.period_date::TEXT,
        COALESCE(ns.sent_count, 0),
        COALESCE(ns.delivered_count, 0),
        COALESCE(ns.opened_count, 0),
        COALESCE(ns.clicked_count, 0)
    FROM date_series ds
    LEFT JOIN notification_stats ns ON ds.period_date = ns.period_date
    ORDER BY ds.period_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top performing notifications
CREATE OR REPLACE FUNCTION get_top_performing_notifications(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    type notification_type,
    title TEXT,
    sent_count BIGINT,
    open_rate NUMERIC,
    click_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH notification_performance AS (
        SELECT 
            n.id,
            n.type,
            n.title,
            COUNT(*) AS sent_count,
            COUNT(CASE WHEN EXISTS(
                SELECT 1 FROM notification_delivery_logs ndl 
                WHERE ndl.notification_id = n.id 
                AND ndl.status IN ('opened', 'clicked')
                AND ndl.opened_at IS NOT NULL
            ) THEN 1 END) AS opened_count,
            COUNT(CASE WHEN EXISTS(
                SELECT 1 FROM notification_delivery_logs ndl 
                WHERE ndl.notification_id = n.id 
                AND ndl.status = 'clicked'
                AND ndl.clicked_at IS NOT NULL
            ) THEN 1 END) AS clicked_count
        FROM notifications n
        WHERE n.created_at >= start_date 
        AND n.created_at <= end_date
        GROUP BY n.id, n.type, n.title
        HAVING COUNT(*) >= 10 -- Only include notifications sent to at least 10 users
    )
    SELECT 
        np.id,
        np.type,
        np.title,
        np.sent_count,
        CASE WHEN np.sent_count > 0 THEN (np.opened_count::NUMERIC / np.sent_count::NUMERIC) * 100 ELSE 0 END,
        CASE WHEN np.opened_count > 0 THEN (np.clicked_count::NUMERIC / np.opened_count::NUMERIC) * 100 ELSE 0 END
    FROM notification_performance np
    ORDER BY 
        (np.opened_count::NUMERIC / np.sent_count::NUMERIC) + 
        (np.clicked_count::NUMERIC / GREATEST(np.opened_count, 1)::NUMERIC) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user engagement metrics
CREATE OR REPLACE FUNCTION get_user_engagement_metrics(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    active_users BIGINT,
    engaged_users BIGINT,
    unsubscribe_rate NUMERIC,
    avg_notifications_per_user NUMERIC
) AS $$
DECLARE
    total_users BIGINT;
    active_user_count BIGINT;
    engaged_user_count BIGINT;
    unsubscribed_count BIGINT;
    total_notifications BIGINT;
BEGIN
    -- Count total users
    SELECT COUNT(*) INTO total_users FROM users;

    -- Count active users (received at least one notification)
    SELECT COUNT(DISTINCT n.user_id) INTO active_user_count
    FROM notifications n
    WHERE n.created_at >= start_date 
    AND n.created_at <= end_date;

    -- Count engaged users (opened or clicked at least one notification)
    SELECT COUNT(DISTINCT n.user_id) INTO engaged_user_count
    FROM notifications n
    JOIN notification_delivery_logs ndl ON n.id = ndl.notification_id
    WHERE ndl.status IN ('opened', 'clicked')
    AND n.created_at >= start_date 
    AND n.created_at <= end_date;

    -- Count unsubscribed users (approximate based on inactive push subscriptions)
    SELECT COUNT(*) INTO unsubscribed_count
    FROM push_subscriptions
    WHERE is_active = false
    AND updated_at >= start_date 
    AND updated_at <= end_date;

    -- Count total notifications sent
    SELECT COUNT(*) INTO total_notifications
    FROM notifications
    WHERE created_at >= start_date 
    AND created_at <= end_date;

    RETURN QUERY SELECT
        active_user_count,
        engaged_user_count,
        CASE WHEN total_users > 0 THEN (unsubscribed_count::NUMERIC / total_users::NUMERIC) * 100 ELSE 0 END,
        CASE WHEN active_user_count > 0 THEN total_notifications::NUMERIC / active_user_count::NUMERIC ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification delivery health metrics
CREATE OR REPLACE FUNCTION get_notification_delivery_health()
RETURNS TABLE(
    total_queued BIGINT,
    processing_notifications BIGINT,
    failed_notifications BIGINT,
    avg_delivery_time NUMERIC,
    error_rate NUMERIC
) AS $$
DECLARE
    queued_count BIGINT;
    processing_count BIGINT;
    failed_count BIGINT;
    total_processed BIGINT;
    avg_delivery NUMERIC;
    error_percentage NUMERIC;
BEGIN
    -- Count queued notifications
    SELECT COUNT(*) INTO queued_count
    FROM scheduled_notifications
    WHERE status = 'pending';

    -- Count processing notifications
    SELECT COUNT(*) INTO processing_count
    FROM scheduled_notifications
    WHERE status = 'processing';

    -- Count failed notifications in the last 24 hours
    SELECT COUNT(*) INTO failed_count
    FROM notification_delivery_logs
    WHERE status = 'failed'
    AND created_at >= NOW() - INTERVAL '24 hours';

    -- Count total processed notifications in the last 24 hours
    SELECT COUNT(*) INTO total_processed
    FROM notification_delivery_logs
    WHERE created_at >= NOW() - INTERVAL '24 hours';

    -- Calculate average delivery time (from sent to delivered)
    SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) INTO avg_delivery
    FROM notification_delivery_logs
    WHERE delivered_at IS NOT NULL 
    AND sent_at IS NOT NULL
    AND created_at >= NOW() - INTERVAL '24 hours';

    -- Calculate error rate
    error_percentage := CASE 
        WHEN total_processed > 0 THEN (failed_count::NUMERIC / total_processed::NUMERIC) * 100 
        ELSE 0 
    END;

    RETURN QUERY SELECT
        queued_count,
        processing_count,
        failed_count,
        COALESCE(avg_delivery, 0),
        error_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification preferences analytics
CREATE OR REPLACE FUNCTION get_notification_preferences_stats()
RETURNS TABLE(
    total_users BIGINT,
    email_enabled BIGINT,
    push_enabled BIGINT,
    inapp_enabled BIGINT,
    marketing_opted_in BIGINT,
    quiet_hours_enabled BIGINT,
    avg_reminder_timing NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        COUNT(CASE WHEN np.email_enabled = true THEN 1 END)::BIGINT,
        COUNT(CASE WHEN np.push_enabled = true THEN 1 END)::BIGINT,
        COUNT(CASE WHEN np.inapp_enabled = true THEN 1 END)::BIGINT,
        COUNT(CASE WHEN np.email_marketing = true THEN 1 END)::BIGINT,
        COUNT(CASE WHEN np.quiet_hours_enabled = true THEN 1 END)::BIGINT,
        AVG(np.reminder_timing)::NUMERIC
    FROM users u
    LEFT JOIN notification_preferences np ON u.id = np.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup notification analytics data
CREATE OR REPLACE FUNCTION cleanup_notification_analytics_data()
RETURNS TABLE(
    old_logs_deleted BIGINT,
    old_scheduled_deleted BIGINT,
    inactive_subscriptions_deleted BIGINT
) AS $$
DECLARE
    logs_deleted BIGINT;
    scheduled_deleted BIGINT;
    subscriptions_deleted BIGINT;
BEGIN
    -- Clean up old delivery logs (keep 6 months)
    DELETE FROM notification_delivery_logs
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    GET DIAGNOSTICS logs_deleted = ROW_COUNT;

    -- Clean up old scheduled notifications (keep 30 days)
    DELETE FROM scheduled_notifications
    WHERE status IN ('sent', 'failed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS scheduled_deleted = ROW_COUNT;

    -- Clean up inactive push subscriptions (keep 90 days)
    DELETE FROM push_subscriptions
    WHERE is_active = false
    AND updated_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS subscriptions_deleted = ROW_COUNT;

    RETURN QUERY SELECT
        logs_deleted,
        scheduled_deleted,
        subscriptions_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create materialized view for daily notification stats (for performance)
CREATE MATERIALIZED VIEW daily_notification_stats AS
SELECT 
    date_trunc('day', n.created_at) AS stat_date,
    n.channel,
    n.type,
    COUNT(*) AS total_sent,
    COUNT(CASE WHEN EXISTS(
        SELECT 1 FROM notification_delivery_logs ndl 
        WHERE ndl.notification_id = n.id 
        AND ndl.status IN ('delivered', 'opened', 'clicked')
    ) THEN 1 END) AS total_delivered,
    COUNT(CASE WHEN EXISTS(
        SELECT 1 FROM notification_delivery_logs ndl 
        WHERE ndl.notification_id = n.id 
        AND ndl.status IN ('opened', 'clicked')
        AND ndl.opened_at IS NOT NULL
    ) THEN 1 END) AS total_opened,
    COUNT(CASE WHEN EXISTS(
        SELECT 1 FROM notification_delivery_logs ndl 
        WHERE ndl.notification_id = n.id 
        AND ndl.status = 'clicked'
        AND ndl.clicked_at IS NOT NULL
    ) THEN 1 END) AS total_clicked
FROM notifications n
WHERE n.created_at >= NOW() - INTERVAL '1 year' -- Keep 1 year of daily stats
GROUP BY 
    date_trunc('day', n.created_at),
    n.channel,
    n.type
ORDER BY stat_date DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_daily_notification_stats_unique 
ON daily_notification_stats (stat_date, channel, type);

-- Function to refresh daily stats (called by cron job)
CREATE OR REPLACE FUNCTION refresh_daily_notification_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_notification_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on analytics functions
GRANT EXECUTE ON FUNCTION get_notification_overview_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT, notification_type) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_time_series(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, notification_type) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_performing_notifications(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_engagement_metrics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_delivery_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_preferences_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_notification_analytics_data() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_daily_notification_stats() TO authenticated;

-- Grant access to materialized view
GRANT SELECT ON daily_notification_stats TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_notification_overview_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT, notification_type) IS 'Get comprehensive notification statistics for a date range';
COMMENT ON FUNCTION get_notification_time_series(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, notification_type) IS 'Get time series data for notification metrics';
COMMENT ON FUNCTION get_top_performing_notifications(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER) IS 'Get notifications with highest engagement rates';
COMMENT ON FUNCTION get_user_engagement_metrics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Get user engagement and behavior metrics';
COMMENT ON FUNCTION get_notification_delivery_health() IS 'Get system health metrics for notification delivery';
COMMENT ON FUNCTION get_notification_preferences_stats() IS 'Get analytics on user notification preferences';
COMMENT ON FUNCTION cleanup_notification_analytics_data() IS 'Clean up old analytics data to maintain performance';
COMMENT ON FUNCTION refresh_daily_notification_stats() IS 'Refresh the daily notification statistics materialized view';

COMMENT ON MATERIALIZED VIEW daily_notification_stats IS 'Pre-aggregated daily notification statistics for improved query performance';