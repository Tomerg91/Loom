-- Coach Analytics Views and RPCs
-- Refactored to use SQL views/RPCs with explicit projections and pagination parameters
-- This replaces the JavaScript-based aggregation in API routes with database-level operations

-- ============================================================================
-- VIEW: coach_client_summary_v
-- ============================================================================
-- Materialized summary of client data per coach for efficient querying
-- This view aggregates session statistics, ratings, and goals for each client

CREATE OR REPLACE VIEW coach_client_summary_v AS
WITH client_session_stats AS (
  SELECT
    s.coach_id,
    s.client_id,
    COUNT(*) AS total_sessions,
    COUNT(*) FILTER (WHERE s.status = 'completed') AS completed_sessions,
    COUNT(*) FILTER (WHERE s.status = 'cancelled') AS cancelled_sessions,
    MAX(s.scheduled_at) FILTER (WHERE s.status = 'completed') AS last_completed_session,
    MIN(s.scheduled_at) FILTER (WHERE s.status = 'scheduled' AND s.scheduled_at > NOW()) AS next_scheduled_session,
    MAX(s.scheduled_at) AS last_session_date
  FROM sessions s
  GROUP BY s.coach_id, s.client_id
),
client_ratings AS (
  SELECT
    sf.coach_id,
    sf.client_id,
    AVG(sf.overall_rating) AS avg_feedback_rating,
    COUNT(*) AS feedback_count
  FROM session_feedback sf
  WHERE sf.overall_rating IS NOT NULL
  GROUP BY sf.coach_id, sf.client_id
),
client_legacy_ratings AS (
  SELECT
    sr.coach_id,
    sr.client_id,
    AVG(sr.rating) AS avg_legacy_rating,
    COUNT(*) AS legacy_rating_count
  FROM session_ratings sr
  WHERE sr.rating IS NOT NULL
  GROUP BY sr.coach_id, sr.client_id
),
client_goals AS (
  SELECT
    cg.coach_id,
    cg.client_id,
    COUNT(*) AS total_goals,
    COUNT(*) FILTER (WHERE cg.status = 'completed') AS completed_goals,
    ARRAY_AGG(
      cg.title ||
      CASE WHEN cg.status != 'active' THEN ' (' || cg.status || ')' ELSE '' END ||
      CASE WHEN cg.progress_percentage IS NOT NULL THEN ' ' || cg.progress_percentage || '%' ELSE '' END
      ORDER BY cg.created_at DESC
    ) FILTER (WHERE cg.title IS NOT NULL) AS goal_titles
  FROM client_goals cg
  GROUP BY cg.coach_id, cg.client_id
)
SELECT
  u.id AS client_id,
  css.coach_id,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  u.avatar_url,
  u.status AS user_status,
  u.created_at AS joined_date,
  css.total_sessions,
  css.completed_sessions,
  css.cancelled_sessions,
  css.last_completed_session,
  css.next_scheduled_session,
  css.last_session_date,
  -- Calculate average rating from both sources, preferring session_feedback
  COALESCE(
    ROUND(
      CASE
        WHEN cr.feedback_count > 0 THEN cr.avg_feedback_rating
        WHEN clr.legacy_rating_count > 0 THEN clr.avg_legacy_rating
        ELSE 0
      END,
      1
    ),
    0
  ) AS average_rating,
  COALESCE(cg.total_goals, 0) AS total_goals,
  COALESCE(cg.completed_goals, 0) AS completed_goals,
  COALESCE(cg.goal_titles, ARRAY[]::TEXT[]) AS goal_titles,
  -- Derive client status based on session activity
  CASE
    WHEN u.status = 'pending' OR u.status = 'invited' THEN 'pending'
    WHEN css.last_session_date >= (NOW() - INTERVAL '30 days') THEN 'active'
    ELSE 'inactive'
  END AS client_status
FROM users u
INNER JOIN client_session_stats css ON u.id = css.client_id
LEFT JOIN client_ratings cr ON css.coach_id = cr.coach_id AND u.id = cr.client_id
LEFT JOIN client_legacy_ratings clr ON css.coach_id = clr.coach_id AND u.id = clr.client_id
LEFT JOIN client_goals cg ON css.coach_id = cg.coach_id AND u.id = cg.client_id;

-- Add comment for documentation
COMMENT ON VIEW coach_client_summary_v IS 'Aggregated view of client statistics per coach including sessions, ratings, and goals';

-- ============================================================================
-- RPC: get_coach_clients_paginated
-- ============================================================================
-- Returns paginated list of clients for a coach with explicit projections
-- Supports filtering by status and search, with proper pagination

