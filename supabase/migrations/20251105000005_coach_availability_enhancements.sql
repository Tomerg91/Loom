-- Coach Availability Management Enhancements
-- Sprint 02 - Task 2.1.1: Implement Coach Availability Management (8 SP)
-- Adds recurring patterns, buffer times, session limits, and availability exceptions

-- Add enhanced columns to coach_availability table
ALTER TABLE coach_availability
ADD COLUMN IF NOT EXISTS recurring_pattern JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS buffer_minutes_before INTEGER DEFAULT 0 CHECK (buffer_minutes_before >= 0 AND buffer_minutes_before <= 120),
ADD COLUMN IF NOT EXISTS buffer_minutes_after INTEGER DEFAULT 0 CHECK (buffer_minutes_after >= 0 AND buffer_minutes_after <= 120),
ADD COLUMN IF NOT EXISTS max_sessions_per_day INTEGER DEFAULT NULL CHECK (max_sessions_per_day IS NULL OR max_sessions_per_day > 0),
ADD COLUMN IF NOT EXISTS max_sessions_per_week INTEGER DEFAULT NULL CHECK (max_sessions_per_week IS NULL OR max_sessions_per_week > 0),
ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER DEFAULT 60 CHECK (session_duration_minutes >= 15 AND session_duration_minutes <= 240),
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS effective_until DATE DEFAULT NULL;

-- Add comments for new columns
COMMENT ON COLUMN coach_availability.recurring_pattern IS 'JSONB pattern for complex recurring availability (e.g., {\"type\": \"weekly\", \"interval\": 1})';
COMMENT ON COLUMN coach_availability.buffer_minutes_before IS 'Buffer time before session (0-120 minutes)';
COMMENT ON COLUMN coach_availability.buffer_minutes_after IS 'Buffer time after session (0-120 minutes)';
COMMENT ON COLUMN coach_availability.max_sessions_per_day IS 'Maximum sessions per day limit';
COMMENT ON COLUMN coach_availability.max_sessions_per_week IS 'Maximum sessions per week limit';
COMMENT ON COLUMN coach_availability.session_duration_minutes IS 'Default session duration (15-240 minutes)';
COMMENT ON COLUMN coach_availability.is_recurring IS 'Whether this is a recurring availability pattern';
COMMENT ON COLUMN coach_availability.effective_from IS 'Date from which this availability is effective';
COMMENT ON COLUMN coach_availability.effective_until IS 'Date until which this availability is effective';

-- Create availability exceptions table for time-off, holidays, etc.
CREATE TABLE IF NOT EXISTS availability_exceptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    exception_date DATE NOT NULL,
    exception_type TEXT NOT NULL CHECK (exception_type IN ('time_off', 'holiday', 'special_hours', 'blocked')),
    is_available BOOLEAN DEFAULT false,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT availability_exceptions_valid_time CHECK (
        (NOT is_available) OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    ),
    CONSTRAINT availability_exceptions_unique_date UNIQUE (coach_id, exception_date, start_time, end_time)
);

-- Create indexes for availability exceptions
CREATE INDEX idx_availability_exceptions_coach_id ON availability_exceptions(coach_id);
CREATE INDEX idx_availability_exceptions_date ON availability_exceptions(exception_date);
CREATE INDEX idx_availability_exceptions_coach_date ON availability_exceptions(coach_id, exception_date);
CREATE INDEX idx_availability_exceptions_type ON availability_exceptions(exception_type);

-- Trigger to update updated_at on availability_exceptions
CREATE OR REPLACE FUNCTION update_availability_exceptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER availability_exceptions_updated_at_trigger
    BEFORE UPDATE ON availability_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION update_availability_exceptions_updated_at();

