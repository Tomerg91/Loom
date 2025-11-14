-- Row Level Security Policies for Settings & Preferences
-- Date: 2025-11-14
-- Purpose: Secure access to user preferences and audit logs

-- Enable RLS on user_preferences table
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Enable RLS on settings_audit_log table
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER_PREFERENCES POLICIES
-- ============================================================================

-- Policy: Users can view their own preferences
CREATE POLICY user_preferences_select_own
    ON user_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences (if not exists)
CREATE POLICY user_preferences_insert_own
    ON user_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY user_preferences_update_own
    ON user_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users cannot delete their preferences (soft delete via status in users table)
-- No DELETE policy - preferences persist with user account

-- Policy: Admins can view all user preferences
CREATE POLICY user_preferences_admin_select_all
    ON user_preferences
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Policy: Admins can update any user preferences (with audit logging)
CREATE POLICY user_preferences_admin_update_all
    ON user_preferences
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================================================
-- SETTINGS_AUDIT_LOG POLICIES
-- ============================================================================

-- Policy: Users can view their own audit history
CREATE POLICY settings_audit_log_select_own
    ON settings_audit_log
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: System can insert audit logs (service role only)
CREATE POLICY settings_audit_log_insert_system
    ON settings_audit_log
    FOR INSERT
    WITH CHECK (true); -- Will be restricted by service role usage

-- Policy: No updates allowed on audit logs (immutable)
-- No UPDATE policy - audit logs are append-only

-- Policy: No deletes allowed on audit logs (except by retention policy)
-- No DELETE policy - cleanup handled by scheduled function

-- Policy: Admins can view all audit logs
CREATE POLICY settings_audit_log_admin_select_all
    ON settings_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS WITH RLS ENFORCEMENT
-- ============================================================================

