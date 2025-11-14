-- Settings & Preferences System with Audit Trail
-- Date: 2025-11-14
-- Purpose: Implement comprehensive settings management with auditability

-- Create user preferences table for app-wide settings
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,

    -- Display preferences
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    sidebar_collapsed BOOLEAN NOT NULL DEFAULT false,
    compact_mode BOOLEAN NOT NULL DEFAULT false,

    -- Localization preferences
    language language NOT NULL DEFAULT 'en',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    date_format TEXT DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),
    time_format TEXT DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),

    -- Communication preferences
    email_verified BOOLEAN NOT NULL DEFAULT false,
    phone_verified BOOLEAN NOT NULL DEFAULT false,

    -- Privacy preferences
    profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'contacts')),
    show_online_status BOOLEAN NOT NULL DEFAULT true,
    allow_search_indexing BOOLEAN NOT NULL DEFAULT false,

    -- Accessibility preferences
    reduced_motion BOOLEAN NOT NULL DEFAULT false,
    high_contrast BOOLEAN NOT NULL DEFAULT false,
    font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large', 'x-large')),
    screen_reader_optimized BOOLEAN NOT NULL DEFAULT false,

    -- Session preferences
    auto_join_video BOOLEAN NOT NULL DEFAULT true,
    auto_start_audio BOOLEAN NOT NULL DEFAULT true,
    video_quality TEXT DEFAULT 'auto' CHECK (video_quality IN ('auto', 'low', 'medium', 'high')),

    -- Data preferences
    data_export_frequency TEXT DEFAULT 'never' CHECK (data_export_frequency IN ('never', 'weekly', 'monthly', 'quarterly')),
    analytics_enabled BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings audit log table for tracking all preference changes
CREATE TABLE IF NOT EXISTS settings_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

    -- Change tracking
    setting_category TEXT NOT NULL CHECK (setting_category IN (
        'profile', 'notification', 'display', 'localization',
        'privacy', 'accessibility', 'session', 'data', 'security'
    )),
    setting_key TEXT NOT NULL,

    -- Value changes
    old_value JSONB,
    new_value JSONB,

    -- Change metadata
    change_source TEXT NOT NULL DEFAULT 'user' CHECK (change_source IN ('user', 'admin', 'system', 'migration')),
    change_reason TEXT,

    -- Request context
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,

    -- Geographic info
    country_code TEXT,
    timezone TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_language ON user_preferences(language);
CREATE INDEX idx_user_preferences_timezone ON user_preferences(timezone);

CREATE INDEX idx_settings_audit_log_user_id ON settings_audit_log(user_id);
CREATE INDEX idx_settings_audit_log_category ON settings_audit_log(setting_category);
CREATE INDEX idx_settings_audit_log_created_at ON settings_audit_log(created_at DESC);
CREATE INDEX idx_settings_audit_log_user_created ON settings_audit_log(user_id, created_at DESC);

-- Add trigger for updated_at on user_preferences
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log settings changes automatically
CREATE OR REPLACE FUNCTION log_settings_change(
    input_user_id UUID,
    input_category TEXT,
    input_key TEXT,
    input_old_value JSONB,
    input_new_value JSONB,
    input_source TEXT DEFAULT 'user',
    input_reason TEXT DEFAULT NULL,
    input_ip_address INET DEFAULT NULL,
    input_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO settings_audit_log (
        user_id,
        setting_category,
        setting_key,
        old_value,
        new_value,
        change_source,
        change_reason,
        ip_address,
        user_agent
    ) VALUES (
        input_user_id,
        input_category,
        input_key,
        input_old_value,
        input_new_value,
        input_source,
        input_reason,
        input_ip_address,
        input_user_agent
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's complete settings (combines multiple tables)
CREATE OR REPLACE FUNCTION get_user_settings(input_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'profile', (
            SELECT jsonb_build_object(
                'firstName', first_name,
                'lastName', last_name,
                'email', email,
                'phone', phone,
                'avatarUrl', avatar_url,
                'role', role,
                'status', status
            )
            FROM users
            WHERE id = input_user_id
        ),
        'preferences', (
            SELECT row_to_json(user_preferences.*)
            FROM user_preferences
            WHERE user_id = input_user_id
        ),
        'notifications', (
            SELECT row_to_json(notification_preferences.*)
            FROM notification_preferences
            WHERE user_id = input_user_id
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get settings audit history for a user
CREATE OR REPLACE FUNCTION get_settings_audit_history(
    input_user_id UUID,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    setting_category TEXT,
    setting_key TEXT,
    old_value JSONB,
    new_value JSONB,
    change_source TEXT,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sal.id,
        sal.setting_category,
        sal.setting_key,
        sal.old_value,
        sal.new_value,
        sal.change_source,
        sal.change_reason,
        sal.created_at
    FROM settings_audit_log sal
    WHERE sal.user_id = input_user_id
    ORDER BY sal.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old audit logs (retain last 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM settings_audit_log
    WHERE created_at < NOW() - INTERVAL '2 years';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Initialize default preferences for existing users
INSERT INTO user_preferences (user_id, language, timezone)
SELECT
    id,
    COALESCE(language, 'en'),
    COALESCE(timezone, 'UTC')
FROM users
WHERE id NOT IN (SELECT user_id FROM user_preferences);

-- Create audit log entries for initial setup (migration source)
INSERT INTO settings_audit_log (user_id, setting_category, setting_key, new_value, change_source, change_reason)
SELECT
    user_id,
    'localization',
    'initial_setup',
    jsonb_build_object('language', language, 'timezone', timezone),
    'migration',
    'Initial user preferences setup'
FROM user_preferences;

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'Stores user-specific application preferences and settings';
COMMENT ON TABLE settings_audit_log IS 'Audit trail for all settings and preference changes with full history';
COMMENT ON FUNCTION log_settings_change IS 'Logs any settings change with context for auditability and compliance';
COMMENT ON FUNCTION get_user_settings IS 'Retrieves complete user settings from all related tables';
COMMENT ON FUNCTION get_settings_audit_history IS 'Retrieves paginated audit history for a user';
