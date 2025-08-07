-- Row Level Security (RLS) policies for notification system
-- Date: 2025-08-06
-- Purpose: Secure access to notification-related tables

-- Enable RLS on all notification tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Notifications table policies
-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only update their own notifications (marking as read)
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- System can insert notifications for any user (for system-generated notifications)
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Notification preferences policies
-- Users can only see and modify their own preferences
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notification templates policies
-- All authenticated users can view active templates (needed for system notifications)
CREATE POLICY "Authenticated users can view active notification templates" ON notification_templates
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Only admins can manage templates
CREATE POLICY "Admins can manage notification templates" ON notification_templates
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- Notification delivery logs policies
-- Users can view delivery logs for their own notifications
CREATE POLICY "Users can view delivery logs for their notifications" ON notification_delivery_logs
    FOR SELECT USING (
        notification_id IN (
            SELECT id FROM notifications WHERE user_id = auth.uid()
        )
    );

-- System can insert delivery logs for any notification
CREATE POLICY "System can insert delivery logs" ON notification_delivery_logs
    FOR INSERT WITH CHECK (true);

-- System can update delivery logs (status updates, tracking)
CREATE POLICY "System can update delivery logs" ON notification_delivery_logs
    FOR UPDATE USING (true);

-- Admins can view all delivery logs for analytics
CREATE POLICY "Admins can view all delivery logs" ON notification_delivery_logs
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- Function policies (grant execute permissions)
-- Grant execute permission on notification functions to authenticated users
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID, UUID) TO authenticated;  
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification_from_template(UUID, notification_type, TEXT, JSONB, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;

-- Grant execute permission on cleanup function to service role (for cron jobs)
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO service_role;

-- Create a policy function to check if user is admin (reusable)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on admin check function
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- Create additional helper functions for notification management
CREATE OR REPLACE FUNCTION can_send_notification(
    sender_id UUID,
    recipient_id UUID,
    notification_type notification_type
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admin can send any notification
    IF is_admin(sender_id) THEN
        RETURN TRUE;
    END IF;
    
    -- System notifications can be sent by authenticated users
    IF notification_type IN ('system_update', 'system_announcement', 'welcome_message') THEN
        RETURN is_admin(sender_id);
    END IF;
    
    -- Coach can send notifications to their clients
    IF notification_type IN ('session_reminder', 'session_confirmation', 'coach_message') THEN
        RETURN EXISTS (
            SELECT 1 FROM sessions 
            WHERE coach_id = sender_id 
            AND client_id = recipient_id
            AND status != 'cancelled'
        );
    END IF;
    
    -- Client can send notifications to their coach
    IF notification_type = 'client_message' THEN
        RETURN EXISTS (
            SELECT 1 FROM sessions 
            WHERE client_id = sender_id 
            AND coach_id = recipient_id
            AND status != 'cancelled'
        );
    END IF;
    
    -- Default deny
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_send_notification(UUID, UUID, notification_type) TO authenticated;

-- Add a more restrictive insert policy for notifications based on relationships
DROP POLICY "System can insert notifications" ON notifications;

CREATE POLICY "Authorized users can insert notifications" ON notifications
    FOR INSERT WITH CHECK (
        -- Always allow system to insert (service role)
        auth.role() = 'service_role'
        OR
        -- Allow if sender has permission to send to recipient
        can_send_notification(auth.uid(), user_id, type)
    );

-- Create function to send notification with permission checking
CREATE OR REPLACE FUNCTION send_notification(
    recipient_id UUID,
    notification_type notification_type,
    title TEXT,
    message TEXT,
    data JSONB DEFAULT '{}',
    channel TEXT DEFAULT 'inapp',
    priority TEXT DEFAULT 'normal',
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    sender_id UUID := auth.uid();
BEGIN
    -- Check if sender can send this type of notification to recipient
    IF NOT can_send_notification(sender_id, recipient_id, notification_type) THEN
        RAISE EXCEPTION 'Permission denied: Cannot send % notification to user %', notification_type, recipient_id;
    END IF;
    
    -- Create the notification
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        channel,
        priority,
        scheduled_for
    ) VALUES (
        recipient_id,
        notification_type,
        title,
        message,
        data,
        channel,
        priority,
        scheduled_for
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_notification(UUID, notification_type, TEXT, TEXT, JSONB, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) TO authenticated;