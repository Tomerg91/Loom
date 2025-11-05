-- Message Notifications
-- Sprint 03 - Task 2.2.4: Implement Message Notifications (3 SP)
-- Automatic notifications for new messages when users are offline

-- Function to check if user is online
CREATE OR REPLACE FUNCTION is_user_online(
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    is_online BOOLEAN;
BEGIN
    SELECT COALESCE(up.is_online, FALSE) INTO is_online
    FROM user_presence up
    WHERE up.user_id = p_user_id
    AND up.updated_at > NOW() - INTERVAL '5 minutes'; -- Consider online if updated recently

    RETURN COALESCE(is_online, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create message notification
CREATE OR REPLACE FUNCTION create_message_notification(
    p_message_id UUID,
    p_recipient_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_sender_name TEXT;
    v_message_preview TEXT;
    v_conversation_id UUID;
    v_notification_enabled BOOLEAN;
BEGIN
    -- Get message details
    SELECT
        m.conversation_id,
        u.first_name || ' ' || COALESCE(u.last_name, ''),
        CASE
            WHEN LENGTH(m.content) > 100 THEN SUBSTRING(m.content, 1, 100) || '...'
            ELSE m.content
        END
    INTO v_conversation_id, v_sender_name, v_message_preview
    FROM messages m
    INNER JOIN users u ON u.id = m.sender_id
    WHERE m.id = p_message_id;

    IF v_conversation_id IS NULL THEN
        RAISE EXCEPTION 'Message not found';
    END IF;

    -- Check if recipient has notifications enabled for this conversation
    SELECT cp.notification_enabled INTO v_notification_enabled
    FROM conversation_participants cp
    WHERE cp.conversation_id = v_conversation_id
    AND cp.user_id = p_recipient_id;

    IF NOT COALESCE(v_notification_enabled, TRUE) THEN
        -- Notifications disabled for this conversation
        RETURN NULL;
    END IF;

    -- Create notification
    INSERT INTO notifications (
        user_id,
        title,
        message,
        notification_type,
        related_entity_type,
        related_entity_id,
        priority,
        metadata
    )
    VALUES (
        p_recipient_id,
        'New message from ' || v_sender_name,
        v_message_preview,
        'new_message',
        'message',
        p_message_id,
        'normal',
        jsonb_build_object(
            'conversation_id', v_conversation_id,
            'sender_name', v_sender_name
        )
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to send notifications for new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_participant_id UUID;
    v_is_online BOOLEAN;
BEGIN
    -- For each participant in the conversation (except sender)
    FOR v_participant_id IN
        SELECT cp.user_id
        FROM conversation_participants cp
        WHERE cp.conversation_id = NEW.conversation_id
        AND cp.user_id != NEW.sender_id
    LOOP
        -- Check if user is online
        v_is_online := is_user_online(v_participant_id);

        -- Only send notification if user is offline
        IF NOT v_is_online THEN
            PERFORM create_message_notification(NEW.id, v_participant_id);
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS messages_notify_new_trigger ON messages;
CREATE TRIGGER messages_notify_new_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    WHEN (NEW.message_type = 'text' OR NEW.message_type = 'file')
    EXECUTE FUNCTION notify_new_message();

-- Function to get notification preferences for conversations
CREATE OR REPLACE FUNCTION get_user_notification_preferences(
    p_user_id UUID
)
RETURNS TABLE (
    conversation_id UUID,
    conversation_title TEXT,
    other_participant_name TEXT,
    notification_enabled BOOLEAN,
    is_archived BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS conversation_id,
        c.title AS conversation_title,
        (
            SELECT u.first_name || ' ' || COALESCE(u.last_name, '')
            FROM conversation_participants cp_other
            JOIN users u ON u.id = cp_other.user_id
            WHERE cp_other.conversation_id = c.id
            AND cp_other.user_id != p_user_id
            LIMIT 1
        ) AS other_participant_name,
        cp.notification_enabled,
        cp.is_archived
    FROM conversations c
    INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE cp.user_id = p_user_id
    ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to batch update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
    p_user_id UUID,
    p_enable_all BOOLEAN DEFAULT NULL,
    p_conversation_settings JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    conversation_setting JSONB;
    v_conversation_id UUID;
    v_enabled BOOLEAN;
BEGIN
    -- If enable_all is set, update all conversations
    IF p_enable_all IS NOT NULL THEN
        UPDATE conversation_participants
        SET notification_enabled = p_enable_all
        WHERE user_id = p_user_id;

        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RETURN updated_count;
    END IF;

    -- If conversation-specific settings provided
    IF p_conversation_settings IS NOT NULL THEN
        FOR conversation_setting IN SELECT * FROM jsonb_array_elements(p_conversation_settings)
        LOOP
            v_conversation_id := (conversation_setting->>'conversation_id')::UUID;
            v_enabled := (conversation_setting->>'enabled')::BOOLEAN;

            UPDATE conversation_participants
            SET notification_enabled = v_enabled
            WHERE user_id = p_user_id
            AND conversation_id = v_conversation_id;

            updated_count := updated_count + 1;
        END LOOP;
    END IF;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message notifications
CREATE OR REPLACE FUNCTION get_message_notifications(
    p_user_id UUID,
    p_unread_only BOOLEAN DEFAULT TRUE,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    notification_id UUID,
    title TEXT,
    message TEXT,
    conversation_id UUID,
    message_id UUID,
    sender_name TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id AS notification_id,
        n.title,
        n.message,
        (n.metadata->>'conversation_id')::UUID AS conversation_id,
        n.related_entity_id AS message_id,
        (n.metadata->>'sender_name')::TEXT AS sender_name,
        n.is_read,
        n.created_at
    FROM notifications n
    WHERE n.user_id = p_user_id
    AND n.notification_type = 'new_message'
    AND (NOT p_unread_only OR n.is_read = FALSE)
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark message notifications as read for a conversation
CREATE OR REPLACE FUNCTION mark_conversation_notifications_read(
    p_user_id UUID,
    p_conversation_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET
        is_read = TRUE,
        read_at = NOW()
    WHERE user_id = p_user_id
    AND notification_type = 'new_message'
    AND is_read = FALSE
    AND (metadata->>'conversation_id')::UUID = p_conversation_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send notification for mentioned user in message
CREATE OR REPLACE FUNCTION create_mention_notification(
    p_message_id UUID,
    p_mentioned_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_sender_name TEXT;
    v_message_preview TEXT;
    v_conversation_id UUID;
BEGIN
    -- Get message details
    SELECT
        m.conversation_id,
        u.first_name || ' ' || COALESCE(u.last_name, ''),
        CASE
            WHEN LENGTH(m.content) > 100 THEN SUBSTRING(m.content, 1, 100) || '...'
            ELSE m.content
        END
    INTO v_conversation_id, v_sender_name, v_message_preview
    FROM messages m
    INNER JOIN users u ON u.id = m.sender_id
    WHERE m.id = p_message_id;

    IF v_conversation_id IS NULL THEN
        RAISE EXCEPTION 'Message not found';
    END IF;

    -- Verify mentioned user is a participant
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = v_conversation_id
        AND user_id = p_mentioned_user_id
    ) THEN
        RETURN NULL;
    END IF;

    -- Create mention notification (always send, even if online)
    INSERT INTO notifications (
        user_id,
        title,
        message,
        notification_type,
        related_entity_type,
        related_entity_id,
        priority,
        metadata
    )
    VALUES (
        p_mentioned_user_id,
        v_sender_name || ' mentioned you',
        v_message_preview,
        'mention',
        'message',
        p_message_id,
        'high',
        jsonb_build_object(
            'conversation_id', v_conversation_id,
            'sender_name', v_sender_name
        )
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification stats
CREATE OR REPLACE FUNCTION get_notification_stats(
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_unread', (
            SELECT COUNT(*)
            FROM notifications
            WHERE user_id = p_user_id
            AND is_read = FALSE
        ),
        'unread_messages', (
            SELECT COUNT(*)
            FROM notifications
            WHERE user_id = p_user_id
            AND notification_type = 'new_message'
            AND is_read = FALSE
        ),
        'unread_mentions', (
            SELECT COUNT(*)
            FROM notifications
            WHERE user_id = p_user_id
            AND notification_type = 'mention'
            AND is_read = FALSE
        ),
        'conversations_with_unread', (
            SELECT COUNT(DISTINCT (metadata->>'conversation_id')::UUID)
            FROM notifications
            WHERE user_id = p_user_id
            AND notification_type IN ('new_message', 'mention')
            AND is_read = FALSE
        )
    ) INTO stats;

    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_user_online(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_message_notification(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_preferences(UUID, BOOLEAN, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_message_notifications(UUID, BOOLEAN, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_notifications_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_mention_notification(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_stats(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION is_user_online(UUID) IS
    'Check if user is currently online based on presence';

COMMENT ON FUNCTION create_message_notification(UUID, UUID) IS
    'Create notification for new message if user is offline';

COMMENT ON FUNCTION notify_new_message() IS
    'Trigger function to automatically send notifications for new messages';

COMMENT ON FUNCTION get_user_notification_preferences(UUID) IS
    'Get notification preferences for all conversations';

COMMENT ON FUNCTION update_notification_preferences(UUID, BOOLEAN, JSONB) IS
    'Batch update notification preferences';

COMMENT ON FUNCTION get_message_notifications(UUID, BOOLEAN, INTEGER, INTEGER) IS
    'Get message notifications for user';

COMMENT ON FUNCTION mark_conversation_notifications_read(UUID, UUID) IS
    'Mark all message notifications as read for a conversation';

COMMENT ON FUNCTION create_mention_notification(UUID, UUID) IS
    'Create notification when user is mentioned in a message';

COMMENT ON FUNCTION get_notification_stats(UUID) IS
    'Get notification statistics including unread counts';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Message notifications installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Automatic notifications for offline users';
    RAISE NOTICE '  - Notification preferences per conversation';
    RAISE NOTICE '  - Mention notifications (always sent)';
    RAISE NOTICE '  - Batch notification management';
    RAISE NOTICE '  - Notification statistics and counts';
    RAISE NOTICE '  - Integration with user presence system';
    RAISE NOTICE 'Triggers:';
    RAISE NOTICE '  - messages_notify_new_trigger: Sends notifications on new messages';
END $$;
