-- Message Features: Reactions, Attachments, Editing, Deletion
-- Sprint 03 - Task 2.2.3: Implement Message Features (5 SP)
-- Advanced messaging features for enhanced communication

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reaction_emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(message_id, user_id, reaction_emoji),
    CONSTRAINT message_reactions_valid_emoji CHECK (LENGTH(reaction_emoji) > 0 AND LENGTH(reaction_emoji) <= 10)
);

-- Create message_attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    file_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE NOT NULL,
    attachment_type TEXT NOT NULL DEFAULT 'file', -- 'file', 'image', 'video', 'document'
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT message_attachments_valid_type CHECK (attachment_type IN ('file', 'image', 'video', 'document'))
);

-- Create message_edit_history table for tracking edits
CREATE TABLE IF NOT EXISTS message_edit_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    previous_content TEXT NOT NULL,
    edited_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON message_reactions(reaction_emoji);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_file ON message_attachments(file_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_type ON message_attachments(attachment_type);

CREATE INDEX IF NOT EXISTS idx_message_edit_history_message ON message_edit_history(message_id, edited_at DESC);

-- Function to add reaction to message
CREATE OR REPLACE FUNCTION add_message_reaction(
    p_message_id UUID,
    p_user_id UUID,
    p_reaction_emoji TEXT
)
RETURNS UUID AS $$
DECLARE
    v_reaction_id UUID;
    v_conversation_id UUID;
BEGIN
    -- Verify user is a participant in the conversation
    SELECT m.conversation_id INTO v_conversation_id
    FROM messages m
    WHERE m.id = p_message_id;

    IF v_conversation_id IS NULL THEN
        RAISE EXCEPTION 'Message not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = v_conversation_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Insert reaction (or do nothing if already exists)
    INSERT INTO message_reactions (message_id, user_id, reaction_emoji)
    VALUES (p_message_id, p_user_id, p_reaction_emoji)
    ON CONFLICT (message_id, user_id, reaction_emoji) DO NOTHING
    RETURNING id INTO v_reaction_id;

    -- If reaction already existed, return the existing one
    IF v_reaction_id IS NULL THEN
        SELECT id INTO v_reaction_id
        FROM message_reactions
        WHERE message_id = p_message_id
        AND user_id = p_user_id
        AND reaction_emoji = p_reaction_emoji;
    END IF;

    RETURN v_reaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove reaction from message
CREATE OR REPLACE FUNCTION remove_message_reaction(
    p_message_id UUID,
    p_user_id UUID,
    p_reaction_emoji TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM message_reactions
    WHERE message_id = p_message_id
    AND user_id = p_user_id
    AND reaction_emoji = p_reaction_emoji;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get message reactions grouped by emoji
CREATE OR REPLACE FUNCTION get_message_reactions(
    p_message_id UUID
)
RETURNS TABLE (
    reaction_emoji TEXT,
    reaction_count INTEGER,
    users JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mr.reaction_emoji,
        COUNT(*)::INTEGER AS reaction_count,
        COALESCE(
            json_agg(json_build_object(
                'user_id', u.id,
                'user_name', u.first_name || ' ' || COALESCE(u.last_name, ''),
                'user_avatar', u.avatar_url,
                'reacted_at', mr.created_at
            ) ORDER BY mr.created_at),
            '[]'::json
        ) AS users
    FROM message_reactions mr
    INNER JOIN users u ON u.id = mr.user_id
    WHERE mr.message_id = p_message_id
    GROUP BY mr.reaction_emoji
    ORDER BY COUNT(*) DESC, mr.reaction_emoji;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add attachment to message
CREATE OR REPLACE FUNCTION add_message_attachment(
    p_message_id UUID,
    p_file_id UUID,
    p_attachment_type TEXT DEFAULT 'file',
    p_thumbnail_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_attachment_id UUID;
    v_conversation_id UUID;
    v_sender_id UUID;
BEGIN
    -- Get message details
    SELECT m.conversation_id, m.sender_id
    INTO v_conversation_id, v_sender_id
    FROM messages m
    WHERE m.id = p_message_id;

    IF v_conversation_id IS NULL THEN
        RAISE EXCEPTION 'Message not found';
    END IF;

    -- Verify file exists and belongs to sender
    IF NOT EXISTS (
        SELECT 1 FROM file_uploads
        WHERE id = p_file_id
        AND uploaded_by = v_sender_id
    ) THEN
        RAISE EXCEPTION 'File not found or does not belong to message sender';
    END IF;

    -- Insert attachment
    INSERT INTO message_attachments (
        message_id,
        file_id,
        attachment_type,
        thumbnail_url,
        metadata
    )
    VALUES (
        p_message_id,
        p_file_id,
        p_attachment_type,
        p_thumbnail_url,
        p_metadata
    )
    RETURNING id INTO v_attachment_id;

    -- Update message metadata
    UPDATE messages
    SET
        metadata = metadata || jsonb_build_object('has_attachments', true),
        updated_at = NOW()
    WHERE id = p_message_id;

    RETURN v_attachment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get message attachments
CREATE OR REPLACE FUNCTION get_message_attachments(
    p_message_id UUID
)
RETURNS TABLE (
    attachment_id UUID,
    file_id UUID,
    filename TEXT,
    file_type TEXT,
    file_size BIGINT,
    attachment_type TEXT,
    thumbnail_url TEXT,
    file_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ma.id AS attachment_id,
        fu.id AS file_id,
        fu.filename,
        fu.file_type,
        fu.file_size,
        ma.attachment_type,
        ma.thumbnail_url,
        fu.file_url,
        ma.metadata,
        ma.created_at
    FROM message_attachments ma
    INNER JOIN file_uploads fu ON fu.id = ma.file_id
    WHERE ma.message_id = p_message_id
    ORDER BY ma.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to edit message (within 5-minute window)
CREATE OR REPLACE FUNCTION edit_message(
    p_message_id UUID,
    p_user_id UUID,
    p_new_content TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_content TEXT;
    v_created_at TIMESTAMP WITH TIME ZONE;
    v_sender_id UUID;
BEGIN
    -- Get message details
    SELECT content, created_at, sender_id
    INTO v_current_content, v_created_at, v_sender_id
    FROM messages
    WHERE id = p_message_id
    AND deleted_at IS NULL;

    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Message not found or already deleted';
    END IF;

    -- Verify user is the sender
    IF v_sender_id != p_user_id THEN
        RAISE EXCEPTION 'Only the message sender can edit the message';
    END IF;

    -- Check if within 5-minute edit window
    IF v_created_at < NOW() - INTERVAL '5 minutes' THEN
        RAISE EXCEPTION 'Message can only be edited within 5 minutes of sending';
    END IF;

    -- Validate new content
    IF LENGTH(TRIM(p_new_content)) = 0 THEN
        RAISE EXCEPTION 'Message content cannot be empty';
    END IF;

    -- Save edit history
    INSERT INTO message_edit_history (message_id, previous_content, edited_by)
    VALUES (p_message_id, v_current_content, p_user_id);

    -- Update message
    UPDATE messages
    SET
        content = p_new_content,
        edited_at = NOW(),
        updated_at = NOW()
    WHERE id = p_message_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete message (soft delete)
CREATE OR REPLACE FUNCTION delete_message(
    p_message_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_sender_id UUID;
    v_conversation_id UUID;
BEGIN
    -- Get message details
    SELECT sender_id, conversation_id
    INTO v_sender_id, v_conversation_id
    FROM messages
    WHERE id = p_message_id
    AND deleted_at IS NULL;

    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Message not found or already deleted';
    END IF;

    -- Verify user is the sender
    IF v_sender_id != p_user_id THEN
        RAISE EXCEPTION 'Only the message sender can delete the message';
    END IF;

    -- Soft delete the message
    UPDATE messages
    SET
        deleted_at = NOW(),
        content = '[Message deleted]',
        updated_at = NOW()
    WHERE id = p_message_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get message edit history
CREATE OR REPLACE FUNCTION get_message_edit_history(
    p_message_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    edit_id UUID,
    previous_content TEXT,
    edited_by_id UUID,
    edited_by_name TEXT,
    edited_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Get conversation ID and verify user is a participant
    SELECT m.conversation_id INTO v_conversation_id
    FROM messages m
    WHERE m.id = p_message_id;

    IF v_conversation_id IS NULL THEN
        RAISE EXCEPTION 'Message not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = v_conversation_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    RETURN QUERY
    SELECT
        meh.id AS edit_id,
        meh.previous_content,
        meh.edited_by AS edited_by_id,
        (u.first_name || ' ' || COALESCE(u.last_name, ''))::TEXT AS edited_by_name,
        meh.edited_at
    FROM message_edit_history meh
    INNER JOIN users u ON u.id = meh.edited_by
    WHERE meh.message_id = p_message_id
    ORDER BY meh.edited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send message with attachments in one transaction
CREATE OR REPLACE FUNCTION send_message_with_attachments(
    p_conversation_id UUID,
    p_sender_id UUID,
    p_content TEXT,
    p_file_ids UUID[] DEFAULT NULL,
    p_message_type TEXT DEFAULT 'text',
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSON AS $$
DECLARE
    v_message_id UUID;
    v_attachment_id UUID;
    v_file_id UUID;
    result JSON;
BEGIN
    -- Send the message
    v_message_id := send_message(
        p_conversation_id,
        p_sender_id,
        p_content,
        p_message_type,
        p_metadata
    );

    -- Add attachments if provided
    IF p_file_ids IS NOT NULL AND array_length(p_file_ids, 1) > 0 THEN
        FOREACH v_file_id IN ARRAY p_file_ids
        LOOP
            -- Get file type to determine attachment type
            DECLARE
                v_file_type TEXT;
                v_attachment_type TEXT;
            BEGIN
                SELECT file_type INTO v_file_type
                FROM file_uploads
                WHERE id = v_file_id;

                -- Determine attachment type based on file type
                v_attachment_type := CASE
                    WHEN v_file_type LIKE 'image/%' THEN 'image'
                    WHEN v_file_type LIKE 'video/%' THEN 'video'
                    WHEN v_file_type IN ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') THEN 'document'
                    ELSE 'file'
                END;

                v_attachment_id := add_message_attachment(
                    v_message_id,
                    v_file_id,
                    v_attachment_type
                );
            END;
        END LOOP;
    END IF;

    -- Return message with attachments
    SELECT json_build_object(
        'message_id', v_message_id,
        'content', p_content,
        'attachments', (
            SELECT COALESCE(json_agg(json_build_object(
                'attachment_id', attachment_id,
                'file_id', file_id,
                'filename', filename,
                'file_type', file_type,
                'attachment_type', attachment_type
            )), '[]'::json)
            FROM get_message_attachments(v_message_id)
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get messages with reactions and attachments
CREATE OR REPLACE FUNCTION get_messages_with_features(
    p_conversation_id UUID,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    content TEXT,
    sender_id UUID,
    sender_name TEXT,
    sender_avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    reactions JSON,
    attachments JSON,
    has_edits BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id AS message_id,
        CASE
            WHEN m.deleted_at IS NOT NULL THEN '[Message deleted]'
            ELSE m.content
        END AS content,
        m.sender_id,
        (u.first_name || ' ' || COALESCE(u.last_name, ''))::TEXT AS sender_name,
        u.avatar_url AS sender_avatar,
        m.created_at,
        m.edited_at,
        m.deleted_at,

        -- Reactions
        (
            SELECT COALESCE(json_agg(json_build_object(
                'emoji', reaction_emoji,
                'count', reaction_count,
                'users', users
            )), '[]'::json)
            FROM get_message_reactions(m.id)
        ) AS reactions,

        -- Attachments
        (
            SELECT COALESCE(json_agg(json_build_object(
                'id', attachment_id,
                'file_id', file_id,
                'filename', filename,
                'file_type', file_type,
                'attachment_type', attachment_type,
                'thumbnail_url', thumbnail_url,
                'file_url', file_url
            )), '[]'::json)
            FROM get_message_attachments(m.id)
        ) AS attachments,

        -- Has edit history
        EXISTS (
            SELECT 1 FROM message_edit_history
            WHERE message_id = m.id
        ) AS has_edits

    FROM messages m
    INNER JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = p_conversation_id
    AND (p_before_timestamp IS NULL OR m.created_at < p_before_timestamp)
    AND EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = p_conversation_id
        AND cp.user_id = p_user_id
    )
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions in their conversations
CREATE POLICY message_reactions_select_participant ON message_reactions
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

-- Users can add reactions to messages in their conversations
CREATE POLICY message_reactions_insert_participant ON message_reactions
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM messages m
            JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
            WHERE m.id = message_id
            AND cp.user_id = auth.uid()
        )
    );

-- Users can delete their own reactions
CREATE POLICY message_reactions_delete_own ON message_reactions
    FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for message_attachments
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments in their conversations
CREATE POLICY message_attachments_select_participant ON message_attachments
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

-- RLS Policies for message_edit_history
ALTER TABLE message_edit_history ENABLE ROW LEVEL SECURITY;

-- Users can view edit history in their conversations
CREATE POLICY message_edit_history_select_participant ON message_edit_history
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_message_reaction(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_message_reaction(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_message_reactions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_message_attachment(UUID, UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_message_attachments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION edit_message(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_message(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_message_edit_history(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_message_with_attachments(UUID, UUID, TEXT, UUID[], TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_messages_with_features(UUID, UUID, INTEGER, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE message_reactions IS 'Emoji reactions to messages';
COMMENT ON TABLE message_attachments IS 'File attachments linked to messages';
COMMENT ON TABLE message_edit_history IS 'History of message edits for audit trail';

COMMENT ON FUNCTION add_message_reaction(UUID, UUID, TEXT) IS
    'Add emoji reaction to a message';

COMMENT ON FUNCTION remove_message_reaction(UUID, UUID, TEXT) IS
    'Remove emoji reaction from a message';

COMMENT ON FUNCTION get_message_reactions(UUID) IS
    'Get all reactions for a message grouped by emoji';

COMMENT ON FUNCTION add_message_attachment(UUID, UUID, TEXT, TEXT, JSONB) IS
    'Add file attachment to a message';

COMMENT ON FUNCTION get_message_attachments(UUID) IS
    'Get all attachments for a message';

COMMENT ON FUNCTION edit_message(UUID, UUID, TEXT) IS
    'Edit message content (within 5-minute window)';

COMMENT ON FUNCTION delete_message(UUID, UUID) IS
    'Soft delete a message';

COMMENT ON FUNCTION get_message_edit_history(UUID, UUID) IS
    'Get edit history for a message';

COMMENT ON FUNCTION send_message_with_attachments(UUID, UUID, TEXT, UUID[], TEXT, JSONB) IS
    'Send message with file attachments in one transaction';

COMMENT ON FUNCTION get_messages_with_features(UUID, UUID, INTEGER, TIMESTAMP WITH TIME ZONE) IS
    'Get messages with reactions and attachments included';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Message features installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Emoji reactions with user tracking';
    RAISE NOTICE '  - File attachments (images, videos, documents)';
    RAISE NOTICE '  - Message editing (5-minute window)';
    RAISE NOTICE '  - Message deletion (soft delete)';
    RAISE NOTICE '  - Edit history tracking';
    RAISE NOTICE '  - Send messages with attachments in one call';
    RAISE NOTICE '  - Comprehensive message queries with all features';
END $$;
