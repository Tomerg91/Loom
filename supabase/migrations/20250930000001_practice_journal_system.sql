-- Practice Journal System for Satya Method
-- Allows clients to log somatic experiences, sensations, and insights

-- Create practice journal entries table
CREATE TABLE IF NOT EXISTS practice_journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Journal content
  content TEXT NOT NULL,
  title TEXT, -- Optional title for the entry

  -- Somatic tracking
  sensations TEXT[], -- Tags for body sensations (e.g., 'tension', 'release', 'warmth')
  emotions TEXT[],   -- Tags for emotions (e.g., 'calm', 'anxious', 'joyful')
  body_areas TEXT[], -- Areas of the body noted (e.g., 'shoulders', 'chest', 'stomach')

  -- Insights and learning
  insights TEXT, -- Key learnings or realizations
  practices_done TEXT[], -- Practices performed (e.g., 'breathing', 'body scan', 'movement')

  -- Metadata
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),

  -- Sharing
  shared_with_coach BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMP WITH TIME ZONE,

  -- Session linkage
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_practice_journal_client_id ON practice_journal_entries(client_id);
CREATE INDEX idx_practice_journal_created_at ON practice_journal_entries(created_at DESC);
CREATE INDEX idx_practice_journal_shared ON practice_journal_entries(shared_with_coach) WHERE shared_with_coach = TRUE;
CREATE INDEX idx_practice_journal_session_id ON practice_journal_entries(session_id) WHERE session_id IS NOT NULL;

-- Create GIN indexes for array searching
CREATE INDEX idx_practice_journal_sensations ON practice_journal_entries USING GIN(sensations);
CREATE INDEX idx_practice_journal_emotions ON practice_journal_entries USING GIN(emotions);
CREATE INDEX idx_practice_journal_body_areas ON practice_journal_entries USING GIN(body_areas);
CREATE INDEX idx_practice_journal_practices_done ON practice_journal_entries USING GIN(practices_done);

-- Create updated_at trigger
CREATE TRIGGER update_practice_journal_updated_at
  BEFORE UPDATE ON practice_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE practice_journal_entries ENABLE ROW LEVEL SECURITY;

-- Clients can view their own journal entries
CREATE POLICY "Clients can view own practice journal entries"
  ON practice_journal_entries
  FOR SELECT
  USING (auth.uid() = client_id);

-- Coaches can view shared entries from their assigned clients only
CREATE POLICY "Coaches can view assigned client shared entries"
  ON practice_journal_entries
  FOR SELECT
  USING (
    shared_with_coach = TRUE
    AND EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.coach_id = auth.uid()
      AND sessions.client_id = practice_journal_entries.client_id
    )
  );

-- Clients can create their own journal entries
CREATE POLICY "Clients can create own practice journal entries"
  ON practice_journal_entries
  FOR INSERT
  WITH CHECK (
    auth.uid() = client_id
    AND auth.jwt() ->> 'role' IN ('client', 'admin')
  );

-- Clients can update their own journal entries
CREATE POLICY "Clients can update own practice journal entries"
  ON practice_journal_entries
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Clients can delete their own journal entries
CREATE POLICY "Clients can delete own practice journal entries"
  ON practice_journal_entries
  FOR DELETE
  USING (auth.uid() = client_id);

