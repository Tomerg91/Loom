-- Performance Optimization Migration
-- Sprint 06 Story 8: Performance Optimization
-- Created: 2025-11-06
--
-- This migration implements critical performance optimizations identified in the
-- Performance Audit Report (docs/reports/PERFORMANCE_AUDIT_REPORT.md)
--
-- Expected Performance Gains:
-- - getCoachClients: 300ms → 15ms (20x faster)
-- - getParticipantStats: 250ms → 10ms (25x faster)
-- - Filtered queries: 100ms → 5-10ms (10x faster)

-- ============================================================================
-- 1. COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Sessions: coach queries with status filtering (most common pattern)
CREATE INDEX IF NOT EXISTS idx_sessions_coach_status_scheduled
ON sessions(coach_id, status, scheduled_at DESC)
WHERE status IS NOT NULL;

-- Sessions: client queries with status filtering
CREATE INDEX IF NOT EXISTS idx_sessions_client_status_scheduled
ON sessions(client_id, status, scheduled_at DESC)
WHERE status IS NOT NULL;

-- Sessions: queries between specific coach-client pairs
CREATE INDEX IF NOT EXISTS idx_sessions_coach_client_scheduled
ON sessions(coach_id, client_id, scheduled_at DESC);

-- Sessions: upcoming sessions query optimization
CREATE INDEX IF NOT EXISTS idx_sessions_upcoming
ON sessions(scheduled_at)
WHERE status IN ('scheduled', 'in_progress')
AND scheduled_at > NOW();

-- Sessions: past sessions for history/analytics
CREATE INDEX IF NOT EXISTS idx_sessions_past_completed
ON sessions(scheduled_at DESC)
WHERE status = 'completed'
AND scheduled_at < NOW();

-- ============================================================================
-- 2. NOTIFICATIONS PERFORMANCE INDEXES
-- ============================================================================

-- Notifications: unread messages query (very frequent)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_scheduled
ON notifications(user_id, scheduled_for)
WHERE read_at IS NULL;

-- Notifications: mark all as read optimization
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at
ON notifications(user_id, read_at);

-- Notifications: notification type filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_type
ON notifications(user_id, type, created_at DESC);

-- ============================================================================
-- 3. FILE SHARES PERFORMANCE INDEXES
-- ============================================================================

-- File shares: queries by shared_with user (client viewing their files)
CREATE INDEX IF NOT EXISTS idx_file_shares_shared_with_active
ON file_shares(shared_with, shared_at DESC)
WHERE expires_at IS NULL OR expires_at > NOW();

-- File shares: queries by owner (coach viewing share status)
CREATE INDEX IF NOT EXISTS idx_file_shares_owner_active
ON file_shares(shared_by, shared_at DESC)
WHERE expires_at IS NULL OR expires_at > NOW();

-- File shares: file-specific shares lookup
CREATE INDEX IF NOT EXISTS idx_file_shares_file_shared_with
ON file_shares(file_id, shared_with);

-- ============================================================================
-- 4. USERS TABLE PERFORMANCE INDEXES
-- ============================================================================

-- Users: role-based queries (get all coaches/clients)
CREATE INDEX IF NOT EXISTS idx_users_role_created_at
ON users(role, created_at DESC)
WHERE role IS NOT NULL;

-- Users: email lookup (sign-in, forgot password)
-- Note: Supabase Auth handles this, but for users table queries
CREATE INDEX IF NOT EXISTS idx_users_email_lower
ON users(LOWER(email));

-- Users: active users filter
CREATE INDEX IF NOT EXISTS idx_users_status_last_seen
ON users(status, last_seen_at DESC)
WHERE status = 'active';

-- ============================================================================
-- 5. MESSAGES PERFORMANCE INDEXES
-- ============================================================================

-- Messages: conversation view (most common query)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at DESC);

-- Messages: unread count per user
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread
ON messages(recipient_id, created_at DESC)
WHERE read_at IS NULL;

-- Messages: sender's sent messages
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
ON messages(sender_id, created_at DESC);

-- ============================================================================
-- 6. TASKS PERFORMANCE INDEXES
-- ============================================================================

-- Tasks: client's assigned tasks
CREATE INDEX IF NOT EXISTS idx_tasks_client_due_date
ON tasks(client_id, due_date)
WHERE status != 'completed';

-- Tasks: coach's created tasks
CREATE INDEX IF NOT EXISTS idx_tasks_coach_created
ON tasks(coach_id, created_at DESC);

