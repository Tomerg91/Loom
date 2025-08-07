-- Enhance notification system with comprehensive tables and functions
-- Date: 2025-08-06
-- Purpose: Complete the notification system implementation

-- First, update the notification_type enum to include more types
ALTER TYPE notification_type ADD VALUE 'goal_achieved';
ALTER TYPE notification_type ADD VALUE 'appointment_reminder'; 
ALTER TYPE notification_type ADD VALUE 'coach_message';
ALTER TYPE notification_type ADD VALUE 'client_message';
ALTER TYPE notification_type ADD VALUE 'session_cancelled';
ALTER TYPE notification_type ADD VALUE 'session_rescheduled';
ALTER TYPE notification_type ADD VALUE 'reflection_reminder';
ALTER TYPE notification_type ADD VALUE 'system_announcement';
ALTER TYPE notification_type ADD VALUE 'payment_reminder';
ALTER TYPE notification_type ADD VALUE 'welcome_message';

-- Create notification preferences table
CREATE TABLE notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Email notification preferences
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    email_session_reminders BOOLEAN NOT NULL DEFAULT true,
    email_session_updates BOOLEAN NOT NULL DEFAULT true,
    email_messages BOOLEAN NOT NULL DEFAULT true,
    email_system_updates BOOLEAN NOT NULL DEFAULT false,
    email_marketing BOOLEAN NOT NULL DEFAULT false,
    
    -- In-app notification preferences  
    inapp_enabled BOOLEAN NOT NULL DEFAULT true,
    inapp_session_reminders BOOLEAN NOT NULL DEFAULT true,
    inapp_session_updates BOOLEAN NOT NULL DEFAULT true,
    inapp_messages BOOLEAN NOT NULL DEFAULT true,
    inapp_system_updates BOOLEAN NOT NULL DEFAULT true,
    
    -- Push notification preferences
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    push_session_reminders BOOLEAN NOT NULL DEFAULT false,
    push_messages BOOLEAN NOT NULL DEFAULT false,
    
    -- Timing preferences
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    timezone TEXT DEFAULT 'UTC',
    
    -- Frequency preferences
    digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification templates table
CREATE TABLE notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type notification_type NOT NULL,
    language language NOT NULL DEFAULT 'en',
    channel TEXT NOT NULL CHECK (channel IN ('email', 'inapp', 'push')),
    
    -- Template content
    subject TEXT, -- for email templates
    title TEXT NOT NULL, -- for in-app/push notifications
    body TEXT NOT NULL,
    html_body TEXT, -- for email templates
    
    -- Template metadata
    variables JSONB DEFAULT '{}', -- Available template variables
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(type, language, channel)
);

