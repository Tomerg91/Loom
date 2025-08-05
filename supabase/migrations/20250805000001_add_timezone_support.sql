-- Add timezone support to coach availability
-- This migration addresses the critical timezone handling issue

-- Add timezone column to coach_availability table
ALTER TABLE coach_availability 
ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN buffer_before_minutes INTEGER DEFAULT 0,
ADD COLUMN buffer_after_minutes INTEGER DEFAULT 0,
ADD COLUMN max_bookings_per_slot INTEGER DEFAULT 1;

-- Add timezone column to users table for coach's default timezone
ALTER TABLE users 
ADD COLUMN timezone TEXT DEFAULT 'UTC';

-- Add indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coach_availability_timezone 
ON coach_availability(timezone);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coach_availability_time_range 
ON coach_availability(coach_id, day_of_week, start_time, end_time, timezone) 
WHERE is_available = true;

-- Create function to validate session availability with timezone awareness
CREATE OR REPLACE FUNCTION validate_session_availability_with_timezone(
  p_coach_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_duration_minutes INTEGER,
  p_coach_timezone TEXT DEFAULT 'UTC'
) RETURNS BOOLEAN AS $$
DECLARE
  available_slots INTEGER;
  coach_local_time TIME;
  coach_day_of_week INTEGER;
BEGIN
  -- Convert scheduled time to coach's timezone
  coach_local_time := (p_scheduled_at AT TIME ZONE p_coach_timezone)::TIME;
  coach_day_of_week := EXTRACT(DOW FROM (p_scheduled_at AT TIME ZONE p_coach_timezone));
  
  -- Check if time slot is within coach availability
  SELECT COUNT(*) INTO available_slots
  FROM coach_availability ca
  WHERE ca.coach_id = p_coach_id
    AND ca.day_of_week = coach_day_of_week
    AND ca.start_time <= coach_local_time
    AND ca.end_time >= (coach_local_time + (p_duration_minutes * INTERVAL '1 minute'))
    AND ca.is_available = true
    AND (ca.timezone = p_coach_timezone OR ca.timezone IS NULL);
    
  RETURN available_slots > 0;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to prevent overlapping sessions with timezone awareness
-- Note: This is a simplified version - production would need more sophisticated logic
ALTER TABLE sessions 
ADD CONSTRAINT check_session_within_availability
CHECK (
  validate_session_availability_with_timezone(
    coach_id, 
    scheduled_at, 
    duration_minutes,
    (SELECT timezone FROM users WHERE id = coach_id LIMIT 1)
  )
);

-- Update existing coach_availability records to use coach's timezone if available
UPDATE coach_availability 
SET timezone = COALESCE(
  (SELECT u.timezone FROM users u WHERE u.id = coach_availability.coach_id LIMIT 1),
  'UTC'
);

-- Create view for timezone-aware availability queries
CREATE OR REPLACE VIEW coach_availability_with_timezone AS
SELECT 
  ca.*,
  u.timezone as coach_default_timezone,
  COALESCE(ca.timezone, u.timezone, 'UTC') as effective_timezone
FROM coach_availability ca
JOIN users u ON ca.coach_id = u.id
WHERE u.role = 'coach';

-- Grant permissions
GRANT SELECT ON coach_availability_with_timezone TO authenticated;

-- Add helpful comment
COMMENT ON TABLE coach_availability IS 'Coach availability slots with timezone support. Times are stored in local TIME format with associated timezone.';
COMMENT ON COLUMN coach_availability.timezone IS 'Timezone for this availability slot (e.g., America/New_York, Europe/London, UTC)';
COMMENT ON COLUMN coach_availability.buffer_before_minutes IS 'Buffer time before session starts (for preparation)';
COMMENT ON COLUMN coach_availability.buffer_after_minutes IS 'Buffer time after session ends (for notes, cleanup)';
COMMENT ON COLUMN users.timezone IS 'Coach default timezone for new availability slots';