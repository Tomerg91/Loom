-- =====================================================================
-- Analytics, Goals & Success Metrics Infrastructure
-- =====================================================================
-- This migration creates the comprehensive analytics infrastructure for:
-- 1. Funnel analytics (sign-up through onboarding completion)
-- 2. Coach productivity tracking
-- 3. Client engagement metrics
-- 4. Goals and success metrics tracking
-- =====================================================================

-- =====================================================================
-- 1. EVENT TRACKING SYSTEM
-- =====================================================================

-- Event categories enum
CREATE TYPE event_category AS ENUM (
  'authentication',    -- Sign-up, login, logout, MFA events
  'onboarding',       -- Onboarding step progression
  'session',          -- Session booking, completion, cancellation
  'task',             -- Task creation, updates, completion
  'goal',             -- Goal setting, progress, achievement
  'resource',         -- Resource views, downloads, shares
  'engagement',       -- General user engagement events
  'system',           -- System-level events
  'payment'           -- Payment-related events
);

-- Events table for comprehensive event tracking
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_category event_category NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID,  -- Browser/device session, not coaching session

  -- Event metadata
  properties JSONB DEFAULT '{}'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,  -- User agent, IP, device info, etc.

  -- Related entities
  related_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  related_task_id UUID,
  related_goal_id UUID,

  -- Timing
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_event_name ON events(event_name);
CREATE INDEX idx_events_event_category ON events(event_category);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_user_timestamp ON events(user_id, timestamp DESC);
CREATE INDEX idx_events_properties ON events USING gin(properties);

-- =====================================================================
-- 2. GOALS TRACKING SYSTEM
-- =====================================================================

-- Goal status enum
CREATE TYPE goal_status AS ENUM (
  'active',
  'completed',
  'abandoned',
  'paused'
);

-- Goal priority enum
CREATE TYPE goal_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Goals table
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Goal details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- e.g., 'career', 'health', 'relationships', etc.

  -- Goal tracking
  status goal_status NOT NULL DEFAULT 'active',
  priority goal_priority NOT NULL DEFAULT 'medium',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Dates
  target_date DATE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metrics
  success_criteria JSONB DEFAULT '[]'::jsonb,  -- Array of success criteria
  milestones JSONB DEFAULT '[]'::jsonb,  -- Array of milestones

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT goals_client_is_client CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = client_id AND role = 'client')
  ),
  CONSTRAINT goals_coach_is_coach CHECK (
    coach_id IS NULL OR
    EXISTS (SELECT 1 FROM users WHERE id = coach_id AND role = 'coach')
  )
);

-- Goal progress updates table
CREATE TABLE goal_progress_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Progress details
  previous_percentage INTEGER NOT NULL,
  new_percentage INTEGER NOT NULL,
  notes TEXT,

  -- Related entities
  related_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  related_task_id UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT goal_progress_valid_percentage CHECK (
    new_percentage >= 0 AND new_percentage <= 100
  )
);

-- Indexes for goals
CREATE INDEX idx_goals_client_id ON goals(client_id);
CREATE INDEX idx_goals_coach_id ON goals(coach_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_created_at ON goals(created_at DESC);
CREATE INDEX idx_goal_progress_goal_id ON goal_progress_updates(goal_id);
CREATE INDEX idx_goal_progress_created_at ON goal_progress_updates(created_at DESC);

-- =====================================================================
-- 3. USER ENGAGEMENT METRICS
-- =====================================================================

-- User engagement metrics (daily aggregated)
CREATE TABLE user_engagement_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,

  -- Activity metrics
  sessions_attended INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  goals_updated INTEGER DEFAULT 0,
  resources_viewed INTEGER DEFAULT 0,
  resources_downloaded INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,

  -- Engagement score (0-100)
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),

  -- Time metrics (in minutes)
  active_time_minutes INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint to prevent duplicates
  UNIQUE(user_id, date)
);

CREATE INDEX idx_user_engagement_user_date ON user_engagement_metrics(user_id, date DESC);
CREATE INDEX idx_user_engagement_date ON user_engagement_metrics(date DESC);