-- Function to update user preferences with automatic audit logging
CREATE OR REPLACE FUNCTION update_user_preferences_with_audit(
    input_user_id UUID,
    preference_updates JSONB,
    change_reason TEXT DEFAULT NULL,
    request_ip INET DEFAULT NULL,
    request_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    old_preferences RECORD;
    new_preferences RECORD;
    updated_fields TEXT[];
    field_name TEXT;
    result JSONB;
BEGIN
    -- Verify user can update these preferences (RLS check)
    IF auth.uid() != input_user_id AND NOT EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Cannot update preferences for this user';
    END IF;

    -- Get old preferences
    SELECT * INTO old_preferences FROM user_preferences WHERE user_id = input_user_id;

    -- Update preferences dynamically based on provided fields
    UPDATE user_preferences
    SET
        theme = COALESCE((preference_updates->>'theme')::TEXT, theme),
        sidebar_collapsed = COALESCE((preference_updates->>'sidebar_collapsed')::BOOLEAN, sidebar_collapsed),
        compact_mode = COALESCE((preference_updates->>'compact_mode')::BOOLEAN, compact_mode),
        language = COALESCE((preference_updates->>'language')::language, language),
        timezone = COALESCE((preference_updates->>'timezone')::TEXT, timezone),
        date_format = COALESCE((preference_updates->>'date_format')::TEXT, date_format),
        time_format = COALESCE((preference_updates->>'time_format')::TEXT, time_format),
        profile_visibility = COALESCE((preference_updates->>'profile_visibility')::TEXT, profile_visibility),
        show_online_status = COALESCE((preference_updates->>'show_online_status')::BOOLEAN, show_online_status),
        allow_search_indexing = COALESCE((preference_updates->>'allow_search_indexing')::BOOLEAN, allow_search_indexing),
        reduced_motion = COALESCE((preference_updates->>'reduced_motion')::BOOLEAN, reduced_motion),
        high_contrast = COALESCE((preference_updates->>'high_contrast')::BOOLEAN, high_contrast),
        font_size = COALESCE((preference_updates->>'font_size')::TEXT, font_size),
        screen_reader_optimized = COALESCE((preference_updates->>'screen_reader_optimized')::BOOLEAN, screen_reader_optimized),
        auto_join_video = COALESCE((preference_updates->>'auto_join_video')::BOOLEAN, auto_join_video),
        auto_start_audio = COALESCE((preference_updates->>'auto_start_audio')::BOOLEAN, auto_start_audio),
        video_quality = COALESCE((preference_updates->>'video_quality')::TEXT, video_quality),
        analytics_enabled = COALESCE((preference_updates->>'analytics_enabled')::BOOLEAN, analytics_enabled),
        updated_at = NOW()
    WHERE user_id = input_user_id
    RETURNING * INTO new_preferences;

    -- Log each changed field
    FOR field_name IN SELECT jsonb_object_keys(preference_updates)
    LOOP
        -- Only log if value actually changed
        IF to_jsonb(old_preferences)->field_name != to_jsonb(new_preferences)->field_name THEN
            PERFORM log_settings_change(
                input_user_id,
                'display', -- Categorize by field
                field_name,
                to_jsonb(old_preferences)->field_name,
                to_jsonb(new_preferences)->field_name,
                CASE WHEN auth.uid() = input_user_id THEN 'user' ELSE 'admin' END,
                change_reason,
                request_ip,
                request_user_agent
            );
        END IF;
    END LOOP;

    -- Return updated preferences
    SELECT row_to_json(new_preferences.*) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update notification preferences with audit logging
CREATE OR REPLACE FUNCTION update_notification_preferences_with_audit(
    input_user_id UUID,
    preference_updates JSONB,
    change_reason TEXT DEFAULT NULL,
    request_ip INET DEFAULT NULL,
    request_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    old_prefs RECORD;
    new_prefs RECORD;
    field_name TEXT;
    result JSONB;
BEGIN
    -- Verify user can update these preferences
    IF auth.uid() != input_user_id AND NOT EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Cannot update notification preferences for this user';
    END IF;

    -- Get old preferences
    SELECT * INTO old_prefs FROM notification_preferences WHERE user_id = input_user_id;

    -- Update notification preferences dynamically
    UPDATE notification_preferences
    SET
        email_enabled = COALESCE((preference_updates->>'email_enabled')::BOOLEAN, email_enabled),
        email_session_reminders = COALESCE((preference_updates->>'email_session_reminders')::BOOLEAN, email_session_reminders),
        email_session_updates = COALESCE((preference_updates->>'email_session_updates')::BOOLEAN, email_session_updates),
        email_messages = COALESCE((preference_updates->>'email_messages')::BOOLEAN, email_messages),
        email_system_updates = COALESCE((preference_updates->>'email_system_updates')::BOOLEAN, email_system_updates),
        email_marketing = COALESCE((preference_updates->>'email_marketing')::BOOLEAN, email_marketing),
        inapp_enabled = COALESCE((preference_updates->>'inapp_enabled')::BOOLEAN, inapp_enabled),
        inapp_session_reminders = COALESCE((preference_updates->>'inapp_session_reminders')::BOOLEAN, inapp_session_reminders),
        inapp_session_updates = COALESCE((preference_updates->>'inapp_session_updates')::BOOLEAN, inapp_session_updates),
        inapp_messages = COALESCE((preference_updates->>'inapp_messages')::BOOLEAN, inapp_messages),
        inapp_system_updates = COALESCE((preference_updates->>'inapp_system_updates')::BOOLEAN, inapp_system_updates),
        push_enabled = COALESCE((preference_updates->>'push_enabled')::BOOLEAN, push_enabled),
        push_session_reminders = COALESCE((preference_updates->>'push_session_reminders')::BOOLEAN, push_session_reminders),
        push_messages = COALESCE((preference_updates->>'push_messages')::BOOLEAN, push_messages),
        quiet_hours_enabled = COALESCE((preference_updates->>'quiet_hours_enabled')::BOOLEAN, quiet_hours_enabled),
        quiet_hours_start = COALESCE((preference_updates->>'quiet_hours_start')::TIME, quiet_hours_start),
        quiet_hours_end = COALESCE((preference_updates->>'quiet_hours_end')::TIME, quiet_hours_end),
        timezone = COALESCE((preference_updates->>'timezone')::TEXT, timezone),
        digest_frequency = COALESCE((preference_updates->>'digest_frequency')::TEXT, digest_frequency),
        updated_at = NOW()
    WHERE user_id = input_user_id
    RETURNING * INTO new_prefs;

    -- Log each changed field
    FOR field_name IN SELECT jsonb_object_keys(preference_updates)
    LOOP
        IF to_jsonb(old_prefs)->field_name != to_jsonb(new_prefs)->field_name THEN
            PERFORM log_settings_change(
                input_user_id,
                'notification',
                field_name,
                to_jsonb(old_prefs)->field_name,
                to_jsonb(new_prefs)->field_name,
                CASE WHEN auth.uid() = input_user_id THEN 'user' ELSE 'admin' END,
                change_reason,
                request_ip,
                request_user_agent
            );
        END IF;
    END LOOP;

    SELECT row_to_json(new_prefs.*) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;
GRANT SELECT ON settings_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_preferences_with_audit TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_preferences_with_audit TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_settings_audit_history TO authenticated;

-- Add comments
COMMENT ON FUNCTION update_user_preferences_with_audit IS 'Updates user preferences with automatic audit trail logging';
COMMENT ON FUNCTION update_notification_preferences_with_audit IS 'Updates notification preferences with automatic audit trail logging';