-- Tasks: overdue tasks alert
CREATE INDEX IF NOT EXISTS idx_tasks_overdue
ON tasks(due_date, status)
WHERE status NOT IN ('completed', 'cancelled')
AND due_date < NOW();

-- ============================================================================
-- 7. PRACTICE JOURNAL PERFORMANCE INDEXES
-- ============================================================================

-- Practice journal: client's entries chronological
CREATE INDEX IF NOT EXISTS idx_practice_journal_client_date
ON practice_journal(client_id, practice_date DESC);

-- Practice journal: shared entries for coach review
CREATE INDEX IF NOT EXISTS idx_practice_journal_client_shared
ON practice_journal(client_id, shared_with_coach, practice_date DESC)
WHERE shared_with_coach = true;

-- Practice journal: recent entries across all clients (coach dashboard)
CREATE INDEX IF NOT EXISTS idx_practice_journal_coach_shared_date
ON practice_journal(coach_id, practice_date DESC)
WHERE shared_with_coach = true;

-- ============================================================================
-- 8. SQL AGGREGATION FUNCTIONS (Replace JavaScript Logic)
-- ============================================================================

-- Function: Get coach's clients with session counts
-- Replaces: JavaScript aggregation in getCoachClients
-- Performance: 300ms → 15ms (20x faster)
CREATE OR REPLACE FUNCTION get_coach_clients(coach_uuid UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  role TEXT,
  session_count BIGINT,
  completed_sessions BIGINT,
  upcoming_sessions BIGINT,
  last_session_date TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) as full_name,
    u.role,
    COUNT(s.id) as session_count,
    COUNT(s.id) FILTER (WHERE s.status = 'completed') as completed_sessions,
    COUNT(s.id) FILTER (
      WHERE s.status IN ('scheduled', 'in_progress')
      AND s.scheduled_at > NOW()
    ) as upcoming_sessions,
    MAX(s.scheduled_at) as last_session_date
  FROM users u
  INNER JOIN sessions s ON s.client_id = u.id
  WHERE s.coach_id = coach_uuid
  GROUP BY u.id, u.email, u.first_name, u.last_name, u.role
  ORDER BY session_count DESC;
END;
$$;