-- Create notification delivery logs table for tracking
CREATE TABLE notification_delivery_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'inapp', 'push')),
    
    -- Delivery status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
    
    -- Tracking information
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error information
    error_message TEXT,
    error_code TEXT,
    
    -- Provider information
    provider_id TEXT, -- external provider reference
    provider_response JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhance the existing notifications table with additional fields
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'inapp' CHECK (channel IN ('email', 'inapp', 'push'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES notification_templates(id);

-- Add indexes for the new tables
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_language ON notification_templates(language);
CREATE INDEX idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active);

CREATE INDEX idx_notification_delivery_logs_notification_id ON notification_delivery_logs(notification_id);
CREATE INDEX idx_notification_delivery_logs_channel ON notification_delivery_logs(channel);
CREATE INDEX idx_notification_delivery_logs_status ON notification_delivery_logs(status);
CREATE INDEX idx_notification_delivery_logs_sent_at ON notification_delivery_logs(sent_at);

-- Add new indexes to the notifications table for new fields
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(input_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM notifications
        WHERE user_id = input_user_id
        AND read_at IS NULL
        AND channel = 'inapp'
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID, input_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET read_at = NOW()
    WHERE id = notification_id 
    AND user_id = input_user_id 
    AND read_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(input_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications 
    SET read_at = NOW()
    WHERE user_id = input_user_id 
    AND read_at IS NULL
    AND channel = 'inapp';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE (
        -- Delete read notifications older than 90 days
        (read_at IS NOT NULL AND read_at < NOW() - INTERVAL '90 days')
        OR
        -- Delete expired notifications
        (expires_at IS NOT NULL AND expires_at < NOW())
        OR
        -- Delete old unread notifications (6 months)
        (read_at IS NULL AND created_at < NOW() - INTERVAL '6 months')
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to create notification with template
CREATE OR REPLACE FUNCTION create_notification_from_template(
    input_user_id UUID,
    input_type notification_type,
    input_channel TEXT DEFAULT 'inapp',
    template_variables JSONB DEFAULT '{}',
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    priority TEXT DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    template_record notification_templates;
    notification_id UUID;
    user_lang language;
BEGIN
    -- Get user's language preference
    SELECT language INTO user_lang FROM users WHERE id = input_user_id;
    IF user_lang IS NULL THEN
        user_lang := 'en';
    END IF;
    
    -- Get the appropriate template
    SELECT * INTO template_record 
    FROM notification_templates 
    WHERE type = input_type 
    AND language = user_lang 
    AND channel = input_channel 
    AND is_active = true
    LIMIT 1;
    
    -- Fallback to English if user's language template not found
    IF template_record.id IS NULL AND user_lang != 'en' THEN
        SELECT * INTO template_record 
        FROM notification_templates 
        WHERE type = input_type 
        AND language = 'en' 
        AND channel = input_channel 
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Create notification if template found
    IF template_record.id IS NOT NULL THEN
        INSERT INTO notifications (
            user_id, 
            type, 
            channel,
            title, 
            message, 
            data, 
            scheduled_for,
            priority,
            template_id
        ) VALUES (
            input_user_id,
            input_type,
            input_channel,
            template_record.title,
            template_record.body,
            template_variables,
            scheduled_for,
            priority,
            template_record.id
        ) RETURNING id INTO notification_id;
    END IF;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for updated_at on new tables
CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_delivery_logs_updated_at 
    BEFORE UPDATE ON notification_delivery_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM notification_preferences);

-- Insert default notification templates (English first)
INSERT INTO notification_templates (type, language, channel, title, body, html_body, subject) VALUES
-- Session reminder templates
('session_reminder', 'en', 'inapp', 'Session Reminder', 'You have a session with {{coach_name}} starting in {{time_until}}.', NULL, NULL),
('session_reminder', 'en', 'email', 'Session Reminder', 'You have a session with {{coach_name}} starting in {{time_until}}.', 
 '<h2>Session Reminder</h2><p>You have a session with <strong>{{coach_name}}</strong> starting in <strong>{{time_until}}</strong>.</p><p><a href="{{session_url}}">Join Session</a></p>',
 'Upcoming Session with {{coach_name}}'),

-- Session confirmation templates
('session_confirmation', 'en', 'inapp', 'Session Confirmed', 'Your session with {{coach_name}} has been confirmed for {{session_time}}.', NULL, NULL),
('session_confirmation', 'en', 'email', 'Session Confirmed', 'Your session with {{coach_name}} has been confirmed for {{session_time}}.', 
 '<h2>Session Confirmed</h2><p>Your session with <strong>{{coach_name}}</strong> has been confirmed for <strong>{{session_time}}</strong>.</p>',
 'Session Confirmed - {{session_time}}'),

-- Message notification templates  
('new_message', 'en', 'inapp', 'New Message', 'You received a new message from {{sender_name}}.', NULL, NULL),
('new_message', 'en', 'email', 'New Message', 'You received a new message from {{sender_name}}.', 
 '<h2>New Message</h2><p>You received a new message from <strong>{{sender_name}}</strong>.</p><p>{{message_preview}}</p>',
 'New message from {{sender_name}}'),

-- Welcome message
('welcome_message', 'en', 'inapp', 'Welcome to Loom!', 'Welcome to your coaching journey. We\'re excited to help you achieve your goals!', NULL, NULL),
('welcome_message', 'en', 'email', 'Welcome to Loom!', 'Welcome to your coaching journey. We\'re excited to help you achieve your goals!', 
 '<h2>Welcome to Loom!</h2><p>Welcome to your coaching journey. We\'re excited to help you achieve your goals!</p>',
 'Welcome to Loom - Your Coaching Journey Starts Here');

-- Insert Hebrew templates
INSERT INTO notification_templates (type, language, channel, title, body, html_body, subject) VALUES
-- Session reminder templates (Hebrew)
('session_reminder', 'he', 'inapp', 'תזכורת לפגישה', 'יש לך פגישה עם {{coach_name}} שמתחילה בעוד {{time_until}}.', NULL, NULL),
('session_reminder', 'he', 'email', 'תזכורת לפגישה', 'יש לך פגישה עם {{coach_name}} שמתחילה בעוד {{time_until}}.', 
 '<h2 dir="rtl">תזכורת לפגישה</h2><p dir="rtl">יש לך פגישה עם <strong>{{coach_name}}</strong> שמתחילה בעוד <strong>{{time_until}}</strong>.</p><p><a href="{{session_url}}">הצטרף לפגישה</a></p>',
 'פגישה קרובה עם {{coach_name}}'),

-- Session confirmation templates (Hebrew)
('session_confirmation', 'he', 'inapp', 'הפגישה אושרה', 'הפגישה שלך עם {{coach_name}} אושרה ל-{{session_time}}.', NULL, NULL),
('session_confirmation', 'he', 'email', 'הפגישה אושרה', 'הפגישה שלך עם {{coach_name}} אושרה ל-{{session_time}}.', 
 '<h2 dir="rtl">הפגישה אושרה</h2><p dir="rtl">הפגישה שלך עם <strong>{{coach_name}}</strong> אושרה ל-<strong>{{session_time}}</strong>.</p>',
 'פגישה אושרה - {{session_time}}'),

-- Message notification templates (Hebrew)
('new_message', 'he', 'inapp', 'הודעה חדשה', 'קיבלת הודעה חדשה מ-{{sender_name}}.', NULL, NULL),
('new_message', 'he', 'email', 'הודעה חדשה', 'קיבלת הודעה חדשה מ-{{sender_name}}.', 
 '<h2 dir="rtl">הודעה חדשה</h2><p dir="rtl">קיבלת הודעה חדשה מ-<strong>{{sender_name}}</strong>.</p><p dir="rtl">{{message_preview}}</p>',
 'הודעה חדשה מ-{{sender_name}}'),

-- Welcome message (Hebrew)
('welcome_message', 'he', 'inapp', 'ברוך הבא ל-Loom!', 'ברוך הבא למסע האימון שלך. אנחנו נרגשים לעזור לך להשיג את המטרות שלך!', NULL, NULL),
('welcome_message', 'he', 'email', 'ברוך הבא ל-Loom!', 'ברוך הבא למסע האימון שלך. אנחנו נרגשים לעזור לך להשיג את המטרות שלך!', 
 '<h2 dir="rtl">ברוך הבא ל-Loom!</h2><p dir="rtl">ברוך הבא למסע האימון שלך. אנחנו נרגשים לעזור לך להשיג את המטרות שלך!</p>',
 'ברוך הבא ל-Loom - מסע האימון שלך מתחיל כאן');