-- Admins have full access
CREATE POLICY "Admins have full access to practice journal entries"
  ON practice_journal_entries
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create a function to get journal statistics
CREATE OR REPLACE FUNCTION get_practice_journal_stats(user_id UUID)
RETURNS TABLE (
  total_entries BIGINT,
  entries_this_week BIGINT,
  entries_this_month BIGINT,
  shared_entries BIGINT,
  average_mood NUMERIC,
  average_energy NUMERIC,
  most_common_sensations TEXT[],
  most_common_emotions TEXT[],
  practice_streak_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month,
      COUNT(*) FILTER (WHERE shared_with_coach = TRUE) as shared,
      AVG(mood_rating) FILTER (WHERE mood_rating IS NOT NULL) as avg_mood,
      AVG(energy_level) FILTER (WHERE energy_level IS NOT NULL) as avg_energy
    FROM public.practice_journal_entries
    WHERE client_id = user_id
  ),
  sensation_counts AS (
    SELECT
      ARRAY_AGG(sensation ORDER BY count DESC) FILTER (WHERE row_num <= 5) as top_sensations
    FROM (
      SELECT
        UNNEST(sensations) as sensation,
        COUNT(*) as count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as row_num
      FROM public.practice_journal_entries
      WHERE client_id = user_id AND sensations IS NOT NULL
      GROUP BY sensation
    ) s
  ),
  emotion_counts AS (
    SELECT
      ARRAY_AGG(emotion ORDER BY count DESC) FILTER (WHERE row_num <= 5) as top_emotions
    FROM (
      SELECT
        UNNEST(emotions) as emotion,
        COUNT(*) as count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as row_num
      FROM public.practice_journal_entries
      WHERE client_id = user_id AND emotions IS NOT NULL
      GROUP BY emotion
    ) e
  ),
  streak AS (
    SELECT
      COALESCE(COUNT(*), 0) as streak_days
    FROM (
      SELECT
        created_at::DATE as entry_date,
        LAG(created_at::DATE) OVER (ORDER BY created_at::DATE) as prev_date
      FROM public.practice_journal_entries
      WHERE client_id = user_id
      ORDER BY created_at::DATE DESC
    ) dates
    WHERE entry_date = CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY entry_date DESC) - 1) * INTERVAL '1 day'
  )
  SELECT
    s.total,
    s.this_week,
    s.this_month,
    s.shared,
    s.avg_mood,
    s.avg_energy,
    COALESCE(sc.top_sensations, ARRAY[]::TEXT[]),
    COALESCE(ec.top_emotions, ARRAY[]::TEXT[]),
    COALESCE(st.streak_days, 0)
  FROM stats s
  CROSS JOIN sensation_counts sc
  CROSS JOIN emotion_counts ec
  CROSS JOIN streak st;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_practice_journal_stats(UUID) TO authenticated;

-- Create a function to share an entry with coach
CREATE OR REPLACE FUNCTION share_journal_entry_with_coach(entry_id UUID)
RETURNS public.practice_journal_entries AS $$
DECLARE
  updated_entry public.practice_journal_entries;
BEGIN
  UPDATE public.practice_journal_entries
  SET
    shared_with_coach = TRUE,
    shared_at = NOW(),
    updated_at = NOW()
  WHERE
    id = entry_id
    AND client_id = auth.uid()
  RETURNING * INTO updated_entry;

  RETURN updated_entry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION share_journal_entry_with_coach(UUID) TO authenticated;

-- Create a function to unshare an entry
CREATE OR REPLACE FUNCTION unshare_journal_entry(entry_id UUID)
RETURNS public.practice_journal_entries AS $$
DECLARE
  updated_entry public.practice_journal_entries;
BEGIN
  UPDATE public.practice_journal_entries
  SET
    shared_with_coach = FALSE,
    shared_at = NULL,
    updated_at = NOW()
  WHERE
    id = entry_id
    AND client_id = auth.uid()
  RETURNING * INTO updated_entry;

  RETURN updated_entry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION unshare_journal_entry(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE practice_journal_entries IS 'Practice journal for clients to log somatic experiences and insights following Satya Method principles';
COMMENT ON COLUMN practice_journal_entries.sensations IS 'Array of body sensation tags (e.g., tension, release, warmth, tingling)';
COMMENT ON COLUMN practice_journal_entries.emotions IS 'Array of emotion tags (e.g., calm, anxious, joyful, peaceful)';
COMMENT ON COLUMN practice_journal_entries.body_areas IS 'Array of body area tags (e.g., shoulders, chest, stomach, jaw)';
COMMENT ON COLUMN practice_journal_entries.practices_done IS 'Array of practices performed (e.g., breathing, body scan, movement, grounding)';
COMMENT ON COLUMN practice_journal_entries.shared_with_coach IS 'Whether this entry has been shared with the client''s coach';