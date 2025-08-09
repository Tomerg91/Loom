-- Create messaging system tables and types

-- Message types
CREATE TYPE message_type AS ENUM ('text', 'file', 'system');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
CREATE TYPE conversation_type AS ENUM ('direct', 'group');
CREATE TYPE attachment_type AS ENUM ('image', 'document', 'video', 'audio', 'other');

-- Conversations table
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type conversation_type NOT NULL DEFAULT 'direct',
    title TEXT,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    type message_type NOT NULL DEFAULT 'text',
    content TEXT,
    metadata JSONB DEFAULT '{}',
    status message_status NOT NULL DEFAULT 'sent',
    is_edited BOOLEAN NOT NULL DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message reactions
CREATE TABLE message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(message_id, user_id, emoji)
);

-- Message attachments
CREATE TABLE message_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    attachment_type attachment_type NOT NULL DEFAULT 'other',
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message read receipts
CREATE TABLE message_read_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(message_id, user_id)
);

-- Typing indicators
CREATE TABLE typing_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 seconds',
    
    UNIQUE(conversation_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_archived ON conversations(is_archived);

CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_last_read ON conversation_participants(last_read_at);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id);
CREATE INDEX idx_messages_type ON messages(type);

CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX idx_message_attachments_type ON message_attachments(attachment_type);

CREATE INDEX idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user_id ON message_read_receipts(user_id);

CREATE INDEX idx_typing_indicators_conversation_id ON typing_indicators(conversation_id);
CREATE INDEX idx_typing_indicators_user_id ON typing_indicators(user_id);
CREATE INDEX idx_typing_indicators_expires_at ON typing_indicators(expires_at);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_participants_updated_at BEFORE UPDATE ON conversation_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_attachments_updated_at BEFORE UPDATE ON message_attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation last_message_at when a new message is inserted
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message 
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Function to clean up expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
    DELETE FROM typing_indicators 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get unread message count for a user in a conversation
CREATE OR REPLACE FUNCTION get_unread_message_count(p_conversation_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
    last_read TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user's last read timestamp for this conversation
    SELECT last_read_at INTO last_read
    FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
    
    -- If user is not a participant, return 0
    IF last_read IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Count messages created after last read timestamp
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM messages
    WHERE conversation_id = p_conversation_id 
    AND created_at > last_read
    AND sender_id != p_user_id; -- Don't count user's own messages
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to mark conversation as read for a user
CREATE OR REPLACE FUNCTION mark_conversation_as_read(p_conversation_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE conversation_participants
    SET last_read_at = NOW(),
        updated_at = NOW()
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
    
    -- Also create read receipts for unread messages
    INSERT INTO message_read_receipts (message_id, user_id, read_at)
    SELECT m.id, p_user_id, NOW()
    FROM messages m
    LEFT JOIN message_read_receipts mrr ON m.id = mrr.message_id AND mrr.user_id = p_user_id
    WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND mrr.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to create or get direct conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
BEGIN
    -- Check if a direct conversation already exists between these two users
    SELECT c.id INTO conversation_id
    FROM conversations c
    INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = p_user1_id
    INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = p_user2_id
    WHERE c.type = 'direct'
    AND cp1.left_at IS NULL
    AND cp2.left_at IS NULL
    LIMIT 1;
    
    -- If conversation exists, return it
    IF conversation_id IS NOT NULL THEN
        RETURN conversation_id;
    END IF;
    
    -- Create new direct conversation
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', p_user1_id)
    RETURNING id INTO conversation_id;
    
    -- Add both users as participants
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES 
        (conversation_id, p_user1_id, 'member'),
        (conversation_id, p_user2_id, 'member');
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;