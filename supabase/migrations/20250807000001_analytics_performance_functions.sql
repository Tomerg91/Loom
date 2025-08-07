-- Analytics Performance Optimization Functions
-- These functions replace inefficient loop-based queries with optimized database-level aggregations

-- Function to get daily user growth metrics efficiently
CREATE OR REPLACE FUNCTION get_daily_user_growth(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  date DATE,
  new_users INTEGER,
  active_users INTEGER,
  total_users INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(start_date, end_date, '1 day'::interval)::date AS date
  ),
  daily_new_users AS (
    SELECT 
      DATE(created_at) AS date,
      COUNT(*) AS new_users
    FROM users
    WHERE DATE(created_at) BETWEEN start_date AND end_date
    GROUP BY DATE(created_at)
  ),
  daily_active_users AS (
    SELECT 
      ds.date,
      COUNT(DISTINCT u.id) AS active_users
    FROM date_series ds
    LEFT JOIN users u ON 
      u.last_seen_at IS NOT NULL 
      AND DATE(u.last_seen_at) BETWEEN (ds.date - INTERVAL '7 days') AND ds.date
    GROUP BY ds.date
  ),
  running_totals AS (
    SELECT 
      ds.date,
      COALESCE(dnu.new_users, 0) AS new_users,
      COALESCE(dau.active_users, 0) AS active_users,
      COALESCE(
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) <= ds.date), 
        0
      ) AS total_users
    FROM date_series ds
    LEFT JOIN daily_new_users dnu ON ds.date = dnu.date
    LEFT JOIN daily_active_users dau ON ds.date = dau.date
  )
  SELECT 
    rt.date,
    rt.new_users::INTEGER,
    rt.active_users::INTEGER,
    rt.total_users::INTEGER
  FROM running_totals rt
  ORDER BY rt.date;
END;
$$;

-- Function to get daily session metrics efficiently
CREATE OR REPLACE FUNCTION get_daily_session_metrics(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  date DATE,
  total_sessions INTEGER,
  completed_sessions INTEGER,
  cancelled_sessions INTEGER,
  scheduled_sessions INTEGER,
  completion_rate INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(start_date, end_date, '1 day'::interval)::date AS date
  ),
  daily_sessions AS (
    SELECT 
      DATE(scheduled_at) AS date,
      COUNT(*) AS total_sessions,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_sessions,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_sessions,
      COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled_sessions
    FROM sessions
    WHERE DATE(scheduled_at) BETWEEN start_date AND end_date
    GROUP BY DATE(scheduled_at)
  )
  SELECT 
    ds.date,
    COALESCE(sess.total_sessions, 0)::INTEGER AS total_sessions,
    COALESCE(sess.completed_sessions, 0)::INTEGER AS completed_sessions,
    COALESCE(sess.cancelled_sessions, 0)::INTEGER AS cancelled_sessions,
    COALESCE(sess.scheduled_sessions, 0)::INTEGER AS scheduled_sessions,
    CASE 
      WHEN COALESCE(sess.total_sessions, 0) > 0 
      THEN ROUND((COALESCE(sess.completed_sessions, 0)::FLOAT / sess.total_sessions) * 100)::INTEGER
      ELSE 0
    END AS completion_rate
  FROM date_series ds
  LEFT JOIN daily_sessions sess ON ds.date = sess.date
  ORDER BY ds.date;
END;
$$;

-- Function to get coach performance metrics efficiently
CREATE OR REPLACE FUNCTION get_coach_performance_metrics(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  coach_id UUID,
  coach_name TEXT,
  total_sessions BIGINT,
  completed_sessions BIGINT,
  active_clients BIGINT,
  completion_rate INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS coach_id,
    CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS coach_name,
    COALESCE(stats.total_sessions, 0) AS total_sessions,
    COALESCE(stats.completed_sessions, 0) AS completed_sessions,
    COALESCE(stats.active_clients, 0) AS active_clients,
    CASE 
      WHEN COALESCE(stats.total_sessions, 0) > 0 
      THEN ROUND((stats.completed_sessions::FLOAT / stats.total_sessions) * 100)::INTEGER
      ELSE 0
    END AS completion_rate
  FROM users u
  LEFT JOIN (
    SELECT 
      s.coach_id,
      COUNT(*) AS total_sessions,
      COUNT(*) FILTER (WHERE s.status = 'completed') AS completed_sessions,
      COUNT(DISTINCT s.client_id) AS active_clients
    FROM sessions s
    WHERE DATE(s.scheduled_at) BETWEEN start_date AND end_date
    GROUP BY s.coach_id
  ) stats ON u.id = stats.coach_id
  WHERE u.role = 'coach' AND u.status = 'active'
  ORDER BY stats.total_sessions DESC NULLS LAST;
END;
$$;

-- Create indexes to support the analytics functions
CREATE INDEX IF NOT EXISTS idx_users_created_at_date ON users(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at_date ON users(DATE(last_seen_at)) WHERE last_seen_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at_date ON sessions(DATE(scheduled_at));
CREATE INDEX IF NOT EXISTS idx_sessions_coach_status_date ON sessions(coach_id, status, DATE(scheduled_at));

-- Comments for documentation
COMMENT ON FUNCTION get_daily_user_growth IS 'Returns daily user growth metrics including new users, active users, and running totals';
COMMENT ON FUNCTION get_daily_session_metrics IS 'Returns daily session metrics including counts by status and completion rates';  
COMMENT ON FUNCTION get_coach_performance_metrics IS 'Returns coach performance metrics for a given date range';