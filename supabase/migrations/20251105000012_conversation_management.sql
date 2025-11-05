-- Conversation Management System
-- Sprint 03 - Task 2.2.1: Implement Conversation Management (5 SP)
-- Foundation for real-time messaging between coaches and clients

-- Create enum for conversation status
CREATE TYPE conversation_status AS ENUM ('active', 'archived', 'deleted');

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    conversation_type TEXT NOT NULL DEFAULT 'direct', -- 'direct', 'group' (for future)
    status conversation_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT conversations_valid_type CHECK (conversation_type IN ('direct', 'group'))
);

-- Create conversation_participants table (many-to-many)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE,
    notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'system'
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- For threading
    metadata JSONB DEFAULT '{}'::JSONB, -- For attachments, reactions, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT messages_valid_type CHECK (message_type IN ('text', 'file', 'system')),
    CONSTRAINT messages_content_required CHECK (LENGTH(content) > 0),
    CONSTRAINT messages_no_self_parent CHECK (id != parent_message_id)
);

-- Create message_read_receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(message_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_last_read ON conversation_participants(last_read_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user ON message_read_receipts(user_id);

-- Function to create or get existing direct conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(
    p_user1_id UUID,
    p_user2_id UUID,
    p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Check if conversation already exists between these two users
    SELECT c.id INTO v_conversation_id
    FROM conversations c
    WHERE c.conversation_type = 'direct'
    AND c.status = 'active'
    AND EXISTS (
        SELECT 1 FROM conversation_participants cp1
        WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user1_id
    )
    AND EXISTS (
        SELECT 1 FROM conversation_participants cp2
        WHERE cp2.conversation_id = c.id AND cp2.user_id = p_user2_id
    )
    AND (
        SELECT COUNT(*) FROM conversation_participants cp
        WHERE cp.conversation_id = c.id
    ) = 2
    LIMIT 1;

    -- If exists, return it
    IF v_conversation_id IS NOT NULL THEN
        RETURN v_conversation_id;
    END IF;

    -- Otherwise, create new conversation
    INSERT INTO conversations (created_by, conversation_type, title)
    VALUES (p_user1_id, 'direct', p_title)
    RETURNING id INTO v_conversation_id;

    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES
        (v_conversation_id, p_user1_id),
        (v_conversation_id, p_user2_id);

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's conversation list with unread counts
CREATE OR REPLACE FUNCTION get_user_conversations(
    p_user_id UUID,
    p_include_archived BOOLEAN DEFAULT FALSE,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    conversation_id UUID,
    title TEXT,
    conversation_type TEXT,
    status conversation_status,
    is_archived BOOLEAN,
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_content TEXT,
    last_message_sender_id UUID,
    last_message_sender_name TEXT,
    unread_count INTEGER,
    participant_count INTEGER,
    other_participant_id UUID,
    other_participant_name TEXT,
    other_participant_avatar TEXT,
    notification_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS conversation_id,
        c.title,
        c.conversation_type,
        c.status,
        cp.is_archived,
        c.last_message_at,

        -- Last message info
        (
            SELECT m.content
            FROM messages m
            WHERE m.conversation_id = c.id
            AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT 1
        ) AS last_message_content,

        (
            SELECT m.sender_id
            FROM messages m
            WHERE m.conversation_id = c.id
            AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT 1
        ) AS last_message_sender_id,

        (
            SELECT u.first_name || ' ' || COALESCE(u.last_name, '')
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.conversation_id = c.id
            AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT 1
        ) AS last_message_sender_name,

        -- Unread count
        (
            SELECT COUNT(*)::INTEGER
            FROM messages m
            WHERE m.conversation_id = c.id
            AND m.created_at > cp.last_read_at
            AND m.sender_id != p_user_id
            AND m.deleted_at IS NULL
        ) AS unread_count,

        -- Participant count
        (
            SELECT COUNT(*)::INTEGER
            FROM conversation_participants cp2
            WHERE cp2.conversation_id = c.id
        ) AS participant_count,

        -- Other participant info (for direct conversations)
        (
            SELECT cp_other.user_id
            FROM conversation_participants cp_other
            WHERE cp_other.conversation_id = c.id
            AND cp_other.user_id != p_user_id
            LIMIT 1
        ) AS other_participant_id,

        (
            SELECT u.first_name || ' ' || COALESCE(u.last_name, '')
            FROM conversation_participants cp_other
            JOIN users u ON u.id = cp_other.user_id
            WHERE cp_other.conversation_id = c.id
            AND cp_other.user_id != p_user_id
            LIMIT 1
        ) AS other_participant_name,

        (
            SELECT u.avatar_url
            FROM conversation_participants cp_other
            JOIN users u ON u.id = cp_other.user_id
            WHERE cp_other.conversation_id = c.id
            AND cp_other.user_id != p_user_id
            LIMIT 1
        ) AS other_participant_avatar,

        cp.notification_enabled

    FROM conversations c
    INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE cp.user_id = p_user_id
    AND c.status = 'active'
    AND (p_include_archived OR cp.is_archived = FALSE)
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send a message
CREATE OR REPLACE FUNCTION send_message(
    p_conversation_id UUID,
    p_sender_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
    v_is_participant BOOLEAN;
BEGIN
    -- Verify sender is a participant
    SELECT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_sender_id
    ) INTO v_is_participant;

    IF NOT v_is_participant THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Insert message
    INSERT INTO messages (conversation_id, sender_id, content, message_type, metadata)
    VALUES (p_conversation_id, p_sender_id, p_content, p_message_type, p_metadata)
    RETURNING id INTO v_message_id;

    -- Update conversation last_message_at
    UPDATE conversations
    SET last_message_at = NOW(),
        updated_at = NOW()
    WHERE id = p_conversation_id;

    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
    p_conversation_id UUID,
    p_user_id UUID,
    p_read_until TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
    -- Update participant's last_read_at
    UPDATE conversation_participants
    SET last_read_at = p_read_until
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
    AND last_read_at < p_read_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive/unarchive conversation
CREATE OR REPLACE FUNCTION toggle_conversation_archive(
    p_conversation_id UUID,
    p_user_id UUID,
    p_is_archived BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE conversation_participants
    SET is_archived = p_is_archived
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle conversation notifications
CREATE OR REPLACE FUNCTION toggle_conversation_notifications(
    p_conversation_id UUID,
    p_user_id UUID,
    p_enabled BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE conversation_participants
    SET notification_enabled = p_enabled
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation details
CREATE OR REPLACE FUNCTION get_conversation_detail(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    conversation_detail JSON;
    is_participant BOOLEAN;
BEGIN
    -- Check if user is participant
    SELECT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
    ) INTO is_participant;

    IF NOT is_participant THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Build conversation detail JSON
    SELECT json_build_object(
        'conversation', json_build_object(
            'id', c.id,
            'title', c.title,
            'conversation_type', c.conversation_type,
            'status', c.status,
            'last_message_at', c.last_message_at,
            'created_at', c.created_at
        ),

        'participants', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', u.id,
                'name', u.first_name || ' ' || COALESCE(u.last_name, ''),
                'email', u.email,
                'avatar_url', u.avatar_url,
                'role', u.role,
                'joined_at', cp.joined_at,
                'last_read_at', cp.last_read_at
            ) ORDER BY cp.joined_at), '[]'::json)
            FROM conversation_participants cp
            JOIN users u ON u.id = cp.user_id
            WHERE cp.conversation_id = c.id
        ),

        'user_settings', (
            SELECT json_build_object(
                'is_archived', cp.is_archived,
                'notification_enabled', cp.notification_enabled,
                'last_read_at', cp.last_read_at,
                'unread_count', (
                    SELECT COUNT(*)
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    AND m.created_at > cp.last_read_at
                    AND m.sender_id != p_user_id
                    AND m.deleted_at IS NULL
                )
            )
            FROM conversation_participants cp
            WHERE cp.conversation_id = c.id
            AND cp.user_id = p_user_id
        ),

        'stats', json_build_object(
            'total_messages', (
                SELECT COUNT(*)
                FROM messages m
                WHERE m.conversation_id = c.id
                AND m.deleted_at IS NULL
            ),
            'participant_count', (
                SELECT COUNT(*)
                FROM conversation_participants cp
                WHERE cp.conversation_id = c.id
            )
        )

    ) INTO conversation_detail
    FROM conversations c
    WHERE c.id = p_conversation_id;

    RETURN conversation_detail;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search conversations
CREATE OR REPLACE FUNCTION search_conversations(
    p_user_id UUID,
    p_search_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    conversation_id UUID,
    title TEXT,
    other_participant_name TEXT,
    other_participant_avatar TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS conversation_id,
        c.title,
        (
            SELECT u.first_name || ' ' || COALESCE(u.last_name, '')
            FROM conversation_participants cp_other
            JOIN users u ON u.id = cp_other.user_id
            WHERE cp_other.conversation_id = c.id
            AND cp_other.user_id != p_user_id
            LIMIT 1
        ) AS other_participant_name,
        (
            SELECT u.avatar_url
            FROM conversation_participants cp_other
            JOIN users u ON u.id = cp_other.user_id
            WHERE cp_other.conversation_id = c.id
            AND cp_other.user_id != p_user_id
            LIMIT 1
        ) AS other_participant_avatar,
        c.last_message_at,
        (
            SELECT COUNT(*)::INTEGER
            FROM messages m
            JOIN conversation_participants cp ON cp.conversation_id = c.id
            WHERE m.conversation_id = c.id
            AND m.created_at > cp.last_read_at
            AND m.sender_id != p_user_id
            AND m.deleted_at IS NULL
            AND cp.user_id = p_user_id
        ) AS unread_count
    FROM conversations c
    INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE cp.user_id = p_user_id
    AND c.status = 'active'
    AND (
        -- Search in conversation title
        c.title ILIKE '%' || p_search_query || '%'
        OR
        -- Search in other participant's name
        EXISTS (
            SELECT 1
            FROM conversation_participants cp_search
            JOIN users u ON u.id = cp_search.user_id
            WHERE cp_search.conversation_id = c.id
            AND cp_search.user_id != p_user_id
            AND (
                u.first_name ILIKE '%' || p_search_query || '%'
                OR u.last_name ILIKE '%' || p_search_query || '%'
                OR u.email ILIKE '%' || p_search_query || '%'
            )
        )
    )
    ORDER BY c.last_message_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count across all conversations
CREATE OR REPLACE FUNCTION get_total_unread_count(
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    total_unread INTEGER;
BEGIN
    SELECT COALESCE(SUM(
        (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.conversation_id = cp.conversation_id
            AND m.created_at > cp.last_read_at
            AND m.sender_id != p_user_id
            AND m.deleted_at IS NULL
        )
    ), 0)::INTEGER INTO total_unread
    FROM conversation_participants cp
    WHERE cp.user_id = p_user_id
    AND cp.is_archived = FALSE;

    RETURN total_unread;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversations updated_at
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at_trigger
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversations_updated_at();

-- Trigger to update messages updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_updated_at_trigger
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_messages_updated_at();

-- RLS Policies for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can view conversations they're part of
CREATE POLICY conversations_select_participant ON conversations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = id
            AND cp.user_id = auth.uid()
        )
    );

-- Users can create conversations
CREATE POLICY conversations_insert_own ON conversations
    FOR INSERT
    WITH CHECK (created_by = auth.uid());

-- Users can update conversations they created (e.g., change title)
CREATE POLICY conversations_update_creator ON conversations
    FOR UPDATE
    USING (created_by = auth.uid());

-- RLS Policies for conversation_participants
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Users can view participants in their conversations
CREATE POLICY conversation_participants_select_own ON conversation_participants
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- System can insert participants (via functions)
CREATE POLICY conversation_participants_insert_system ON conversation_participants
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND c.created_by = auth.uid()
        )
    );