-- =====================================================================
-- 4. COACH PRODUCTIVITY METRICS
-- =====================================================================

-- Coach productivity metrics (daily aggregated)
CREATE TABLE coach_productivity_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,

  -- Session metrics
  sessions_scheduled INTEGER DEFAULT 0,
  sessions_completed INTEGER DEFAULT 0,
  sessions_cancelled INTEGER DEFAULT 0,
  total_session_minutes INTEGER DEFAULT 0,

  -- Task management
  tasks_created INTEGER DEFAULT 0,
  tasks_assigned INTEGER DEFAULT 0,

  -- Resource management
  resources_created INTEGER DEFAULT 0,
  resources_shared INTEGER DEFAULT 0,

  -- Client management
  active_clients INTEGER DEFAULT 0,
  new_clients INTEGER DEFAULT 0,

  -- Productivity score (0-100)
  productivity_score INTEGER DEFAULT 0 CHECK (productivity_score >= 0 AND productivity_score <= 100),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(coach_id, date),

  CONSTRAINT coach_productivity_coach_role CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = coach_id AND role = 'coach')
  )
);

CREATE INDEX idx_coach_productivity_coach_date ON coach_productivity_metrics(coach_id, date DESC);
CREATE INDEX idx_coach_productivity_date ON coach_productivity_metrics(date DESC);

-- =====================================================================
-- 5. ONBOARDING FUNNEL TRACKING
-- =====================================================================

-- Onboarding steps enum
CREATE TYPE onboarding_step AS ENUM (
  'signup_started',
  'signup_completed',
  'email_verified',
  'mfa_setup',
  'profile_started',
  'profile_completed',
  'preferences_completed',
  'onboarding_completed'
);

-- Onboarding funnel events
CREATE TABLE onboarding_funnel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  step onboarding_step NOT NULL,

  -- Timing
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_onboarding_funnel_user_id ON onboarding_funnel(user_id);
CREATE INDEX idx_onboarding_funnel_step ON onboarding_funnel(step);
CREATE INDEX idx_onboarding_funnel_completed_at ON onboarding_funnel(completed_at DESC);

-- =====================================================================
-- 6. SESSION QUALITY METRICS
-- =====================================================================

-- Session ratings table (if not exists, complement to reflections)
CREATE TABLE IF NOT EXISTS session_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Ratings (1-5 scale)
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),

  -- Feedback
  feedback TEXT,
  would_recommend BOOLEAN,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_session_ratings_session_id ON session_ratings(session_id);
CREATE INDEX idx_session_ratings_user_id ON session_ratings(user_id);
CREATE INDEX idx_session_ratings_overall ON session_ratings(overall_rating DESC);

-- =====================================================================
-- 7. ANALYTICS FUNCTIONS
-- =====================================================================

