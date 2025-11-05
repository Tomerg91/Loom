-- Real-Time Chat Interface
-- Sprint 03 - Task 2.2.2: Implement Real-Time Chat Interface (8 SP)
-- Support for real-time message delivery with Supabase Realtime

-- Create enum for message delivery status
CREATE TYPE message_delivery_status AS ENUM ('sending', 'sent', 'delivered', 'read', 'failed');

-- Add delivery status to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS delivery_status message_delivery_status DEFAULT 'sent';

-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS typing_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    is_typing BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(conversation_id, user_id)
);

-- Create user_presence table for online/offline status
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id, is_typing);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_updated ON typing_indicators(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence(is_online, last_seen_at);

-- Function to get message history with pagination
CREATE OR REPLACE FUNCTION get_message_history(
    p_conversation_id UUID,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_after_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    content TEXT,
    message_type TEXT,
    delivery_status message_delivery_status,
    sender_id UUID,
    sender_name TEXT,
    sender_avatar TEXT,
    is_own_message BOOLEAN,
    parent_message_id UUID,
    parent_message_content TEXT,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    read_by_count INTEGER,
    is_read BOOLEAN
) AS $$
DECLARE
    is_participant BOOLEAN;
BEGIN
    -- Verify user is a participant
    SELECT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
    ) INTO is_participant;

    IF NOT is_participant THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    RETURN QUERY
    SELECT
        m.id AS message_id,
        CASE
            WHEN m.deleted_at IS NOT NULL THEN '[Message deleted]'
            ELSE m.content
        END AS content,
        m.message_type,
        m.delivery_status,
        m.sender_id,
        (u.first_name || ' ' || COALESCE(u.last_name, ''))::TEXT AS sender_name,
        u.avatar_url AS sender_avatar,
        (m.sender_id = p_user_id) AS is_own_message,
        m.parent_message_id,
        (
            SELECT pm.content
            FROM messages pm
            WHERE pm.id = m.parent_message_id
            AND pm.deleted_at IS NULL
        ) AS parent_message_content,
        m.edited_at,
        m.deleted_at,
        m.metadata,
        m.created_at,
        (
            SELECT COUNT(*)::INTEGER
            FROM message_read_receipts mrr
            WHERE mrr.message_id = m.id
        ) AS read_by_count,
        EXISTS (
            SELECT 1 FROM message_read_receipts mrr
            WHERE mrr.message_id = m.id
            AND mrr.user_id = p_user_id
        ) AS is_read

    FROM messages m
    INNER JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = p_conversation_id
    AND (p_before_timestamp IS NULL OR m.created_at < p_before_timestamp)
    AND (p_after_timestamp IS NULL OR m.created_at > p_after_timestamp)
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update message delivery status
CREATE OR REPLACE FUNCTION update_message_delivery_status(
    p_message_id UUID,
    p_status message_delivery_status
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE messages
    SET
        delivery_status = p_status,
        updated_at = NOW()
    WHERE id = p_message_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as delivered
CREATE OR REPLACE FUNCTION mark_messages_delivered(
    p_conversation_id UUID,
    p_user_id UUID,
    p_up_to_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Verify user is a participant
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Update messages to delivered
    UPDATE messages
    SET delivery_status = 'delivered'
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND created_at <= p_up_to_timestamp
    AND delivery_status IN ('sending', 'sent');

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read (updates both read receipts and delivery status)
CREATE OR REPLACE FUNCTION mark_messages_read(
    p_conversation_id UUID,
    p_user_id UUID,
    p_up_to_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
    message_ids UUID[];
BEGIN
    -- Verify user is a participant
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Get message IDs to mark as read
    SELECT ARRAY_AGG(id) INTO message_ids
    FROM messages
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND created_at <= p_up_to_timestamp
    AND deleted_at IS NULL;

    -- Insert read receipts (ignore duplicates)
    INSERT INTO message_read_receipts (message_id, user_id, read_at)
    SELECT unnest(message_ids), p_user_id, NOW()
    ON CONFLICT (message_id, user_id) DO NOTHING;

    -- Update message delivery status
    UPDATE messages
    SET delivery_status = 'read'
    WHERE id = ANY(message_ids)
    AND delivery_status != 'read';

    -- Update conversation last_read_at
    UPDATE conversation_participants
    SET last_read_at = p_up_to_timestamp
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update typing indicator
CREATE OR REPLACE FUNCTION update_typing_indicator(
    p_conversation_id UUID,
    p_user_id UUID,
    p_is_typing BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    -- Verify user is a participant
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    IF p_is_typing THEN
        -- Upsert typing indicator
        INSERT INTO typing_indicators (conversation_id, user_id, is_typing, updated_at)
        VALUES (p_conversation_id, p_user_id, TRUE, NOW())
        ON CONFLICT (conversation_id, user_id)
        DO UPDATE SET
            is_typing = TRUE,
            updated_at = NOW();
    ELSE
        -- Remove or set to false
        UPDATE typing_indicators
        SET
            is_typing = FALSE,
            updated_at = NOW()
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get who is currently typing in a conversation
CREATE OR REPLACE FUNCTION get_typing_users(
    p_conversation_id UUID,
    p_exclude_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_avatar TEXT,
    started_typing_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ti.user_id,
        (u.first_name || ' ' || COALESCE(u.last_name, ''))::TEXT AS user_name,
        u.avatar_url AS user_avatar,
        ti.updated_at AS started_typing_at
    FROM typing_indicators ti
    INNER JOIN users u ON u.id = ti.user_id
    WHERE ti.conversation_id = p_conversation_id
    AND ti.is_typing = TRUE
    AND (p_exclude_user_id IS NULL OR ti.user_id != p_exclude_user_id)
    AND ti.updated_at > NOW() - INTERVAL '5 seconds' -- Only show recent typing
    ORDER BY ti.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(
    p_user_id UUID,
    p_is_online BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_presence (user_id, is_online, last_seen_at, updated_at)
    VALUES (p_user_id, p_is_online, NOW(), NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        is_online = p_is_online,
        last_seen_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user presence status
CREATE OR REPLACE FUNCTION get_user_presence_status(
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    presence_status JSON;
BEGIN
    SELECT json_build_object(
        'is_online', COALESCE(up.is_online, FALSE),
        'last_seen_at', up.last_seen_at
    ) INTO presence_status
    FROM user_presence up
    WHERE up.user_id = p_user_id;

    -- If no record, user is offline
    IF presence_status IS NULL THEN
        presence_status := json_build_object(
            'is_online', FALSE,
            'last_seen_at', NULL
        );
    END IF;

    RETURN presence_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get presence for multiple users
CREATE OR REPLACE FUNCTION get_users_presence_status(
    p_user_ids UUID[]
)
RETURNS TABLE (
    user_id UUID,
    is_online BOOLEAN,
    last_seen_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id AS user_id,
        COALESCE(up.is_online, FALSE) AS is_online,
        up.last_seen_at
    FROM users u
    LEFT JOIN user_presence up ON up.user_id = u.id
    WHERE u.id = ANY(p_user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup stale typing indicators (called by cron)
CREATE OR REPLACE FUNCTION cleanup_stale_typing_indicators()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Remove typing indicators older than 10 seconds
    DELETE FROM typing_indicators
    WHERE updated_at < NOW() - INTERVAL '10 seconds';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation with realtime status
CREATE OR REPLACE FUNCTION get_conversation_realtime_status(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    realtime_status JSON;
BEGIN
    -- Verify user is a participant
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    SELECT json_build_object(
        'conversation_id', p_conversation_id,
        'typing_users', (
            SELECT COALESCE(json_agg(json_build_object(
                'user_id', user_id,
                'user_name', user_name,
                'user_avatar', user_avatar
            )), '[]'::json)
            FROM get_typing_users(p_conversation_id, p_user_id)
        ),
        'participants_presence', (
            SELECT COALESCE(json_agg(json_build_object(
                'user_id', cp.user_id,
                'is_online', COALESCE(up.is_online, FALSE),
                'last_seen_at', up.last_seen_at
            )), '[]'::json)
            FROM conversation_participants cp
            LEFT JOIN user_presence up ON up.user_id = cp.user_id
            WHERE cp.conversation_id = p_conversation_id
            AND cp.user_id != p_user_id
        ),
        'unread_count', (
            SELECT COUNT(*)
            FROM messages m
            JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
            WHERE m.conversation_id = p_conversation_id
            AND m.created_at > cp.last_read_at
            AND m.sender_id != p_user_id
            AND m.deleted_at IS NULL
            AND cp.user_id = p_user_id
        ),
        'total_messages', (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.conversation_id = p_conversation_id
            AND m.deleted_at IS NULL
        )
    ) INTO realtime_status;

    RETURN realtime_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically mark user as offline when they leave
CREATE OR REPLACE FUNCTION auto_update_presence_on_disconnect()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called by Supabase Realtime on disconnect
    -- For now, we'll rely on client-side heartbeat
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup of stale typing indicators
SELECT cron.schedule(
    'cleanup-stale-typing-indicators',
    '*/1 * * * *', -- Every minute
    $$SELECT cleanup_stale_typing_indicators();$$
);

-- RLS Policies for typing_indicators
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Users can view typing indicators in their conversations
CREATE POLICY typing_indicators_select_participant ON typing_indicators
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- Users can insert/update their own typing indicators
CREATE POLICY typing_indicators_upsert_own ON typing_indicators
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_presence
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view presence
CREATE POLICY user_presence_select_all ON user_presence
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- Users can update their own presence
CREATE POLICY user_presence_upsert_own ON user_presence
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_message_history(UUID, UUID, INTEGER, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_message_delivery_status(UUID, message_delivery_status) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_delivered(UUID, UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID, UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_typing_indicator(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_typing_users(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_presence(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_presence_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_presence_status(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_typing_indicators() TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_realtime_status(UUID, UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE typing_indicators IS 'Real-time typing indicators for conversations';
COMMENT ON TABLE user_presence IS 'User online/offline presence tracking';

COMMENT ON FUNCTION get_message_history(UUID, UUID, INTEGER, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS
    'Get paginated message history with read status and sender info';

COMMENT ON FUNCTION update_message_delivery_status(UUID, message_delivery_status) IS
    'Update message delivery status (sending, sent, delivered, read, failed)';

COMMENT ON FUNCTION mark_messages_delivered(UUID, UUID, TIMESTAMP WITH TIME ZONE) IS
    'Mark messages as delivered when user receives them';

COMMENT ON FUNCTION mark_messages_read(UUID, UUID, TIMESTAMP WITH TIME ZONE) IS
    'Mark messages as read and create read receipts';

COMMENT ON FUNCTION update_typing_indicator(UUID, UUID, BOOLEAN) IS
    'Update typing indicator status for real-time display';

COMMENT ON FUNCTION get_typing_users(UUID, UUID) IS
    'Get list of users currently typing in conversation';

COMMENT ON FUNCTION update_user_presence(UUID, BOOLEAN) IS
    'Update user online/offline status';

COMMENT ON FUNCTION get_user_presence_status(UUID) IS
    'Get presence status for a single user';

COMMENT ON FUNCTION get_users_presence_status(UUID[]) IS
    'Get presence status for multiple users';

COMMENT ON FUNCTION get_conversation_realtime_status(UUID, UUID) IS
    'Get comprehensive realtime status including typing and presence';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Real-time chat interface installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Message history with pagination';
    RAISE NOTICE '  - Delivery status tracking (sending, sent, delivered, read, failed)';
    RAISE NOTICE '  - Real-time typing indicators';
    RAISE NOTICE '  - User presence (online/offline)';
    RAISE NOTICE '  - Read receipts with detailed tracking';
    RAISE NOTICE '  - Automatic cleanup of stale typing indicators';
    RAISE NOTICE '  - Comprehensive realtime status queries';
    RAISE NOTICE 'Ready for Supabase Realtime subscription in frontend';
    RAISE NOTICE 'Subscribe to: postgres_changes on messages table';
    RAISE NOTICE 'Broadcast: typing_indicators via channel events';
END $$;