-- Users can update their own participant settings
CREATE POLICY conversation_participants_update_own ON conversation_participants
    FOR UPDATE
    USING (user_id = auth.uid());

-- RLS Policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their conversations
CREATE POLICY messages_select_participant ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- Users can insert messages in their conversations
CREATE POLICY messages_insert_participant ON messages
    FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- Users can update their own messages (for editing)
CREATE POLICY messages_update_own ON messages
    FOR UPDATE
    USING (sender_id = auth.uid());

-- Users can soft delete their own messages
CREATE POLICY messages_delete_own ON messages
    FOR UPDATE
    USING (sender_id = auth.uid() AND deleted_at IS NULL)
    WITH CHECK (deleted_at IS NOT NULL);

-- RLS Policies for message_read_receipts
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Users can view read receipts for messages in their conversations
CREATE POLICY message_read_receipts_select_participant ON message_read_receipts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM messages m
            JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
            WHERE m.id = message_id
            AND cp.user_id = auth.uid()
        )
    );

-- Users can create their own read receipts
CREATE POLICY message_read_receipts_insert_own ON message_read_receipts
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_direct_conversation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(UUID, BOOLEAN, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION send_message(UUID, UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID, UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_conversation_archive(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_conversation_notifications(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_detail(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_conversations(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_unread_count(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE conversations IS 'Conversations between users (direct or group)';
COMMENT ON TABLE conversation_participants IS 'Users participating in conversations with read tracking';
COMMENT ON TABLE messages IS 'Messages sent in conversations';
COMMENT ON TABLE message_read_receipts IS 'Read receipts for messages';

COMMENT ON FUNCTION get_or_create_direct_conversation(UUID, UUID, TEXT) IS
    'Get existing or create new direct conversation between two users';

COMMENT ON FUNCTION get_user_conversations(UUID, BOOLEAN, INTEGER, INTEGER) IS
    'Get user conversation list with unread counts and last message preview';

COMMENT ON FUNCTION send_message(UUID, UUID, TEXT, TEXT, JSONB) IS
    'Send a message in a conversation with validation';

COMMENT ON FUNCTION mark_conversation_read(UUID, UUID, TIMESTAMP WITH TIME ZONE) IS
    'Mark conversation as read up to a specific timestamp';

COMMENT ON FUNCTION toggle_conversation_archive(UUID, UUID, BOOLEAN) IS
    'Archive or unarchive a conversation for a user';

COMMENT ON FUNCTION toggle_conversation_notifications(UUID, UUID, BOOLEAN) IS
    'Enable or disable notifications for a conversation';

COMMENT ON FUNCTION get_conversation_detail(UUID, UUID) IS
    'Get comprehensive conversation details with participants and settings';

COMMENT ON FUNCTION search_conversations(UUID, TEXT, INTEGER) IS
    'Search user conversations by title or participant name';

COMMENT ON FUNCTION get_total_unread_count(UUID) IS
    'Get total unread message count across all conversations';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Conversation management system installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Direct conversations with automatic deduplication';
    RAISE NOTICE '  - Conversation list with unread counts';
    RAISE NOTICE '  - Message sending with participant validation';
    RAISE NOTICE '  - Read tracking and receipts';
    RAISE NOTICE '  - Archive and notification settings';
    RAISE NOTICE '  - Conversation search';
    RAISE NOTICE '  - Comprehensive RLS policies';
    RAISE NOTICE 'Ready for real-time chat integration (Task 2.2.2)';
END $$;
