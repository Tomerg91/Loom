-- Message Retention Policy
-- Automatically archive or delete old messages based on retention settings

-- Create message retention configuration table
CREATE TABLE IF NOT EXISTS message_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  apply_to_conversation_type conversation_type,
  auto_delete BOOLEAN DEFAULT false,
  auto_archive BOOLEAN DEFAULT true,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add archive status to messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for efficient archival queries
CREATE INDEX IF NOT EXISTS idx_messages_created_at_archived
ON messages(created_at, is_archived)
WHERE is_archived = false;

-- Insert default retention policies
INSERT INTO message_retention_policies (policy_name, retention_days, apply_to_conversation_type, auto_delete, auto_archive, description) VALUES
  ('default_retention', 365, NULL, false, false, 'Default: Keep all messages for 1 year'),
  ('direct_message_retention', 180, 'direct', false, true, 'Direct messages: Archive after 6 months'),
  ('group_message_retention', 90, 'group', false, true, 'Group messages: Archive after 3 months'),
  ('compliance_retention', 2555, NULL, false, false, 'Compliance: Keep all messages for 7 years')
ON CONFLICT (policy_name) DO NOTHING;

-- Function to archive old messages
CREATE OR REPLACE FUNCTION archive_old_messages(p_policy_name TEXT DEFAULT 'default_retention')
RETURNS TABLE (
  archived_count BIGINT,
  conversation_ids UUID[]
) AS $$
DECLARE
  v_retention_days INTEGER;
  v_apply_to_type conversation_type;
  v_archived_count BIGINT;
  v_conversation_ids UUID[];
BEGIN
  -- Get policy settings
  SELECT retention_days, apply_to_conversation_type
  INTO v_retention_days, v_apply_to_type
  FROM message_retention_policies
  WHERE policy_name = p_policy_name AND is_active = true;

  IF v_retention_days IS NULL THEN
    RAISE EXCEPTION 'Policy % not found or inactive', p_policy_name;
  END IF;

  -- Archive messages
  WITH archived AS (
    UPDATE messages m
    SET
      is_archived = true,
      archived_at = NOW(),
      updated_at = NOW()
    FROM conversations c
    WHERE
      m.conversation_id = c.id
      AND m.is_archived = false
      AND m.created_at < NOW() - (v_retention_days || ' days')::INTERVAL
      AND (v_apply_to_type IS NULL OR c.type = v_apply_to_type)
    RETURNING m.id, m.conversation_id
  )
  SELECT
    COUNT(*),
    ARRAY_AGG(DISTINCT conversation_id)
  INTO v_archived_count, v_conversation_ids
  FROM archived;

  RETURN QUERY SELECT v_archived_count, v_conversation_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete archived messages (for compliance)
CREATE OR REPLACE FUNCTION delete_archived_messages(p_older_than_days INTEGER DEFAULT 30)
RETURNS BIGINT AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  -- Delete attachments first
  DELETE FROM message_attachments
  WHERE message_id IN (
    SELECT id FROM messages
    WHERE
      is_archived = true
      AND archived_at < NOW() - (p_older_than_days || ' days')::INTERVAL
  );

  -- Delete reactions
  DELETE FROM message_reactions
  WHERE message_id IN (
    SELECT id FROM messages
    WHERE
      is_archived = true
      AND archived_at < NOW() - (p_older_than_days || ' days')::INTERVAL
  );

  -- Delete read receipts
  DELETE FROM message_read_receipts
  WHERE message_id IN (
    SELECT id FROM messages
    WHERE
      is_archived = true
      AND archived_at < NOW() - (p_older_than_days || ' days')::INTERVAL
  );

  -- Delete messages
  WITH deleted AS (
    DELETE FROM messages
    WHERE
      is_archived = true
      AND archived_at < NOW() - (p_older_than_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get retention statistics
CREATE OR REPLACE FUNCTION get_message_retention_stats()
RETURNS TABLE (
  total_messages BIGINT,
  active_messages BIGINT,
  archived_messages BIGINT,
  messages_pending_archive BIGINT,
  oldest_message_date TIMESTAMPTZ,
  newest_message_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_messages,
    COUNT(*) FILTER (WHERE is_archived = false)::BIGINT as active_messages,
    COUNT(*) FILTER (WHERE is_archived = true)::BIGINT as archived_messages,
    COUNT(*) FILTER (
      WHERE
        is_archived = false
        AND created_at < NOW() - INTERVAL '365 days'
    )::BIGINT as messages_pending_archive,
    MIN(created_at) as oldest_message_date,
    MAX(created_at) as newest_message_date
  FROM messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for retention policies table
CREATE OR REPLACE FUNCTION update_retention_policy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_retention_policy_modtime
  BEFORE UPDATE ON message_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_retention_policy_timestamp();

-- Grant permissions (adjust based on your roles)
GRANT SELECT ON message_retention_policies TO authenticated;
GRANT EXECUTE ON FUNCTION get_message_retention_stats() TO authenticated;

-- Admin only functions
-- Note: You should create an admin role and grant these permissions
-- GRANT EXECUTE ON FUNCTION archive_old_messages(TEXT) TO admin;
-- GRANT EXECUTE ON FUNCTION delete_archived_messages(INTEGER) TO admin;
-- GRANT UPDATE ON message_retention_policies TO admin;

-- Add RLS policies for retention policies table
ALTER TABLE message_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view retention policies"
  ON message_retention_policies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify retention policies"
  ON message_retention_policies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE message_retention_policies IS 'Configuration for message retention and archival policies';
COMMENT ON FUNCTION archive_old_messages IS 'Archives messages based on retention policy';
COMMENT ON FUNCTION delete_archived_messages IS 'Permanently deletes archived messages older than specified days';
COMMENT ON FUNCTION get_message_retention_stats IS 'Returns statistics about message retention and archival';
