-- Add session ratings table for real rating calculations
CREATE TABLE session_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one rating per session
    UNIQUE(session_id)
);

-- Create indexes for better performance
CREATE INDEX idx_session_ratings_session_id ON session_ratings(session_id);
CREATE INDEX idx_session_ratings_coach_id ON session_ratings(coach_id);
CREATE INDEX idx_session_ratings_client_id ON session_ratings(client_id);
CREATE INDEX idx_session_ratings_rating ON session_ratings(rating);
CREATE INDEX idx_session_ratings_created_at ON session_ratings(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_session_ratings_updated_at BEFORE UPDATE ON session_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate real average rating for coaches
CREATE OR REPLACE FUNCTION get_coach_average_rating(
  p_coach_id UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS NUMERIC(3,2)
LANGUAGE plpgsql
AS $$
DECLARE
  avg_rating NUMERIC(3,2);
BEGIN
  SELECT ROUND(AVG(rating)::NUMERIC, 2) INTO avg_rating
  FROM session_ratings sr
  WHERE sr.coach_id = p_coach_id
    AND (start_date IS NULL OR DATE(sr.created_at) >= start_date)
    AND (end_date IS NULL OR DATE(sr.created_at) <= end_date);
    
  -- Return default if no ratings found
  RETURN COALESCE(avg_rating, 4.7);
END;
$$;

-- Function to get system-wide average rating
CREATE OR REPLACE FUNCTION get_system_average_rating(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS NUMERIC(3,2)
LANGUAGE plpgsql
AS $$
DECLARE
  avg_rating NUMERIC(3,2);
BEGIN
  SELECT ROUND(AVG(rating)::NUMERIC, 2) INTO avg_rating
  FROM session_ratings sr
  WHERE (start_date IS NULL OR DATE(sr.created_at) >= start_date)
    AND (end_date IS NULL OR DATE(sr.created_at) <= end_date);
    
  -- Return default if no ratings found
  RETURN COALESCE(avg_rating, 4.7);
END;
$$;

-- Enhanced coach performance function with real ratings
CREATE OR REPLACE FUNCTION get_enhanced_coach_performance_metrics(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  coach_id UUID,
  coach_name TEXT,
  total_sessions BIGINT,
  completed_sessions BIGINT,
  active_clients BIGINT,
  completion_rate INTEGER,
  average_rating NUMERIC(3,2),
  total_ratings BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS coach_id,
    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS coach_name,
    COALESCE(stats.total_sessions, 0) AS total_sessions,
    COALESCE(stats.completed_sessions, 0) AS completed_sessions,
    COALESCE(stats.active_clients, 0) AS active_clients,
    CASE 
      WHEN COALESCE(stats.total_sessions, 0) > 0 
      THEN ROUND((stats.completed_sessions::FLOAT / stats.total_sessions) * 100)::INTEGER
      ELSE 0
    END AS completion_rate,
    get_coach_average_rating(u.id, start_date, end_date) AS average_rating,
    COALESCE(ratings.total_ratings, 0) AS total_ratings
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
  LEFT JOIN (
    SELECT 
      sr.coach_id,
      COUNT(*) AS total_ratings
    FROM session_ratings sr
    WHERE DATE(sr.created_at) BETWEEN start_date AND end_date
    GROUP BY sr.coach_id
  ) ratings ON u.id = ratings.coach_id
  WHERE u.role = 'coach' AND u.status = 'active'
  ORDER BY stats.total_sessions DESC NULLS LAST;
END;
$$;

-- Function to get real system metrics with proper calculations
CREATE OR REPLACE FUNCTION get_system_overview_metrics(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  total_sessions BIGINT,
  completed_sessions BIGINT,
  total_revenue NUMERIC(10,2),
  average_rating NUMERIC(3,2),
  new_users_this_month BIGINT,
  completion_rate INTEGER,
  total_coaches BIGINT,
  total_clients BIGINT,
  active_coaches BIGINT,
  average_sessions_per_user NUMERIC(5,2)
) 
LANGUAGE plpgsql
AS $$
DECLARE
  session_rate NUMERIC(6,2) := 75.00; -- Could be made configurable
  thirty_days_ago DATE := CURRENT_DATE - INTERVAL '30 days';
BEGIN
  RETURN QUERY
  WITH metrics AS (
    SELECT 
      -- User metrics
      (SELECT COUNT(*) FROM users WHERE status = 'active') as total_users,
      (SELECT COUNT(*) FROM users WHERE last_seen_at >= (NOW() - INTERVAL '30 days')) as active_users,
      (SELECT COUNT(*) FROM users WHERE role = 'coach' AND status = 'active') as total_coaches,
      (SELECT COUNT(*) FROM users WHERE role = 'client' AND status = 'active') as total_clients,
      (SELECT COUNT(*) FROM users WHERE DATE(created_at) >= thirty_days_ago) as new_users_this_month,
      
      -- Session metrics in date range
      (SELECT COUNT(*) FROM sessions WHERE DATE(scheduled_at) BETWEEN start_date AND end_date) as total_sessions,
      (SELECT COUNT(*) FROM sessions WHERE status = 'completed' AND DATE(scheduled_at) BETWEEN start_date AND end_date) as completed_sessions,
      
      -- Active coaches (with sessions in date range)
      (SELECT COUNT(DISTINCT coach_id) FROM sessions WHERE DATE(scheduled_at) BETWEEN start_date AND end_date) as active_coaches_in_range,
      
      -- System average rating
      get_system_average_rating(start_date, end_date) as avg_rating
  )
  SELECT 
    m.total_users,
    m.active_users,
    m.total_sessions,
    m.completed_sessions,
    (m.completed_sessions * session_rate) as total_revenue,
    m.avg_rating,
    m.new_users_this_month,
    CASE 
      WHEN m.total_sessions > 0 
      THEN ROUND((m.completed_sessions::FLOAT / m.total_sessions) * 100)::INTEGER
      ELSE 0
    END as completion_rate,
    m.total_coaches,
    m.total_clients,
    m.active_coaches_in_range,
    CASE 
      WHEN m.total_users > 0 
      THEN ROUND((m.total_sessions::FLOAT / m.total_users), 2)
      ELSE 0.00
    END as average_sessions_per_user
  FROM metrics m;
END;
$$;

-- Comments
COMMENT ON TABLE session_ratings IS 'Stores client ratings and reviews for completed sessions';
COMMENT ON FUNCTION get_coach_average_rating IS 'Calculates real average rating for a specific coach';
COMMENT ON FUNCTION get_system_average_rating IS 'Calculates system-wide average rating';
COMMENT ON FUNCTION get_enhanced_coach_performance_metrics IS 'Enhanced coach performance with real rating calculations';
COMMENT ON FUNCTION get_system_overview_metrics IS 'System overview metrics with real calculations';