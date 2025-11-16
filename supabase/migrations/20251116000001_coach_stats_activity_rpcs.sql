-- Coach Stats and Activity RPCs
-- Extends the coach analytics refactoring with additional RPCs for dashboard stats and activity feed
-- This completes the migration from JavaScript aggregation to SQL-based analytics

-- ============================================================================
-- RPC: get_coach_dashboard_stats
-- ============================================================================
-- Returns comprehensive dashboard statistics for a coach
-- Replaces JavaScript-based aggregation in /api/coach/stats

CREATE OR REPLACE FUNCTION get_coach_dashboard_stats(
  p_coach_id UUID
)
RETURNS TABLE (
  total_sessions BIGINT,
  completed_sessions BIGINT,
  upcoming_sessions BIGINT,
  total_clients BIGINT,
  active_clients BIGINT,
  this_week_sessions BIGINT,
  average_rating NUMERIC,
  total_revenue NUMERIC,
  session_rate NUMERIC,
  currency TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_session_rate NUMERIC;
  v_currency TEXT;
  v_start_of_week TIMESTAMPTZ;
  v_end_of_week TIMESTAMPTZ;
  v_thirty_days_ago TIMESTAMPTZ;
  v_now TIMESTAMPTZ;
BEGIN
  -- Get current timestamp
  v_now := NOW();

  -- Get coach session rate and currency
  SELECT
    COALESCE(cp.session_rate, 75.00),
    COALESCE(cp.currency, 'USD')
  INTO v_session_rate, v_currency
  FROM coach_profiles cp
  WHERE cp.coach_id = p_coach_id
  LIMIT 1;

  -- Set defaults if no profile found
  v_session_rate := COALESCE(v_session_rate, 75.00);
  v_currency := COALESCE(v_currency, 'USD');

  -- Calculate week boundaries (Sunday to Saturday)
  v_start_of_week := date_trunc('week', v_now);
  v_end_of_week := v_start_of_week + INTERVAL '7 days';

  -- Calculate 30 days ago for active clients
  v_thirty_days_ago := v_now - INTERVAL '30 days';

  RETURN QUERY
  WITH session_stats AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_at > v_now) AS upcoming,
      COUNT(*) FILTER (
        WHERE status != 'cancelled'
        AND scheduled_at >= v_start_of_week
        AND scheduled_at <= v_end_of_week
      ) AS this_week,
      COUNT(DISTINCT client_id) AS total_clients,
      COUNT(DISTINCT client_id) FILTER (
        WHERE status != 'cancelled'
        AND scheduled_at >= v_thirty_days_ago
      ) AS active_clients,
      ARRAY_AGG(id) FILTER (WHERE status = 'completed') AS completed_session_ids
    FROM sessions
    WHERE coach_id = p_coach_id
  ),
  rating_stats AS (
    SELECT
      COALESCE(
        AVG(
          COALESCE(
            sf.overall_rating,
            sr.rating
          )
        ),
        0
      ) AS avg_rating
    FROM session_stats ss
    CROSS JOIN UNNEST(ss.completed_session_ids) AS session_id
    LEFT JOIN session_feedback sf ON sf.session_id = session_id AND sf.coach_id = p_coach_id
    LEFT JOIN session_ratings sr ON sr.session_id = session_id AND sr.coach_id = p_coach_id
    WHERE sf.overall_rating IS NOT NULL OR sr.rating IS NOT NULL
  )
  SELECT
    ss.total,
    ss.completed,
    ss.upcoming,
    ss.total_clients,
    ss.active_clients,
    ss.this_week,
    ROUND(COALESCE(rs.avg_rating, 4.8), 1) AS average_rating,
    ROUND(ss.completed * v_session_rate, 2) AS total_revenue,
    v_session_rate,
    v_currency
  FROM session_stats ss
  CROSS JOIN rating_stats rs;
END;
$$;

COMMENT ON FUNCTION get_coach_dashboard_stats IS 'Returns comprehensive dashboard statistics for a coach including sessions, clients, and revenue';

-- ============================================================================
-- RPC: get_coach_recent_activity
-- ============================================================================
-- Returns recent activity feed for a coach with pagination
-- Replaces JavaScript-based aggregation in /api/coach/activity

CREATE OR REPLACE FUNCTION get_coach_recent_activity(
  p_coach_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  activity_id TEXT,
  activity_type TEXT,
  description TEXT,
  timestamp TIMESTAMPTZ,
  client_name TEXT,
  client_id UUID
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH completed_sessions AS (
    SELECT
      'session_completed_' || s.id AS activity_id,
      'session_completed' AS activity_type,
      'Completed session with ' || COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') AS description,
      s.updated_at AS timestamp,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') AS client_name,
      s.client_id
    FROM sessions s
    LEFT JOIN users u ON s.client_id = u.id
    WHERE s.coach_id = p_coach_id
      AND s.status = 'completed'
    ORDER BY s.updated_at DESC
    LIMIT 5
  ),
  scheduled_sessions AS (
    SELECT
      'session_scheduled_' || s.id AS activity_id,
      'session_scheduled' AS activity_type,
      'New session scheduled with ' || COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') AS description,
      s.created_at AS timestamp,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') AS client_name,
      s.client_id
    FROM sessions s
    LEFT JOIN users u ON s.client_id = u.id
    WHERE s.coach_id = p_coach_id
      AND s.status = 'scheduled'
    ORDER BY s.created_at DESC
    LIMIT 5
  ),
  recent_notes AS (
    SELECT
      'note_added_' || cn.id AS activity_id,
      'note_added' AS activity_type,
      'Added progress note for ' || COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') AS description,
      cn.created_at AS timestamp,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') AS client_name,
      cn.client_id
    FROM coach_notes cn
    LEFT JOIN users u ON cn.client_id = u.id
    WHERE cn.coach_id = p_coach_id
    ORDER BY cn.created_at DESC
    LIMIT 5
  ),
  all_activities AS (
    SELECT * FROM completed_sessions
    UNION ALL
    SELECT * FROM scheduled_sessions
    UNION ALL
    SELECT * FROM recent_notes
  )
  SELECT
    a.activity_id,
    a.activity_type,
    a.description,
    a.timestamp,
    a.client_name,
    a.client_id
  FROM all_activities a
  ORDER BY a.timestamp DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_coach_recent_activity IS 'Returns paginated recent activity feed for a coach including sessions and notes';

-- ============================================================================
-- Create indexes to support the new functions
-- ============================================================================

-- Index for coach stats - session status and scheduling
CREATE INDEX IF NOT EXISTS idx_sessions_coach_status_scheduled
ON sessions(coach_id, status, scheduled_at DESC)
WHERE status IN ('completed', 'scheduled', 'cancelled');

-- Index for recent activity - completed sessions
CREATE INDEX IF NOT EXISTS idx_sessions_coach_completed_updated
ON sessions(coach_id, updated_at DESC)
WHERE status = 'completed';

-- Index for recent activity - scheduled sessions
CREATE INDEX IF NOT EXISTS idx_sessions_coach_scheduled_created
ON sessions(coach_id, created_at DESC)
WHERE status = 'scheduled';

-- Index for recent activity - coach notes
CREATE INDEX IF NOT EXISTS idx_coach_notes_coach_created_desc
ON coach_notes(coach_id, created_at DESC);