-- Function: Get onboarding funnel completion rate
CREATE OR REPLACE FUNCTION get_onboarding_funnel_metrics(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  step onboarding_step,
  users_reached BIGINT,
  completion_percentage NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  total_signups BIGINT;
BEGIN
  -- Get total signups in the period
  SELECT COUNT(DISTINCT user_id) INTO total_signups
  FROM onboarding_funnel
  WHERE step = 'signup_completed'
    AND completed_at >= start_date
    AND completed_at <= end_date;

  -- Return funnel metrics for each step
  RETURN QUERY
  SELECT
    f.step,
    COUNT(DISTINCT f.user_id) as users_reached,
    CASE
      WHEN total_signups > 0 THEN
        ROUND((COUNT(DISTINCT f.user_id)::NUMERIC / total_signups::NUMERIC) * 100, 2)
      ELSE 0
    END as completion_percentage
  FROM onboarding_funnel f
  WHERE f.completed_at >= start_date
    AND f.completed_at <= end_date
  GROUP BY f.step
  ORDER BY
    CASE f.step
      WHEN 'signup_started' THEN 1
      WHEN 'signup_completed' THEN 2
      WHEN 'email_verified' THEN 3
      WHEN 'mfa_setup' THEN 4
      WHEN 'profile_started' THEN 5
      WHEN 'profile_completed' THEN 6
      WHEN 'preferences_completed' THEN 7
      WHEN 'onboarding_completed' THEN 8
    END;
END;
$$;

-- Function: Get coach productivity metrics
CREATE OR REPLACE FUNCTION get_coach_productivity_summary(
  p_coach_id UUID DEFAULT NULL,
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  coach_id UUID,
  coach_name TEXT,
  total_sessions INTEGER,
  sessions_completed INTEGER,
  completion_rate NUMERIC,
  tasks_created INTEGER,
  resources_shared INTEGER,
  active_clients INTEGER,
  avg_productivity_score NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cpm.coach_id,
    CONCAT(u.first_name, ' ', u.last_name) as coach_name,
    SUM(cpm.sessions_scheduled)::INTEGER as total_sessions,
    SUM(cpm.sessions_completed)::INTEGER as sessions_completed,
    CASE
      WHEN SUM(cpm.sessions_scheduled) > 0 THEN
        ROUND((SUM(cpm.sessions_completed)::NUMERIC / SUM(cpm.sessions_scheduled)::NUMERIC) * 100, 2)
      ELSE 0
    END as completion_rate,
    SUM(cpm.tasks_created)::INTEGER as tasks_created,
    SUM(cpm.resources_shared)::INTEGER as resources_shared,
    AVG(cpm.active_clients)::INTEGER as active_clients,
    ROUND(AVG(cpm.productivity_score), 2) as avg_productivity_score
  FROM coach_productivity_metrics cpm
  JOIN users u ON u.id = cpm.coach_id
  WHERE cpm.date >= start_date
    AND cpm.date <= end_date
    AND (p_coach_id IS NULL OR cpm.coach_id = p_coach_id)
  GROUP BY cpm.coach_id, u.first_name, u.last_name
  ORDER BY avg_productivity_score DESC;
END;
$$;

-- Function: Get client engagement metrics
CREATE OR REPLACE FUNCTION get_client_engagement_summary(
  p_client_id UUID DEFAULT NULL,
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  total_sessions INTEGER,
  tasks_completed INTEGER,
  goals_updated INTEGER,
  resources_viewed INTEGER,
  avg_engagement_score NUMERIC,
  days_active INTEGER,
  is_weekly_active BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uem.user_id as client_id,
    CONCAT(u.first_name, ' ', u.last_name) as client_name,
    SUM(uem.sessions_attended)::INTEGER as total_sessions,
    SUM(uem.tasks_completed)::INTEGER as tasks_completed,
    SUM(uem.goals_updated)::INTEGER as goals_updated,
    SUM(uem.resources_viewed)::INTEGER as resources_viewed,
    ROUND(AVG(uem.engagement_score), 2) as avg_engagement_score,
    COUNT(DISTINCT uem.date)::INTEGER as days_active,
    -- Weekly active: at least 2 days of activity in last 7 days
    (COUNT(DISTINCT CASE
      WHEN uem.date >= CURRENT_DATE - INTERVAL '7 days'
      THEN uem.date
    END) >= 2) as is_weekly_active
  FROM user_engagement_metrics uem
  JOIN users u ON u.id = uem.user_id
  WHERE uem.date >= start_date
    AND uem.date <= end_date
    AND u.role = 'client'
    AND (p_client_id IS NULL OR uem.user_id = p_client_id)
  GROUP BY uem.user_id, u.first_name, u.last_name
  ORDER BY avg_engagement_score DESC;
END;
$$;

-- Function: Get goal completion metrics
CREATE OR REPLACE FUNCTION get_goal_completion_metrics(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_goals BIGINT,
  active_goals BIGINT,
  completed_goals BIGINT,
  completion_rate NUMERIC,
  avg_completion_days NUMERIC,
  clients_with_goals BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_goals,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_goals,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_goals,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as completion_rate,
    ROUND(AVG(
      CASE
        WHEN status = 'completed' AND completed_at IS NOT NULL THEN
          EXTRACT(EPOCH FROM (completed_at - started_at)) / 86400
      END
    ), 2) as avg_completion_days,
    COUNT(DISTINCT client_id)::BIGINT as clients_with_goals
  FROM goals
  WHERE created_at >= start_date
    AND created_at <= end_date;
END;
$$;

-- Function: Calculate weekly active clients
CREATE OR REPLACE FUNCTION get_weekly_active_clients(
  reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS BIGINT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  active_count BIGINT;
BEGIN
  -- Weekly active: clients who have completed tasks OR viewed resources in last 7 days
  SELECT COUNT(DISTINCT user_id) INTO active_count
  FROM user_engagement_metrics
  WHERE date >= reference_date - INTERVAL '7 days'
    AND date <= reference_date
    AND (tasks_completed > 0 OR resources_viewed > 0)
    AND user_id IN (SELECT id FROM users WHERE role = 'client');

  RETURN active_count;
END;
$$;

-- Function: Calculate 7-day onboarding completion rate
CREATE OR REPLACE FUNCTION get_onboarding_completion_rate_7day(
  reference_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS NUMERIC
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  signups BIGINT;
  completions BIGINT;
BEGIN
  -- Count signups in the 7-day window before reference_date
  SELECT COUNT(DISTINCT user_id) INTO signups
  FROM onboarding_funnel
  WHERE step = 'signup_completed'
    AND completed_at >= reference_date - INTERVAL '7 days'
    AND completed_at <= reference_date;

  -- Count completions within 7 days of signup
  SELECT COUNT(DISTINCT of_complete.user_id) INTO completions
  FROM onboarding_funnel of_complete
  WHERE of_complete.step = 'onboarding_completed'
    AND EXISTS (
      SELECT 1 FROM onboarding_funnel of_signup
      WHERE of_signup.user_id = of_complete.user_id
        AND of_signup.step = 'signup_completed'
        AND of_signup.completed_at >= reference_date - INTERVAL '7 days'
        AND of_signup.completed_at <= reference_date
        AND of_complete.completed_at <= of_signup.completed_at + INTERVAL '7 days'
    );

  -- Return completion rate as percentage
  IF signups > 0 THEN
    RETURN ROUND((completions::NUMERIC / signups::NUMERIC) * 100, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- =====================================================================
-- 8. RLS POLICIES
-- =====================================================================

-- Enable RLS on all new tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_ratings ENABLE ROW LEVEL SECURITY;

-- Events: Users can view their own events, admins can view all
CREATE POLICY events_select_own ON events
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Events: System can insert (service role)
CREATE POLICY events_insert_system ON events
  FOR INSERT
  WITH CHECK (true);

-- Goals: Clients can view/edit their own goals, coaches can view/edit client goals
CREATE POLICY goals_select_own ON goals
  FOR SELECT
  USING (
    auth.uid() = client_id OR
    auth.uid() = coach_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY goals_insert_own ON goals
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY goals_update_own ON goals
  FOR UPDATE
  USING (
    auth.uid() = client_id OR
    auth.uid() = coach_id
  );

-- Goal progress: Similar to goals
CREATE POLICY goal_progress_select ON goal_progress_updates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_progress_updates.goal_id
        AND (goals.client_id = auth.uid() OR goals.coach_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY goal_progress_insert ON goal_progress_updates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_progress_updates.goal_id
        AND (goals.client_id = auth.uid() OR goals.coach_id = auth.uid())
    )
  );

-- User engagement: Users can view their own metrics, coaches can view their clients', admins all
CREATE POLICY user_engagement_select ON user_engagement_metrics
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.client_id = user_engagement_metrics.user_id
        AND s.coach_id = auth.uid()
    )
  );

-- Coach productivity: Coaches can view their own metrics, admins can view all
CREATE POLICY coach_productivity_select ON coach_productivity_metrics
  FOR SELECT
  USING (
    auth.uid() = coach_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Onboarding funnel: Users can view their own funnel, admins can view all
CREATE POLICY onboarding_funnel_select ON onboarding_funnel
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Session ratings: Users can view/create ratings for sessions they attended
CREATE POLICY session_ratings_select ON session_ratings
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_ratings.session_id
        AND (s.coach_id = auth.uid() OR s.client_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY session_ratings_insert ON session_ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_ratings.session_id
        AND (s.coach_id = auth.uid() OR s.client_id = auth.uid())
    )
  );

-- =====================================================================
-- 9. TRIGGERS FOR AUTOMATIC METRICS UPDATES
-- =====================================================================

-- Function to update engagement metrics on event
CREATE OR REPLACE FUNCTION update_engagement_metrics_on_event()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    -- Insert or update daily engagement metrics
    INSERT INTO user_engagement_metrics (user_id, date)
    VALUES (NEW.user_id, CURRENT_DATE)
    ON CONFLICT (user_id, date) DO UPDATE
    SET updated_at = NOW();

    -- Update specific counters based on event category
    CASE NEW.event_category
      WHEN 'task' THEN
        IF NEW.event_name = 'task_completed' THEN
          UPDATE user_engagement_metrics
          SET tasks_completed = tasks_completed + 1
          WHERE user_id = NEW.user_id AND date = CURRENT_DATE;
        END IF;
      WHEN 'goal' THEN
        IF NEW.event_name IN ('goal_updated', 'goal_progress') THEN
          UPDATE user_engagement_metrics
          SET goals_updated = goals_updated + 1
          WHERE user_id = NEW.user_id AND date = CURRENT_DATE;
        END IF;
      WHEN 'resource' THEN
        IF NEW.event_name = 'resource_viewed' THEN
          UPDATE user_engagement_metrics
          SET resources_viewed = resources_viewed + 1
          WHERE user_id = NEW.user_id AND date = CURRENT_DATE;
        ELSIF NEW.event_name = 'resource_downloaded' THEN
          UPDATE user_engagement_metrics
          SET resources_downloaded = resources_downloaded + 1
          WHERE user_id = NEW.user_id AND date = CURRENT_DATE;
        END IF;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_engagement_metrics
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_metrics_on_event();

-- =====================================================================
-- GRANT PERMISSIONS
-- =====================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_onboarding_funnel_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_productivity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_engagement_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_goal_completion_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_active_clients TO authenticated;
GRANT EXECUTE ON FUNCTION get_onboarding_completion_rate_7day TO authenticated;

-- Grant table permissions
GRANT SELECT ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON goals TO authenticated;
GRANT SELECT, INSERT ON goal_progress_updates TO authenticated;
GRANT SELECT ON user_engagement_metrics TO authenticated;
GRANT SELECT ON coach_productivity_metrics TO authenticated;
GRANT SELECT ON onboarding_funnel TO authenticated;
GRANT SELECT, INSERT ON session_ratings TO authenticated;

-- =====================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================

COMMENT ON TABLE events IS 'Comprehensive event tracking for all user actions and system events';
COMMENT ON TABLE goals IS 'Client goals with progress tracking and success criteria';
COMMENT ON TABLE goal_progress_updates IS 'Historical record of goal progress updates';
COMMENT ON TABLE user_engagement_metrics IS 'Daily aggregated engagement metrics per user';
COMMENT ON TABLE coach_productivity_metrics IS 'Daily aggregated productivity metrics per coach';
COMMENT ON TABLE onboarding_funnel IS 'User onboarding funnel progression tracking';
COMMENT ON TABLE session_ratings IS 'Session quality ratings from participants';
COMMENT ON FUNCTION get_onboarding_funnel_metrics IS 'Calculate onboarding funnel completion rates';
COMMENT ON FUNCTION get_coach_productivity_summary IS 'Get coach productivity metrics and scores';
COMMENT ON FUNCTION get_client_engagement_summary IS 'Get client engagement metrics including weekly active status';
COMMENT ON FUNCTION get_goal_completion_metrics IS 'Get goal completion rates and statistics';
COMMENT ON FUNCTION get_weekly_active_clients IS 'Count weekly active clients';
COMMENT ON FUNCTION get_onboarding_completion_rate_7day IS 'Calculate 7-day onboarding completion rate';