CREATE OR REPLACE FUNCTION get_coach_clients_paginated(
  p_coach_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT 'all',
  p_sort_by TEXT DEFAULT 'name'
)
RETURNS TABLE (
  client_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  last_session TIMESTAMPTZ,
  total_sessions BIGINT,
  status TEXT,
  joined_date TIMESTAMPTZ,
  next_session TIMESTAMPTZ,
  completed_sessions BIGINT,
  average_rating NUMERIC,
  goals TEXT[],
  progress_current BIGINT,
  progress_target BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- First, get the total count for pagination metadata
  SELECT COUNT(*)
  INTO v_total_count
  FROM coach_client_summary_v ccs
  WHERE ccs.coach_id = p_coach_id
    AND (p_status_filter = 'all' OR ccs.client_status = p_status_filter)
    AND (
      p_search IS NULL
      OR p_search = ''
      OR LOWER(ccs.first_name || ' ' || ccs.last_name) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(ccs.email) LIKE '%' || LOWER(p_search) || '%'
    );

  -- Return paginated results with explicit projections
  RETURN QUERY
  SELECT
    ccs.client_id,
    ccs.first_name,
    ccs.last_name,
    ccs.email,
    ccs.phone,
    ccs.avatar_url,
    ccs.last_completed_session AS last_session,
    ccs.total_sessions,
    ccs.client_status AS status,
    ccs.joined_date,
    ccs.next_scheduled_session AS next_session,
    ccs.completed_sessions,
    ccs.average_rating,
    ccs.goal_titles[1:3] AS goals, -- Limit to first 3 goals
    ccs.completed_sessions AS progress_current,
    GREATEST(ccs.total_sessions, 1) AS progress_target,
    v_total_count AS total_count
  FROM coach_client_summary_v ccs
  WHERE ccs.coach_id = p_coach_id
    AND (p_status_filter = 'all' OR ccs.client_status = p_status_filter)
    AND (
      p_search IS NULL
      OR p_search = ''
      OR LOWER(ccs.first_name || ' ' || ccs.last_name) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(ccs.email) LIKE '%' || LOWER(p_search) || '%'
    )
  ORDER BY
    CASE WHEN p_sort_by = 'name' THEN ccs.first_name || ' ' || ccs.last_name END ASC,
    CASE WHEN p_sort_by = 'lastSession' THEN ccs.last_completed_session END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'joinedDate' THEN ccs.joined_date END DESC,
    CASE WHEN p_sort_by = 'progress' THEN ccs.total_sessions END DESC,
    ccs.last_completed_session DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_coach_clients_paginated IS 'Returns paginated list of clients for a coach with filtering and sorting';

-- ============================================================================
-- RPC: get_coach_insights_overview
-- ============================================================================
-- Returns aggregated insights overview for a coach within a time range

CREATE OR REPLACE FUNCTION get_coach_insights_overview(
  p_coach_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_sessions BIGINT,
  completed_sessions BIGINT,
  cancelled_sessions BIGINT,
  unique_clients BIGINT,
  total_hours NUMERIC,
  completion_rate INTEGER,
  average_mood_rating NUMERIC,
  average_progress_rating NUMERIC,
  estimated_revenue NUMERIC,
  revenue_currency TEXT,
  average_feedback_rating NUMERIC,
  client_retention_rate INTEGER,
  notes_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_session_rate NUMERIC;
  v_currency TEXT;
  v_previous_start TIMESTAMPTZ;
  v_previous_clients BIGINT;
  v_current_clients BIGINT;
  v_retained_clients BIGINT;
BEGIN
  -- Get coach session rate and currency
  SELECT
    COALESCE(cp.session_rate, 75.00),
    COALESCE(cp.currency, 'USD')
  INTO v_session_rate, v_currency
  FROM coach_profiles cp
  WHERE cp.coach_id = p_coach_id
  LIMIT 1;

  -- If no profile found, use defaults
  IF v_session_rate IS NULL THEN
    v_session_rate := 75.00;
    v_currency := 'USD';
  END IF;

  -- Calculate previous period start for retention
  v_previous_start := p_start_date - (p_end_date - p_start_date);

  -- Get previous period clients
  SELECT COUNT(DISTINCT s.client_id)
  INTO v_previous_clients
  FROM sessions s
  WHERE s.coach_id = p_coach_id
    AND s.scheduled_at >= v_previous_start
    AND s.scheduled_at < p_start_date;

  -- Get current period clients
  SELECT COUNT(DISTINCT s.client_id)
  INTO v_current_clients
  FROM sessions s
  WHERE s.coach_id = p_coach_id
    AND s.scheduled_at >= p_start_date
    AND s.scheduled_at <= p_end_date;

  -- Get retained clients (in both periods)
  SELECT COUNT(DISTINCT s1.client_id)
  INTO v_retained_clients
  FROM sessions s1
  WHERE s1.coach_id = p_coach_id
    AND s1.scheduled_at >= p_start_date
    AND s1.scheduled_at <= p_end_date
    AND EXISTS (
      SELECT 1
      FROM sessions s2
      WHERE s2.coach_id = p_coach_id
        AND s2.client_id = s1.client_id
        AND s2.scheduled_at >= v_previous_start
        AND s2.scheduled_at < p_start_date
    );

  -- Return aggregated overview
  RETURN QUERY
  WITH session_data AS (
    SELECT
      COUNT(*) AS total_sessions,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_sessions,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_sessions,
      COUNT(DISTINCT client_id) AS unique_clients,
      SUM(duration_minutes) FILTER (WHERE status = 'completed') AS total_minutes
    FROM sessions
    WHERE coach_id = p_coach_id
      AND scheduled_at >= p_start_date
      AND scheduled_at <= p_end_date
  ),
  mood_data AS (
    SELECT
      AVG(r.mood_rating) AS avg_mood,
      AVG(r.progress_rating) AS avg_progress
    FROM reflections r
    WHERE r.client_id IN (
      SELECT DISTINCT s.client_id
      FROM sessions s
      WHERE s.coach_id = p_coach_id
        AND s.scheduled_at >= p_start_date
        AND s.scheduled_at <= p_end_date
    )
    AND r.created_at >= p_start_date
    AND r.created_at <= p_end_date
  ),
  feedback_data AS (
    SELECT
      AVG(
        COALESCE(
          sf.overall_rating,
          sr.rating
        )
      ) AS avg_rating
    FROM sessions s
    LEFT JOIN session_feedback sf ON s.id = sf.session_id
    LEFT JOIN session_ratings sr ON s.id = sr.session_id
    WHERE s.coach_id = p_coach_id
      AND s.scheduled_at >= p_start_date
      AND s.scheduled_at <= p_end_date
      AND (sf.overall_rating IS NOT NULL OR sr.rating IS NOT NULL)
  ),
  notes_data AS (
    SELECT COUNT(*) AS notes_count
    FROM coach_notes cn
    WHERE cn.coach_id = p_coach_id
      AND cn.created_at >= p_start_date
      AND cn.created_at <= p_end_date
  )
  SELECT
    sd.total_sessions,
    sd.completed_sessions,
    sd.cancelled_sessions,
    sd.unique_clients,
    ROUND(COALESCE(sd.total_minutes, 0) / 60.0, 1) AS total_hours,
    CASE
      WHEN sd.total_sessions > 0
      THEN ROUND((sd.completed_sessions::FLOAT / sd.total_sessions) * 100)::INTEGER
      ELSE 0
    END AS completion_rate,
    ROUND(COALESCE(md.avg_mood, 0), 1) AS average_mood_rating,
    ROUND(COALESCE(md.avg_progress, 0), 1) AS average_progress_rating,
    ROUND(COALESCE(sd.completed_sessions, 0) * v_session_rate, 2) AS estimated_revenue,
    v_currency AS revenue_currency,
    ROUND(COALESCE(fd.avg_rating, 0), 1) AS average_feedback_rating,
    CASE
      WHEN v_previous_clients > 0
      THEN ROUND((v_retained_clients::FLOAT / v_previous_clients) * 100)::INTEGER
      ELSE 0
    END AS client_retention_rate,
    COALESCE(nd.notes_count, 0) AS notes_count
  FROM session_data sd
  CROSS JOIN mood_data md
  CROSS JOIN feedback_data fd
  CROSS JOIN notes_data nd;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_coach_insights_overview IS 'Returns aggregated insights overview for a coach within a time range';

-- ============================================================================
-- RPC: get_coach_session_metrics
-- ============================================================================
-- Returns daily session metrics for a coach within a time range with ratings and revenue

CREATE OR REPLACE FUNCTION get_coach_session_metrics(
  p_coach_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  date DATE,
  completed INTEGER,
  cancelled INTEGER,
  total INTEGER,
  average_rating NUMERIC,
  revenue NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_session_rate NUMERIC;
BEGIN
  -- Get coach session rate
  SELECT COALESCE(cp.session_rate, 75.00)
  INTO v_session_rate
  FROM coach_profiles cp
  WHERE cp.coach_id = p_coach_id
  LIMIT 1;

  -- If no profile found, use default
  IF v_session_rate IS NULL THEN
    v_session_rate := 75.00;
  END IF;

  -- Return daily metrics
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      p_start_date::DATE,
      p_end_date::DATE,
      '1 day'::interval
    )::DATE AS date
  ),
  daily_sessions AS (
    SELECT
      (s.scheduled_at AT TIME ZONE 'UTC')::DATE AS date,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE s.status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE s.status = 'cancelled') AS cancelled,
      ARRAY_AGG(s.id) FILTER (WHERE s.status = 'completed') AS completed_session_ids
    FROM sessions s
    WHERE s.coach_id = p_coach_id
      AND s.scheduled_at >= p_start_date
      AND s.scheduled_at <= p_end_date
    GROUP BY (s.scheduled_at AT TIME ZONE 'UTC')::DATE
  ),
  daily_ratings AS (
    SELECT
      (s.scheduled_at AT TIME ZONE 'UTC')::DATE AS date,
      AVG(
        COALESCE(
          sf.overall_rating,
          sr.rating
        )
      ) AS avg_rating
    FROM sessions s
    LEFT JOIN session_feedback sf ON s.id = sf.session_id
    LEFT JOIN session_ratings sr ON s.id = sr.session_id
    WHERE s.coach_id = p_coach_id
      AND s.scheduled_at >= p_start_date
      AND s.scheduled_at <= p_end_date
      AND (sf.overall_rating IS NOT NULL OR sr.rating IS NOT NULL)
    GROUP BY (s.scheduled_at AT TIME ZONE 'UTC')::DATE
  )
  SELECT
    ds.date,
    COALESCE(dsess.completed, 0)::INTEGER AS completed,
    COALESCE(dsess.cancelled, 0)::INTEGER AS cancelled,
    COALESCE(dsess.total, 0)::INTEGER AS total,
    ROUND(COALESCE(dr.avg_rating, 0), 1) AS average_rating,
    ROUND(COALESCE(dsess.completed, 0) * v_session_rate, 2) AS revenue
  FROM date_series ds
  LEFT JOIN daily_sessions dsess ON ds.date = dsess.date
  LEFT JOIN daily_ratings dr ON ds.date = dr.date
  ORDER BY ds.date;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_coach_session_metrics IS 'Returns daily session metrics for a coach with ratings and revenue';