-- Function: Get participant statistics
-- Replaces: JavaScript counting in getParticipantStats
-- Performance: 250ms → 10ms (25x faster)
CREATE OR REPLACE FUNCTION get_participant_stats(user_uuid UUID)
RETURNS TABLE (
  total_sessions BIGINT,
  completed_sessions BIGINT,
  cancelled_sessions BIGINT,
  upcoming_sessions BIGINT,
  past_sessions BIGINT,
  sessions_as_coach BIGINT,
  sessions_as_client BIGINT,
  total_session_hours NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_sessions,
    COUNT(*) FILTER (
      WHERE status IN ('scheduled', 'in_progress')
      AND scheduled_at > NOW()
    ) as upcoming_sessions,
    COUNT(*) FILTER (
      WHERE status = 'completed'
      AND scheduled_at < NOW()
    ) as past_sessions,
    COUNT(*) FILTER (WHERE coach_id = user_uuid) as sessions_as_coach,
    COUNT(*) FILTER (WHERE client_id = user_uuid) as sessions_as_client,
    COALESCE(SUM(duration_minutes) / 60.0, 0) as total_session_hours
  FROM sessions
  WHERE coach_id = user_uuid OR client_id = user_uuid;
END;
$$;

-- Function: Get session analytics for coach dashboard
-- Aggregates session data for analytics widgets
CREATE OR REPLACE FUNCTION get_coach_session_analytics(
  coach_uuid UUID,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_sessions BIGINT,
  completed_sessions BIGINT,
  cancelled_sessions BIGINT,
  no_show_sessions BIGINT,
  total_clients BIGINT,
  active_clients BIGINT,
  total_hours NUMERIC,
  avg_session_rating NUMERIC,
  sessions_this_week BIGINT,
  sessions_this_month BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show') as no_show,
      COUNT(DISTINCT client_id) as clients,
      COUNT(DISTINCT client_id) FILTER (
        WHERE scheduled_at > NOW() - INTERVAL '30 days'
      ) as active,
      COALESCE(SUM(duration_minutes) / 60.0, 0) as hours,
      AVG(client_rating) FILTER (WHERE client_rating IS NOT NULL) as avg_rating,
      COUNT(*) FILTER (
        WHERE scheduled_at > DATE_TRUNC('week', NOW())
      ) as this_week,
      COUNT(*) FILTER (
        WHERE scheduled_at > DATE_TRUNC('month', NOW())
      ) as this_month
    FROM sessions
    WHERE coach_id = coach_uuid
      AND scheduled_at BETWEEN start_date AND end_date
  )
  SELECT * FROM session_stats;
END;
$$;

-- Function: Get client progress summary
-- Returns comprehensive progress metrics for a client
CREATE OR REPLACE FUNCTION get_client_progress_summary(client_uuid UUID)
RETURNS TABLE (
  total_sessions BIGINT,
  completed_sessions BIGINT,
  total_tasks BIGINT,
  completed_tasks BIGINT,
  overdue_tasks BIGINT,
  total_practice_entries BIGINT,
  practice_entries_this_month BIGINT,
  avg_practice_duration NUMERIC,
  resources_assigned BIGINT,
  resources_viewed BIGINT,
  resources_completed BIGINT,
  last_session_date TIMESTAMPTZ,
  next_session_date TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Session metrics
    (SELECT COUNT(*) FROM sessions WHERE client_id = client_uuid) as total_sessions,
    (SELECT COUNT(*) FROM sessions WHERE client_id = client_uuid AND status = 'completed') as completed_sessions,

    -- Task metrics
    (SELECT COUNT(*) FROM tasks WHERE client_id = client_uuid) as total_tasks,
    (SELECT COUNT(*) FROM tasks WHERE client_id = client_uuid AND status = 'completed') as completed_tasks,
    (SELECT COUNT(*) FROM tasks
     WHERE client_id = client_uuid
     AND status NOT IN ('completed', 'cancelled')
     AND due_date < NOW()) as overdue_tasks,

    -- Practice journal metrics
    (SELECT COUNT(*) FROM practice_journal WHERE client_id = client_uuid) as total_practice_entries,
    (SELECT COUNT(*) FROM practice_journal
     WHERE client_id = client_uuid
     AND practice_date > NOW() - INTERVAL '30 days') as practice_entries_this_month,
    (SELECT AVG(duration_minutes) FROM practice_journal WHERE client_id = client_uuid) as avg_practice_duration,

    -- Resource metrics
    (SELECT COUNT(*) FROM resource_assignments WHERE client_id = client_uuid) as resources_assigned,
    (SELECT COUNT(*) FROM resource_assignments WHERE client_id = client_uuid AND viewed_at IS NOT NULL) as resources_viewed,
    (SELECT COUNT(*) FROM resource_assignments WHERE client_id = client_uuid AND completed_at IS NOT NULL) as resources_completed,

    -- Session dates
    (SELECT MAX(scheduled_at) FROM sessions
     WHERE client_id = client_uuid
     AND status = 'completed'
     AND scheduled_at < NOW()) as last_session_date,
    (SELECT MIN(scheduled_at) FROM sessions
     WHERE client_id = client_uuid
     AND status = 'scheduled'
     AND scheduled_at > NOW()) as next_session_date;
END;
$$;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_coach_clients(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_participant_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_session_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_progress_summary(UUID) TO authenticated;

-- ============================================================================
-- 10. ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

-- Update table statistics for optimal query planning
ANALYZE sessions;
ANALYZE notifications;
ANALYZE file_shares;
ANALYZE users;
ANALYZE messages;
ANALYZE tasks;
ANALYZE practice_journal;
ANALYZE resource_assignments;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_sessions_coach_status_scheduled IS
'Optimizes coach dashboard queries filtering by status and sorting by date';

COMMENT ON INDEX idx_sessions_upcoming IS
'Optimizes upcoming sessions widget on both coach and client dashboards';

COMMENT ON INDEX idx_notifications_user_unread_scheduled IS
'Optimizes unread notification count and notification list queries';

COMMENT ON FUNCTION get_coach_clients IS
'Returns coach clients with aggregated session statistics. Replaces JavaScript aggregation for 20x performance improvement.';

COMMENT ON FUNCTION get_participant_stats IS
'Returns comprehensive session statistics for a user (as coach and client). Replaces JavaScript counting for 25x performance improvement.';

COMMENT ON FUNCTION get_coach_session_analytics IS
'Returns detailed analytics for coach dashboard widgets. Single query replaces multiple separate queries.';

COMMENT ON FUNCTION get_client_progress_summary IS
'Returns comprehensive progress metrics for client profile. Single query aggregates data from multiple tables.';
