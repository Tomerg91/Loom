-- Messaging Analytics
-- Track engagement metrics for messaging system

-- Create messaging analytics events table
CREATE TABLE IF NOT EXISTS message_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'read', 'reacted', 'replied')),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messaging analytics aggregates table (for faster queries)
CREATE TABLE IF NOT EXISTS message_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  reactions_added INTEGER DEFAULT 0,
  replies_sent INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, user_id, conversation_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_message_id ON message_analytics_events(message_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_conversation_id ON message_analytics_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON message_analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON message_analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON message_analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_user_date ON message_analytics_daily(user_id, date);

-- Function to track message sent event
CREATE OR REPLACE FUNCTION track_message_sent()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert analytics event
  INSERT INTO message_analytics_events (event_type, message_id, conversation_id, user_id, metadata)
  VALUES (
    'sent',
    NEW.id,
    NEW.conversation_id,
    NEW.sender_id,
    jsonb_build_object('type', NEW.type, 'has_attachments', (SELECT COUNT(*) > 0 FROM message_attachments WHERE message_id = NEW.id))
  );

  -- Update daily aggregates
  INSERT INTO message_analytics_daily (date, user_id, conversation_id, messages_sent)
  VALUES (CURRENT_DATE, NEW.sender_id, NEW.conversation_id, 1)
  ON CONFLICT (date, user_id, conversation_id)
  DO UPDATE SET
    messages_sent = message_analytics_daily.messages_sent + 1,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to track message read event
CREATE OR REPLACE FUNCTION track_message_read()
RETURNS TRIGGER AS $$
DECLARE
  v_message_sender_id UUID;
  v_conversation_id UUID;
  v_message_created_at TIMESTAMPTZ;
  v_response_time_seconds INTEGER;
BEGIN
  -- Get message details
  SELECT sender_id, conversation_id, created_at
  INTO v_message_sender_id, v_conversation_id, v_message_created_at
  FROM messages
  WHERE id = NEW.message_id;

  -- Calculate response time (time from message sent to read)
  v_response_time_seconds := EXTRACT(EPOCH FROM (NEW.read_at - v_message_created_at))::INTEGER;

  -- Insert analytics event
  INSERT INTO message_analytics_events (event_type, message_id, conversation_id, user_id, metadata)
  VALUES (
    'read',
    NEW.message_id,
    v_conversation_id,
    NEW.user_id,
    jsonb_build_object('response_time_seconds', v_response_time_seconds)
  );

  -- Update daily aggregates for the reader
  INSERT INTO message_analytics_daily (date, user_id, conversation_id, messages_read)
  VALUES (CURRENT_DATE, NEW.user_id, v_conversation_id, 1)
  ON CONFLICT (date, user_id, conversation_id)
  DO UPDATE SET
    messages_read = message_analytics_daily.messages_read + 1,
    updated_at = NOW();

  -- Update average response time
  UPDATE message_analytics_daily
  SET
    avg_response_time_seconds = (
      SELECT AVG((metadata->>'response_time_seconds')::INTEGER)::INTEGER
      FROM message_analytics_events
      WHERE
        event_type = 'read'
        AND user_id = NEW.user_id
        AND conversation_id = v_conversation_id
        AND created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    ),
    updated_at = NOW()
  WHERE date = CURRENT_DATE AND user_id = NEW.user_id AND conversation_id = v_conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to track message reaction event
CREATE OR REPLACE FUNCTION track_message_reaction()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Get conversation_id from message
  SELECT conversation_id INTO v_conversation_id
  FROM messages WHERE id = NEW.message_id;

  -- Insert analytics event
  INSERT INTO message_analytics_events (event_type, message_id, conversation_id, user_id, metadata)
  VALUES (
    'reacted',
    NEW.message_id,
    v_conversation_id,
    NEW.user_id,
    jsonb_build_object('emoji', NEW.emoji)
  );

  -- Update daily aggregates
  INSERT INTO message_analytics_daily (date, user_id, conversation_id, reactions_added)
  VALUES (CURRENT_DATE, NEW.user_id, v_conversation_id, 1)
  ON CONFLICT (date, user_id, conversation_id)
  DO UPDATE SET
    reactions_added = message_analytics_daily.reactions_added + 1,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to track message reply event
CREATE OR REPLACE FUNCTION track_message_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if this is a reply
  IF NEW.reply_to_id IS NOT NULL THEN
    -- Insert analytics event
    INSERT INTO message_analytics_events (event_type, message_id, conversation_id, user_id, metadata)
    VALUES (
      'replied',
      NEW.id,
      NEW.conversation_id,
      NEW.sender_id,
      jsonb_build_object('reply_to_id', NEW.reply_to_id)
    );

    -- Update daily aggregates
    INSERT INTO message_analytics_daily (date, user_id, conversation_id, replies_sent)
    VALUES (CURRENT_DATE, NEW.sender_id, NEW.conversation_id, 1)
    ON CONFLICT (date, user_id, conversation_id)
    DO UPDATE SET
      replies_sent = message_analytics_daily.replies_sent + 1,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER track_message_sent_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION track_message_sent();

CREATE TRIGGER track_message_reply_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION track_message_reply();

CREATE TRIGGER track_message_read_trigger
  AFTER INSERT ON message_read_receipts
  FOR EACH ROW
  EXECUTE FUNCTION track_message_read();

CREATE TRIGGER track_message_reaction_trigger
  AFTER INSERT ON message_reactions
  FOR EACH ROW
  EXECUTE FUNCTION track_message_reaction();

-- Function to get messaging analytics for a user
CREATE OR REPLACE FUNCTION get_user_messaging_analytics(
  p_user_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  messages_sent BIGINT,
  messages_received BIGINT,
  messages_read BIGINT,
  reactions_added BIGINT,
  replies_sent BIGINT,
  avg_response_time_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.date,
    COALESCE(SUM(d.messages_sent), 0)::BIGINT,
    COALESCE(SUM(d.messages_received), 0)::BIGINT,
    COALESCE(SUM(d.messages_read), 0)::BIGINT,
    COALESCE(SUM(d.reactions_added), 0)::BIGINT,
    COALESCE(SUM(d.replies_sent), 0)::BIGINT,
    AVG(d.avg_response_time_seconds)::INTEGER
  FROM message_analytics_daily d
  WHERE
    d.user_id = p_user_id
    AND d.date >= p_start_date
    AND d.date <= p_end_date
  GROUP BY d.date
  ORDER BY d.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get overall messaging analytics
CREATE OR REPLACE FUNCTION get_overall_messaging_analytics(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  total_messages BIGINT,
  total_reactions BIGINT,
  total_replies BIGINT,
  avg_response_time_seconds INTEGER,
  active_users BIGINT,
  active_conversations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.date,
    COALESCE(SUM(d.messages_sent), 0)::BIGINT as total_messages,
    COALESCE(SUM(d.reactions_added), 0)::BIGINT as total_reactions,
    COALESCE(SUM(d.replies_sent), 0)::BIGINT as total_replies,
    AVG(d.avg_response_time_seconds)::INTEGER as avg_response_time_seconds,
    COUNT(DISTINCT d.user_id)::BIGINT as active_users,
    COUNT(DISTINCT d.conversation_id)::BIGINT as active_conversations
  FROM message_analytics_daily d
  WHERE
    d.date >= p_start_date
    AND d.date <= p_end_date
  GROUP BY d.date
  ORDER BY d.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation analytics
CREATE OR REPLACE FUNCTION get_conversation_analytics(
  p_conversation_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  messages_sent BIGINT,
  reactions_added BIGINT,
  replies_sent BIGINT,
  avg_response_time_seconds INTEGER,
  active_participants BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.date,
    COALESCE(SUM(d.messages_sent), 0)::BIGINT,
    COALESCE(SUM(d.reactions_added), 0)::BIGINT,
    COALESCE(SUM(d.replies_sent), 0)::BIGINT,
    AVG(d.avg_response_time_seconds)::INTEGER,
    COUNT(DISTINCT d.user_id)::BIGINT
  FROM message_analytics_daily d
  WHERE
    d.conversation_id = p_conversation_id
    AND d.date >= p_start_date
    AND d.date <= p_end_date
  GROUP BY d.date
  ORDER BY d.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE message_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics events
CREATE POLICY "Users can view their own analytics events"
  ON message_analytics_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all analytics events"
  ON message_analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for daily aggregates
CREATE POLICY "Users can view their own daily analytics"
  ON message_analytics_daily
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all daily analytics"
  ON message_analytics_daily
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON message_analytics_events TO authenticated;
GRANT SELECT ON message_analytics_daily TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_messaging_analytics(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_overall_messaging_analytics(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_analytics(UUID, DATE, DATE) TO authenticated;

-- Comments
COMMENT ON TABLE message_analytics_events IS 'Track individual messaging events for analytics';
COMMENT ON TABLE message_analytics_daily IS 'Daily aggregated messaging analytics for performance';
COMMENT ON FUNCTION get_user_messaging_analytics IS 'Get messaging analytics for a specific user';
COMMENT ON FUNCTION get_overall_messaging_analytics IS 'Get overall platform messaging analytics';
COMMENT ON FUNCTION get_conversation_analytics IS 'Get analytics for a specific conversation';