-- ============================================================================
-- RPC: get_coach_client_progress
-- ============================================================================
-- Returns client progress data for a coach within a time range

CREATE OR REPLACE FUNCTION get_coach_client_progress(
  p_coach_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  sessions_completed BIGINT,
  total_sessions BIGINT,
  average_mood NUMERIC,
  average_progress NUMERIC,
  last_session TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH client_sessions AS (
    SELECT
      s.client_id,
      COUNT(*) AS total_sessions,
      COUNT(*) FILTER (WHERE s.status = 'completed') AS sessions_completed,
      MAX(s.scheduled_at) AS last_session
    FROM sessions s
    WHERE s.coach_id = p_coach_id
      AND s.scheduled_at >= p_start_date
      AND s.scheduled_at <= p_end_date
    GROUP BY s.client_id
  ),
  client_reflections AS (
    SELECT
      r.client_id,
      AVG(r.mood_rating) AS avg_mood,
      AVG(r.progress_rating) AS avg_progress
    FROM reflections r
    WHERE r.client_id IN (SELECT client_id FROM client_sessions)
      AND r.created_at >= p_start_date
      AND r.created_at <= p_end_date
    GROUP BY r.client_id
  )
  SELECT
    cs.client_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') AS client_name,
    cs.sessions_completed,
    cs.total_sessions,
    ROUND(COALESCE(cr.avg_mood, 0), 1) AS average_mood,
    ROUND(COALESCE(cr.avg_progress, 0), 1) AS average_progress,
    cs.last_session
  FROM client_sessions cs
  LEFT JOIN users u ON cs.client_id = u.id
  LEFT JOIN client_reflections cr ON cs.client_id = cr.client_id
  ORDER BY cs.sessions_completed DESC
  LIMIT p_limit;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_coach_client_progress IS 'Returns client progress data for a coach within a time range';

-- ============================================================================
-- RPC: get_coach_goal_analysis
-- ============================================================================
-- Returns goal analysis data for a coach

CREATE OR REPLACE FUNCTION get_coach_goal_analysis(
  p_coach_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_goals BIGINT,
  completed_goals BIGINT,
  achievement_rate INTEGER,
  average_time_to_goal NUMERIC,
  most_common_goals JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH goal_data AS (
    SELECT
      cg.category,
      cg.status,
      cg.created_at,
      cg.completed_at
    FROM client_goals cg
    WHERE cg.coach_id = p_coach_id
      AND cg.client_id IN (
        SELECT DISTINCT s.client_id
        FROM sessions s
        WHERE s.coach_id = p_coach_id
          AND s.scheduled_at >= p_start_date
          AND s.scheduled_at <= p_end_date
      )
  ),
  category_stats AS (
    SELECT
      COALESCE(gd.category, 'Other') AS goal,
      COUNT(*) AS count,
      COUNT(*) FILTER (WHERE gd.status = 'completed') AS completed_count
    FROM goal_data gd
    GROUP BY COALESCE(gd.category, 'Other')
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ),
  completion_times AS (
    SELECT
      EXTRACT(EPOCH FROM (completed_at - created_at)) / (60 * 60 * 24 * 7) AS weeks
    FROM goal_data
    WHERE status = 'completed' AND completed_at IS NOT NULL
  )
  SELECT
    (SELECT COUNT(*) FROM goal_data)::BIGINT AS total_goals,
    (SELECT COUNT(*) FROM goal_data WHERE status = 'completed')::BIGINT AS completed_goals,
    CASE
      WHEN (SELECT COUNT(*) FROM goal_data) > 0
      THEN ROUND(
        ((SELECT COUNT(*) FROM goal_data WHERE status = 'completed')::FLOAT /
         (SELECT COUNT(*) FROM goal_data)) * 100
      )::INTEGER
      ELSE 0
    END AS achievement_rate,
    ROUND(
      COALESCE((SELECT AVG(weeks) FROM completion_times), 0),
      1
    ) AS average_time_to_goal,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'goal', cs.goal,
            'count', cs.count,
            'successRate',
            CASE
              WHEN cs.count > 0
              THEN ROUND((cs.completed_count::FLOAT / cs.count) * 100)::INTEGER
              ELSE 0
            END
          )
          ORDER BY cs.count DESC
        )
        FROM category_stats cs
      ),
      '[]'::jsonb
    ) AS most_common_goals;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_coach_goal_analysis IS 'Returns goal analysis data for a coach including categories and success rates';

