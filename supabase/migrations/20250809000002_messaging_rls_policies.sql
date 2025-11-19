-- Enable RLS on all messaging tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Users can only see conversations they are participants in
CREATE POLICY "Users can view conversations they participate in" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversations.id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
    );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update conversations they created or participate in
CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversations.id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
    );

-- Admins can manage all conversations
CREATE POLICY "Admins can manage all conversations" ON conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for conversation_participants
-- Users can view participants of conversations they're in
CREATE POLICY "Users can view participants of their conversations" ON conversation_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
    );

-- Users can join conversations (coaches can add clients, clients can message coaches)
CREATE POLICY "Users can join appropriate conversations" ON conversation_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        -- Coaches can add clients to conversations
        (EXISTS (
            SELECT 1 FROM users u1, users u2, sessions s
            WHERE u1.id = auth.uid() AND u1.role = 'coach'
            AND u2.id = conversation_participants.user_id AND u2.role = 'client'
            AND (s.coach_id = u1.id AND s.client_id = u2.id)
        )) OR
        -- Clients can join conversations with their coaches
        (EXISTS (
            SELECT 1 FROM users u1, users u2, sessions s
            WHERE u1.id = auth.uid() AND u1.role = 'client'
            AND u2.id IN (
                SELECT cp.user_id FROM conversation_participants cp
                WHERE cp.conversation_id = conversation_participants.conversation_id
                AND cp.user_id != auth.uid()
            ) AND u2.role = 'coach'
            AND (s.coach_id = u2.id AND s.client_id = u1.id)
        ))
    );

-- Users can update their own participation
CREATE POLICY "Users can update their own participation" ON conversation_participants
    FOR UPDATE USING (user_id = auth.uid());

-- Admins can manage all participants
CREATE POLICY "Admins can manage all participants" ON conversation_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for messages
-- Users can view messages in conversations they participate in
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
    );

-- Users can send messages to conversations they participate in
CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
    );

-- Users can edit their own messages
CREATE POLICY "Users can edit their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages" ON messages
    FOR DELETE USING (sender_id = auth.uid());

-- Admins can manage all messages
CREATE POLICY "Admins can manage all messages" ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for message_reactions
-- Users can view reactions on messages in their conversations
CREATE POLICY "Users can view reactions in their conversations" ON message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_reactions.message_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
    );

-- Users can add/remove their own reactions
CREATE POLICY "Users can manage their own reactions" ON message_reactions
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for message_attachments
-- Users can view attachments in their conversations
CREATE POLICY "Users can view attachments in their conversations" ON message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_attachments.message_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
    );

-- Users can add attachments to their own messages
CREATE POLICY "Users can add attachments to their messages" ON message_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_attachments.message_id
            AND m.sender_id = auth.uid()
        )
    );

-- Users can update/delete attachments on their own messages
CREATE POLICY "Users can manage attachments on their messages" ON message_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_attachments.message_id
            AND m.sender_id = auth.uid()
        )
    );

-- RLS Policies for message_read_receipts
-- Users can view read receipts for messages in their conversations
CREATE POLICY "Users can view read receipts in their conversations" ON message_read_receipts
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM messages m
            INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_read_receipts.message_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
    );

-- Users can create/update their own read receipts
CREATE POLICY "Users can manage their own read receipts" ON message_read_receipts
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for typing_indicators
-- Users can view typing indicators in their conversations
CREATE POLICY "Users can view typing indicators in their conversations" ON typing_indicators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = typing_indicators.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
    );

-- Users can manage their own typing indicators
CREATE POLICY "Users can manage their own typing indicators" ON typing_indicators
    FOR ALL USING (user_id = auth.uid());

-- Create function to check if user can message another user
CREATE OR REPLACE FUNCTION can_user_message_user(sender_id UUID, recipient_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admin can message anyone
    IF EXISTS (
        SELECT 1 FROM users
        WHERE id = sender_id AND role = 'admin'
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check if users have active sessions (coach-client relationship)
    IF EXISTS (
        SELECT 1 FROM sessions s
        WHERE ((s.coach_id = sender_id AND s.client_id = recipient_id) OR
               (s.coach_id = recipient_id AND s.client_id = sender_id))
        AND s.status IN ('scheduled', 'in_progress', 'completed')
    ) THEN
        RETURN TRUE;
    END IF;

    -- Users with existing conversation can continue messaging
    IF EXISTS (
        SELECT 1 FROM conversations c
        INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = sender_id
        INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = recipient_id
        WHERE cp1.left_at IS NULL AND cp2.left_at IS NULL
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'extensions';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;