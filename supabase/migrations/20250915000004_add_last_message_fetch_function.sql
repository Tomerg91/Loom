-- Function to fetch the latest message per conversation in a single query
CREATE OR REPLACE FUNCTION get_last_messages_for_conversations(p_conversation_ids UUID[])
RETURNS TABLE (
    conversation_id UUID,
    id UUID,
    content TEXT,
    type message_type,
    created_at TIMESTAMP WITH TIME ZONE,
    sender_id UUID,
    users JSONB
) SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    SELECT DISTINCT ON (m.conversation_id)
        m.conversation_id,
        m.id,
        m.content,
        m.type,
        m.created_at,
        m.sender_id,
        jsonb_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
        ) AS users
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ANY(p_conversation_ids)
    ORDER BY m.conversation_id, m.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_last_messages_for_conversations(UUID[]) TO authenticated;