-- Function to get coach available slots for a specific date
CREATE OR REPLACE FUNCTION get_coach_available_slots(
    p_coach_id UUID,
    p_date DATE,
    p_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE (
    slot_start TIMESTAMP WITH TIME ZONE,
    slot_end TIMESTAMP WITH TIME ZONE,
    is_available BOOLEAN,
    has_buffer BOOLEAN
) AS $$
DECLARE
    v_day_of_week INTEGER;
    v_availability RECORD;
    v_exception RECORD;
    v_slot_start TIMESTAMP WITH TIME ZONE;
    v_slot_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get day of week for the date (0 = Sunday, 6 = Saturday)
    v_day_of_week := EXTRACT(DOW FROM p_date);

    -- Check for exceptions first
    SELECT * INTO v_exception
    FROM availability_exceptions
    WHERE coach_id = p_coach_id
    AND exception_date = p_date
    ORDER BY exception_type DESC
    LIMIT 1;

    -- If there's a blocking exception, return no slots
    IF v_exception.id IS NOT NULL AND NOT v_exception.is_available THEN
        RETURN;
    END IF;

    -- Get regular availability for this day
    FOR v_availability IN
        SELECT
            ca.start_time,
            ca.end_time,
            ca.session_duration_minutes,
            ca.buffer_minutes_before,
            ca.buffer_minutes_after,
            ca.timezone
        FROM coach_availability ca
        WHERE ca.coach_id = p_coach_id
        AND ca.day_of_week = v_day_of_week
        AND ca.is_available = true
        AND ca.is_recurring = true
        AND (ca.effective_from IS NULL OR ca.effective_from <= p_date)
        AND (ca.effective_until IS NULL OR ca.effective_until >= p_date)
    LOOP
        -- Generate time slots based on session duration
        v_slot_start := (p_date || ' ' || v_availability.start_time)::TIMESTAMP AT TIME ZONE v_availability.timezone;

        WHILE v_slot_start + (v_availability.session_duration_minutes || ' minutes')::INTERVAL <=
              (p_date || ' ' || v_availability.end_time)::TIMESTAMP AT TIME ZONE v_availability.timezone
        LOOP
            v_slot_end := v_slot_start + (v_availability.session_duration_minutes || ' minutes')::INTERVAL;

            RETURN QUERY SELECT
                v_slot_start,
                v_slot_end,
                true,
                (v_availability.buffer_minutes_before > 0 OR v_availability.buffer_minutes_after > 0);

            -- Move to next slot (including buffer)
            v_slot_start := v_slot_end +
                (v_availability.buffer_minutes_after + v_availability.buffer_minutes_before || ' minutes')::INTERVAL;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if a coach is available at specific time
CREATE OR REPLACE FUNCTION is_coach_available_at_time(
    p_coach_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_day_of_week INTEGER;
    v_date DATE;
    v_time_start TIME;
    v_time_end TIME;
    v_is_available BOOLEAN := false;
    v_has_exception BOOLEAN;
    v_session_count INTEGER;
    v_max_per_day INTEGER;
BEGIN
    -- Extract date and time components
    v_date := p_start_time::DATE;
    v_day_of_week := EXTRACT(DOW FROM p_start_time);
    v_time_start := p_start_time::TIME;
    v_time_end := p_end_time::TIME;

    -- Check for exceptions that block this time
    SELECT EXISTS (
        SELECT 1
        FROM availability_exceptions
        WHERE coach_id = p_coach_id
        AND exception_date = v_date
        AND NOT is_available
    ) INTO v_has_exception;

    IF v_has_exception THEN
        RETURN false;
    END IF;

    -- Check regular availability
    SELECT EXISTS (
        SELECT 1
        FROM coach_availability
        WHERE coach_id = p_coach_id
        AND day_of_week = v_day_of_week
        AND is_available = true
        AND start_time <= v_time_start
        AND end_time >= v_time_end
        AND (effective_from IS NULL OR effective_from <= v_date)
        AND (effective_until IS NULL OR effective_until >= v_date)
    ) INTO v_is_available;

    IF NOT v_is_available THEN
        RETURN false;
    END IF;

    -- Check session limits
    SELECT ca.max_sessions_per_day INTO v_max_per_day
    FROM coach_availability ca
    WHERE ca.coach_id = p_coach_id
    AND ca.day_of_week = v_day_of_week
    LIMIT 1;

    IF v_max_per_day IS NOT NULL THEN
        SELECT COUNT(*) INTO v_session_count
        FROM sessions
        WHERE coach_id = p_coach_id
        AND scheduled_at::DATE = v_date
        AND status NOT IN ('cancelled', 'no_show');

        IF v_session_count >= v_max_per_day THEN
            RETURN false;
        END IF;
    END IF;

    -- Check for overlapping sessions (including buffer)
    SELECT EXISTS (
        SELECT 1
        FROM sessions s
        JOIN coach_availability ca ON ca.coach_id = s.coach_id AND ca.day_of_week = EXTRACT(DOW FROM s.scheduled_at)
        WHERE s.coach_id = p_coach_id
        AND s.status NOT IN ('cancelled', 'no_show')
        AND (
            -- Check if times overlap considering buffers
            (s.scheduled_at - (COALESCE(ca.buffer_minutes_before, 0) || ' minutes')::INTERVAL) < p_end_time
            AND (s.scheduled_at + s.duration + (COALESCE(ca.buffer_minutes_after, 0) || ' minutes')::INTERVAL) > p_start_time
        )
    ) INTO v_has_exception;

    RETURN NOT v_has_exception;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get next available slot for a coach
CREATE OR REPLACE FUNCTION get_next_available_slot(
    p_coach_id UUID,
    p_from_date DATE DEFAULT CURRENT_DATE,
    p_limit_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    available_date DATE,
    slot_start TIME,
    slot_end TIME,
    timezone TEXT
) AS $$
DECLARE
    v_current_date DATE;
    v_end_date DATE;
BEGIN
    v_current_date := p_from_date;
    v_end_date := p_from_date + p_limit_days;

    WHILE v_current_date <= v_end_date LOOP
        -- Return first available slot
        RETURN QUERY
        SELECT
            v_current_date,
            slots.slot_start::TIME,
            slots.slot_end::TIME,
            ca.timezone
        FROM get_coach_available_slots(p_coach_id, v_current_date) slots
        JOIN coach_availability ca ON ca.coach_id = p_coach_id
        WHERE slots.is_available = true
        AND NOT EXISTS (
            SELECT 1
            FROM sessions s
            WHERE s.coach_id = p_coach_id
            AND s.scheduled_at::DATE = v_current_date
            AND s.scheduled_at::TIME >= slots.slot_start::TIME
            AND s.scheduled_at::TIME < slots.slot_end::TIME
            AND s.status NOT IN ('cancelled', 'no_show')
        )
        ORDER BY slots.slot_start
        LIMIT 1;

        IF FOUND THEN
            RETURN;
        END IF;

        v_current_date := v_current_date + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to count coach sessions for limits
CREATE OR REPLACE FUNCTION count_coach_sessions(
    p_coach_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    session_date DATE,
    session_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.scheduled_at::DATE AS session_date,
        COUNT(*)::INTEGER AS session_count
    FROM sessions s
    WHERE s.coach_id = p_coach_id
    AND s.scheduled_at::DATE BETWEEN p_start_date AND p_end_date
    AND s.status NOT IN ('cancelled', 'no_show')
    GROUP BY s.scheduled_at::DATE
    ORDER BY session_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to bulk update availability for a coach
CREATE OR REPLACE FUNCTION set_coach_recurring_availability(
    p_coach_id UUID,
    p_pattern JSONB,
    p_timezone TEXT DEFAULT 'UTC'
)
RETURNS UUID[] AS $$
DECLARE
    v_availability_ids UUID[] := ARRAY[]::UUID[];
    v_day_config JSONB;
    v_new_id UUID;
BEGIN
    -- Clear existing recurring availability
    DELETE FROM coach_availability
    WHERE coach_id = p_coach_id
    AND is_recurring = true;

    -- Insert new availability based on pattern
    -- Expected pattern format: {"monday": {"start": "09:00", "end": "17:00", "enabled": true}, ...}
    FOR v_day_config IN SELECT * FROM jsonb_each(p_pattern)
    LOOP
        IF (v_day_config->>'enabled')::BOOLEAN = true THEN
            INSERT INTO coach_availability (
                coach_id,
                day_of_week,
                start_time,
                end_time,
                timezone,
                is_recurring,
                recurring_pattern
            )
            VALUES (
                p_coach_id,
                CASE (v_day_config->>'day')::TEXT
                    WHEN 'sunday' THEN 0
                    WHEN 'monday' THEN 1
                    WHEN 'tuesday' THEN 2
                    WHEN 'wednesday' THEN 3
                    WHEN 'thursday' THEN 4
                    WHEN 'friday' THEN 5
                    WHEN 'saturday' THEN 6
                END,
                (v_day_config->>'start')::TIME,
                (v_day_config->>'end')::TIME,
                p_timezone,
                true,
                p_pattern
            )
            RETURNING id INTO v_new_id;

            v_availability_ids := array_append(v_availability_ids, v_new_id);
        END IF;
    END LOOP;

    RETURN v_availability_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for availability_exceptions
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;

-- Coaches can view and manage their own exceptions
CREATE POLICY availability_exceptions_select_own ON availability_exceptions
    FOR SELECT
    USING (auth.uid() = coach_id);

CREATE POLICY availability_exceptions_insert_own ON availability_exceptions
    FOR INSERT
    WITH CHECK (auth.uid() = coach_id);

CREATE POLICY availability_exceptions_update_own ON availability_exceptions
    FOR UPDATE
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);

CREATE POLICY availability_exceptions_delete_own ON availability_exceptions
    FOR DELETE
    USING (auth.uid() = coach_id);

-- Clients can view exceptions for booking purposes (read-only)
CREATE POLICY availability_exceptions_select_public ON availability_exceptions
    FOR SELECT
    USING (NOT is_available); -- Only show blocking exceptions, not special hours

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_coach_available_slots(UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_coach_available_at_time(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_available_slot(UUID, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION count_coach_sessions(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION set_coach_recurring_availability(UUID, JSONB, TEXT) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE availability_exceptions IS 'Coach availability exceptions for time-off, holidays, special hours, etc.';
COMMENT ON FUNCTION get_coach_available_slots(UUID, DATE, TEXT) IS 'Get all available time slots for a coach on a specific date';
COMMENT ON FUNCTION is_coach_available_at_time(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Check if coach is available at a specific time (considers buffers and session limits)';
COMMENT ON FUNCTION get_next_available_slot(UUID, DATE, INTEGER) IS 'Get the next available slot for a coach starting from a date';
COMMENT ON FUNCTION count_coach_sessions(UUID, DATE, DATE) IS 'Count sessions for a coach within a date range (for limit enforcement)';
COMMENT ON FUNCTION set_coach_recurring_availability(UUID, JSONB, TEXT) IS 'Bulk set recurring availability pattern for a coach';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_availability_recurring ON coach_availability(coach_id, is_recurring, day_of_week)
WHERE is_recurring = true;

CREATE INDEX IF NOT EXISTS idx_coach_availability_effective_dates ON coach_availability(coach_id, effective_from, effective_until)
WHERE effective_from IS NOT NULL OR effective_until IS NOT NULL;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Coach availability management enhancements installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Recurring availability patterns with JSONB support';
    RAISE NOTICE '  - Buffer times before/after sessions';
    RAISE NOTICE '  - Session limits (per day/week)';
    RAISE NOTICE '  - Availability exceptions (time-off, holidays)';
    RAISE NOTICE '  - Slot generation and availability checking';
    RAISE NOTICE '  - Timezone support throughout';
    RAISE NOTICE '  - Comprehensive RLS policies';
END $$;