-- ============================================================================
-- RPC: get_coach_feedback_list
-- ============================================================================
-- Returns detailed feedback list for a coach with pagination

CREATE OR REPLACE FUNCTION get_coach_feedback_list(
  p_coach_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  client_name TEXT,
  rating INTEGER,
  comment TEXT,
  date TIMESTAMPTZ,
  session_type TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(u.first_name || ' ' || u.last_name, 'Anonymous') AS client_name,
    COALESCE(sf.overall_rating, 0)::INTEGER AS rating,
    COALESCE(sf.feedback_text, '') AS comment,
    sf.created_at AS date,
    COALESCE(s.duration_minutes::TEXT || ' min session', 'Session') AS session_type
  FROM session_feedback sf
  INNER JOIN sessions s ON sf.session_id = s.id
  LEFT JOIN users u ON s.client_id = u.id
  WHERE sf.coach_id = p_coach_id
    AND s.scheduled_at >= p_start_date
    AND s.scheduled_at <= p_end_date
    AND sf.feedback_text IS NOT NULL
    AND sf.feedback_text != ''
  ORDER BY sf.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_coach_feedback_list IS 'Returns paginated detailed feedback list for a coach';

-- ============================================================================
-- Create indexes to support the new functions
-- ============================================================================

-- Index for coach_client_summary_v joins
CREATE INDEX IF NOT EXISTS idx_sessions_coach_client
ON sessions(coach_id, client_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_feedback_coach_client
ON session_feedback(coach_id, client_id)
WHERE overall_rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_ratings_coach_client
ON session_ratings(coach_id, client_id)
WHERE rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_goals_coach_client
ON client_goals(coach_id, client_id, created_at DESC);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_sessions_coach_scheduled
ON sessions(coach_id, scheduled_at)
WHERE status IN ('completed', 'scheduled', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_reflections_client_created
ON reflections(client_id, created_at)
WHERE mood_rating IS NOT NULL OR progress_rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coach_notes_coach_created
ON coach_notes(coach_id, created_at);

-- Index for session feedback joins
CREATE INDEX IF NOT EXISTS idx_session_feedback_session
ON session_feedback(session_id, overall_rating);

CREATE INDEX IF NOT EXISTS idx_session_ratings_session
ON session_ratings(session_id, rating);
