-- Create helpful database functions and views

-- Function to get user's upcoming sessions
CREATE OR REPLACE FUNCTION get_upcoming_sessions(user_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  status session_status,
  coach_name TEXT,
  client_name TEXT,
  meeting_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.scheduled_at,
    s.duration_minutes,
    s.status,
    CONCAT(coach.first_name, ' ', coach.last_name) as coach_name,
    CONCAT(client.first_name, ' ', client.last_name) as client_name,
    s.meeting_url
  FROM sessions s
  JOIN users coach ON s.coach_id = coach.id
  JOIN users client ON s.client_id = client.id
  WHERE (s.coach_id = user_id OR s.client_id = user_id)
    AND s.scheduled_at > NOW()
    AND s.status IN ('scheduled', 'in_progress')
  ORDER BY s.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a time slot is available for a coach
CREATE OR REPLACE FUNCTION is_time_slot_available(
  coach_id UUID,
  start_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  end_time TIMESTAMP WITH TIME ZONE;
  conflict_count INTEGER;
BEGIN
  end_time := start_time + (duration_minutes || ' minutes')::INTERVAL;
  
  SELECT COUNT(*)
  INTO conflict_count
  FROM sessions
  WHERE coach_id = is_time_slot_available.coach_id
    AND status IN ('scheduled', 'in_progress')
    AND (
      (scheduled_at <= start_time AND scheduled_at + (duration_minutes || ' minutes')::INTERVAL > start_time)
      OR
      (scheduled_at < end_time AND scheduled_at + (duration_minutes || ' minutes')::INTERVAL >= end_time)
      OR
      (scheduled_at >= start_time AND scheduled_at + (duration_minutes || ' minutes')::INTERVAL <= end_time)
    );
  
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available time slots for a coach on a specific date
CREATE OR REPLACE FUNCTION get_available_time_slots(
  coach_id UUID,
  target_date DATE,
  slot_duration INTEGER DEFAULT 60
)
RETURNS TABLE (
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN
) AS $$
DECLARE
  day_of_week INTEGER;
  availability_record RECORD;
  current_time TIME;
  slot_start TIME;
  slot_end TIME;
BEGIN
  -- Get day of week (0 = Sunday, 1 = Monday, etc.)
  day_of_week := EXTRACT(DOW FROM target_date);
  
  -- Get coach availability for this day
  FOR availability_record IN
    SELECT ca.start_time, ca.end_time, ca.is_available
    FROM coach_availability ca
    WHERE ca.coach_id = get_available_time_slots.coach_id
      AND ca.day_of_week = get_available_time_slots.day_of_week
      AND ca.is_available = true
  LOOP
    -- Generate time slots within availability window
    current_time := availability_record.start_time;
    
    WHILE current_time + (slot_duration || ' minutes')::INTERVAL <= availability_record.end_time::TIME LOOP
      slot_start := current_time;
      slot_end := current_time + (slot_duration || ' minutes')::INTERVAL;
      
      -- Check if this slot conflicts with existing sessions
      RETURN QUERY
      SELECT 
        slot_start,
        slot_end,
        is_time_slot_available(
          get_available_time_slots.coach_id,
          target_date + slot_start,
          slot_duration
        );
      
      current_time := current_time + (slot_duration || ' minutes')::INTERVAL;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new session with validation
CREATE OR REPLACE FUNCTION create_session(
  coach_id UUID,
  client_id UUID,
  title TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 60,
  description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_session_id UUID;
  coach_role user_role;
  client_role user_role;
BEGIN
  -- Validate user roles
  SELECT role INTO coach_role FROM users WHERE id = create_session.coach_id;
  SELECT role INTO client_role FROM users WHERE id = create_session.client_id;
  
  IF coach_role != 'coach' THEN
    RAISE EXCEPTION 'Coach ID must reference a user with coach role';
  END IF;
  
  IF client_role != 'client' THEN
    RAISE EXCEPTION 'Client ID must reference a user with client role';
  END IF;
  
  -- Check if time slot is available
  IF NOT is_time_slot_available(create_session.coach_id, create_session.scheduled_at, create_session.duration_minutes) THEN
    RAISE EXCEPTION 'Time slot is not available';
  END IF;
  
  -- Create the session
  INSERT INTO sessions (coach_id, client_id, title, description, scheduled_at, duration_minutes)
  VALUES (create_session.coach_id, create_session.client_id, create_session.title, create_session.description, create_session.scheduled_at, create_session.duration_minutes)
  RETURNING id INTO new_session_id;
  
  RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for session details with user information
CREATE OR REPLACE VIEW session_details AS
SELECT 
  s.id,
  s.title,
  s.description,
  s.scheduled_at,
  s.duration_minutes,
  s.status,
  s.meeting_url,
  s.notes,
  s.created_at,
  s.updated_at,
  
  -- Coach information
  s.coach_id,
  CONCAT(coach.first_name, ' ', coach.last_name) as coach_name,
  coach.email as coach_email,
  coach.avatar_url as coach_avatar_url,
  
  -- Client information
  s.client_id,
  CONCAT(client.first_name, ' ', client.last_name) as client_name,
  client.email as client_email,
  client.avatar_url as client_avatar_url
  
FROM sessions s
JOIN users coach ON s.coach_id = coach.id
JOIN users client ON s.client_id = client.id;

-- View for coach statistics
CREATE OR REPLACE VIEW coach_statistics AS
SELECT 
  u.id as coach_id,
  CONCAT(u.first_name, ' ', u.last_name) as coach_name,
  
  -- Session counts
  COUNT(s.id) as total_sessions,
  COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_sessions,
  COUNT(CASE WHEN s.status = 'scheduled' AND s.scheduled_at > NOW() THEN 1 END) as upcoming_sessions,
  COUNT(CASE WHEN s.status = 'cancelled' THEN 1 END) as cancelled_sessions,
  
  -- Client counts
  COUNT(DISTINCT s.client_id) as total_clients,
  COUNT(DISTINCT CASE WHEN s.scheduled_at > NOW() - INTERVAL '30 days' THEN s.client_id END) as active_clients,
  
  -- Time periods
  COUNT(CASE WHEN s.scheduled_at > NOW() - INTERVAL '7 days' THEN 1 END) as sessions_this_week,
  COUNT(CASE WHEN s.scheduled_at > NOW() - INTERVAL '30 days' THEN 1 END) as sessions_this_month,
  
  -- Ratings (if we add them later)
  AVG(CASE WHEN s.status = 'completed' THEN 5.0 END) as average_rating -- Placeholder
  
FROM users u
LEFT JOIN sessions s ON u.id = s.coach_id
WHERE u.role = 'coach'
GROUP BY u.id, u.first_name, u.last_name;

-- View for client progress
CREATE OR REPLACE VIEW client_progress AS
SELECT 
  u.id as client_id,
  CONCAT(u.first_name, ' ', u.last_name) as client_name,
  
  -- Session counts
  COUNT(s.id) as total_sessions,
  COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_sessions,
  COUNT(CASE WHEN s.status = 'scheduled' AND s.scheduled_at > NOW() THEN 1 END) as upcoming_sessions,
  
  -- Reflection counts
  COUNT(r.id) as total_reflections,
  AVG(r.mood_rating) as average_mood_rating,
  
  -- Recent activity
  MAX(s.scheduled_at) as last_session_date,
  MAX(r.created_at) as last_reflection_date,
  
  -- Progress indicators
  COUNT(CASE WHEN s.scheduled_at > NOW() - INTERVAL '30 days' THEN 1 END) as sessions_this_month,
  COUNT(CASE WHEN r.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as reflections_this_month
  
FROM users u
LEFT JOIN sessions s ON u.id = s.client_id
LEFT JOIN reflections r ON u.id = r.client_id
WHERE u.role = 'client'
GROUP BY u.id, u.first_name, u.last_name;

-- Function to send notification (placeholder for future implementation)
CREATE OR REPLACE FUNCTION send_notification(
  user_id UUID,
  notification_type notification_type,
  title TEXT,
  message TEXT,
  data JSONB DEFAULT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data, scheduled_for)
  VALUES (send_notification.user_id, send_notification.notification_type, send_notification.title, send_notification.message, send_notification.data, send_notification.scheduled_for)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  user_id UUID,
  notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF notification_ids IS NULL THEN
    -- Mark all unread notifications as read
    UPDATE notifications 
    SET read_at = NOW()
    WHERE notifications.user_id = mark_notifications_read.user_id
      AND read_at IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSE
    -- Mark specific notifications as read
    UPDATE notifications 
    SET read_at = NOW()
    WHERE notifications.user_id = mark_notifications_read.user_id
      AND id = ANY(notification_ids)
      AND read_at IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  END IF;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant appropriate permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_upcoming_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_time_slot_available(UUID, TIMESTAMP WITH TIME ZONE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_time_slots(UUID, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_session(UUID, UUID, TEXT, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_notification(UUID, notification_type, TEXT, TEXT, JSONB, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notifications_read(UUID, UUID[]) TO authenticated;

GRANT SELECT ON session_details TO authenticated;
GRANT SELECT ON coach_statistics TO authenticated;
GRANT SELECT ON client_progress TO authenticated;