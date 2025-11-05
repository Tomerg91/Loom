-- Session Booking Flow and Slot Reservation System
-- Sprint 02 - Task 2.1.3: Implement Session Booking Flow (8 SP)
-- Adds slot reservation, booking creation, and double-booking prevention

-- Create slot reservations table for temporary holds
CREATE TABLE IF NOT EXISTS slot_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reserved_start TIMESTAMP WITH TIME ZONE NOT NULL,
    reserved_end TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    session_type TEXT DEFAULT 'individual' CHECK (session_type IN ('individual', 'group', 'workshop')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent overlapping reservations
    EXCLUDE USING gist (
        coach_id WITH =,
        tstzrange(reserved_start, reserved_end) WITH &&
    )
);

-- Create indexes for slot reservations
CREATE INDEX idx_slot_reservations_coach_id ON slot_reservations(coach_id);
CREATE INDEX idx_slot_reservations_client_id ON slot_reservations(client_id);
CREATE INDEX idx_slot_reservations_expires_at ON slot_reservations(expires_at);
CREATE INDEX idx_slot_reservations_active ON slot_reservations(coach_id, expires_at)
WHERE expires_at > NOW();

-- Create session types enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type_enum') THEN
        CREATE TYPE session_type_enum AS ENUM ('individual', 'group', 'workshop', 'consultation');
    END IF;
END $$;

-- Function to reserve a time slot (called before booking)
CREATE OR REPLACE FUNCTION reserve_slot(
    p_coach_id UUID,
    p_client_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_duration_minutes INTEGER DEFAULT 60,
    p_session_type TEXT DEFAULT 'individual',
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_reservation_id UUID;
    v_end_time TIMESTAMP WITH TIME ZONE;
    v_is_available BOOLEAN;
BEGIN
    v_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;

    -- Check if coach is available at this time
    v_is_available := is_coach_available_at_time(p_coach_id, p_start_time, v_end_time);

    IF NOT v_is_available THEN
        RAISE EXCEPTION 'Coach is not available at this time';
    END IF;

    -- Check for existing confirmed sessions (not just reservations)
    IF EXISTS (
        SELECT 1
        FROM sessions
        WHERE coach_id = p_coach_id
        AND status NOT IN ('cancelled', 'no_show')
        AND tstzrange(scheduled_at, scheduled_at + duration) &&
            tstzrange(p_start_time, v_end_time)
    ) THEN
        RAISE EXCEPTION 'Time slot is already booked';
    END IF;

    -- Clean up expired reservations first
    DELETE FROM slot_reservations WHERE expires_at < NOW();

    -- Create reservation
    INSERT INTO slot_reservations (
        coach_id,
        client_id,
        reserved_start,
        reserved_end,
        session_type,
        notes
    )
    VALUES (
        p_coach_id,
        p_client_id,
        p_start_time,
        v_end_time,
        p_session_type,
        p_notes
    )
    ON CONFLICT DO NOTHING -- Handle race condition
    RETURNING id INTO v_reservation_id;

    IF v_reservation_id IS NULL THEN
        RAISE EXCEPTION 'Slot was just reserved by another client';
    END IF;

    RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend reservation expiry
CREATE OR REPLACE FUNCTION extend_reservation(
    p_reservation_id UUID,
    p_client_id UUID,
    p_additional_minutes INTEGER DEFAULT 5
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    v_new_expiry TIMESTAMP WITH TIME ZONE;
    v_owner_id UUID;
BEGIN
    -- Verify ownership
    SELECT client_id INTO v_owner_id
    FROM slot_reservations
    WHERE id = p_reservation_id;

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    IF v_owner_id != p_client_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Extend expiry (max 20 minutes total)
    UPDATE slot_reservations
    SET expires_at = LEAST(
        NOW() + (p_additional_minutes || ' minutes')::INTERVAL,
        created_at + INTERVAL '20 minutes'
    )
    WHERE id = p_reservation_id
    AND expires_at > NOW()
    RETURNING expires_at INTO v_new_expiry;

    IF v_new_expiry IS NULL THEN
        RAISE EXCEPTION 'Reservation has expired';
    END IF;

    RETURN v_new_expiry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a session from reservation
CREATE OR REPLACE FUNCTION create_session_from_reservation(
    p_reservation_id UUID,
    p_client_id UUID,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_agenda TEXT DEFAULT NULL,
    p_payment_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_reservation RECORD;
    v_duration_minutes INTEGER;
BEGIN
    -- Get reservation details
    SELECT * INTO v_reservation
    FROM slot_reservations
    WHERE id = p_reservation_id
    AND client_id = p_client_id
    AND expires_at > NOW();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found or expired';
    END IF;

    -- Calculate duration
    v_duration_minutes := EXTRACT(EPOCH FROM (v_reservation.reserved_end - v_reservation.reserved_start)) / 60;

    -- Create session
    INSERT INTO sessions (
        coach_id,
        client_id,
        title,
        description,
        scheduled_at,
        duration,
        type,
        status,
        notes,
        agenda
    )
    VALUES (
        v_reservation.coach_id,
        v_reservation.client_id,
        COALESCE(p_title, 'Coaching Session with ' || (
            SELECT first_name || ' ' || COALESCE(last_name, '')
            FROM users
            WHERE id = v_reservation.coach_id
        )),
        p_description,
        v_reservation.reserved_start,
        (v_duration_minutes || ' minutes')::INTERVAL,
        v_reservation.session_type,
        CASE
            WHEN p_payment_id IS NOT NULL THEN 'confirmed'
            ELSE 'pending'
        END,
        v_reservation.notes,
        p_agenda
    )
    RETURNING id INTO v_session_id;

    -- Delete the reservation
    DELETE FROM slot_reservations WHERE id = p_reservation_id;

    -- Create notification for coach
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
    )
    VALUES (
        v_reservation.coach_id,
        'session_booked',
        'New Session Booked',
        'A new session has been booked with you',
        json_build_object(
            'session_id', v_session_id,
            'client_id', v_reservation.client_id,
            'scheduled_at', v_reservation.reserved_start
        )::jsonb
    );

    -- Create notification for client
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
    )
    VALUES (
        v_reservation.client_id,
        'session_confirmed',
        'Session Confirmed',
        'Your coaching session has been confirmed',
        json_build_object(
            'session_id', v_session_id,
            'coach_id', v_reservation.coach_id,
            'scheduled_at', v_reservation.reserved_start
        )::jsonb
    );

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel reservation
CREATE OR REPLACE FUNCTION cancel_reservation(
    p_reservation_id UUID,
    p_client_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_deleted BOOLEAN;
BEGIN
    DELETE FROM slot_reservations
    WHERE id = p_reservation_id
    AND client_id = p_client_id
    RETURNING true INTO v_deleted;

    RETURN COALESCE(v_deleted, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired reservations (for cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM slot_reservations
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reschedule a session
CREATE OR REPLACE FUNCTION reschedule_session(
    p_session_id UUID,
    p_user_id UUID,
    p_new_start_time TIMESTAMP WITH TIME ZONE,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_session RECORD;
    v_duration_minutes INTEGER;
    v_new_end_time TIMESTAMP WITH TIME ZONE;
    v_is_available BOOLEAN;
    v_user_role TEXT;
BEGIN
    -- Get session and verify ownership
    SELECT s.*, EXTRACT(EPOCH FROM s.duration) / 60 AS duration_mins
    INTO v_session
    FROM sessions s
    WHERE s.id = p_session_id
    AND (s.coach_id = p_user_id OR s.client_id = p_user_id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found or access denied';
    END IF;

    -- Only allow rescheduling of scheduled/confirmed sessions
    IF v_session.status NOT IN ('scheduled', 'confirmed', 'pending') THEN
        RAISE EXCEPTION 'Cannot reschedule session with status: %', v_session.status;
    END IF;

    -- Check if session is in the future (can't reschedule past sessions)
    IF v_session.scheduled_at < NOW() THEN
        RAISE EXCEPTION 'Cannot reschedule past sessions';
    END IF;

    v_duration_minutes := v_session.duration_mins;
    v_new_end_time := p_new_start_time + (v_duration_minutes || ' minutes')::INTERVAL;

    -- Check coach availability at new time
    v_is_available := is_coach_available_at_time(
        v_session.coach_id,
        p_new_start_time,
        v_new_end_time
    );

    IF NOT v_is_available THEN
        RAISE EXCEPTION 'Coach is not available at the requested time';
    END IF;

    -- Check for conflicts with other sessions
    IF EXISTS (
        SELECT 1
        FROM sessions
        WHERE id != p_session_id
        AND coach_id = v_session.coach_id
        AND status NOT IN ('cancelled', 'no_show')
        AND tstzrange(scheduled_at, scheduled_at + duration) &&
            tstzrange(p_new_start_time, v_new_end_time)
    ) THEN
        RAISE EXCEPTION 'Time slot conflicts with another session';
    END IF;

    -- Update session
    UPDATE sessions
    SET
        scheduled_at = p_new_start_time,
        status = CASE
            WHEN status = 'confirmed' THEN 'rescheduled'
            ELSE status
        END,
        notes = COALESCE(notes || E'\n', '') || 'Rescheduled on ' || NOW()::DATE || ': ' || COALESCE(p_reason, 'No reason provided'),
        updated_at = NOW()
    WHERE id = p_session_id;

    -- Determine who initiated the reschedule
    SELECT role INTO v_user_role
    FROM users
    WHERE id = p_user_id;

    -- Notify the other party
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
    )
    VALUES (
        CASE WHEN p_user_id = v_session.coach_id THEN v_session.client_id ELSE v_session.coach_id END,
        'session_rescheduled',
        'Session Rescheduled',
        'Your session has been rescheduled to ' || p_new_start_time::TEXT,
        json_build_object(
            'session_id', p_session_id,
            'old_time', v_session.scheduled_at,
            'new_time', p_new_start_time,
            'rescheduled_by', v_user_role,
            'reason', p_reason
        )::jsonb
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel a session
CREATE OR REPLACE FUNCTION cancel_session(
    p_session_id UUID,
    p_user_id UUID,
    p_reason TEXT,
    p_cancellation_type TEXT DEFAULT 'client_cancellation'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_session RECORD;
    v_hours_until_session NUMERIC;
    v_refund_eligible BOOLEAN := false;
BEGIN
    -- Get session and verify ownership
    SELECT *
    INTO v_session
    FROM sessions
    WHERE id = p_session_id
    AND (coach_id = p_user_id OR client_id = p_user_id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found or access denied';
    END IF;

    -- Only allow cancellation of future sessions
    IF v_session.scheduled_at < NOW() THEN
        RAISE EXCEPTION 'Cannot cancel past sessions';
    END IF;

    -- Calculate hours until session
    v_hours_until_session := EXTRACT(EPOCH FROM (v_session.scheduled_at - NOW())) / 3600;

    -- Determine refund eligibility (e.g., 24 hour policy)
    v_refund_eligible := v_hours_until_session >= 24;

    -- Update session status
    UPDATE sessions
    SET
        status = 'cancelled',
        cancellation_reason = p_reason,
        cancellation_type = p_cancellation_type,
        cancelled_at = NOW(),
        cancelled_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_session_id;

    -- Notify both parties
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES
        (v_session.coach_id, 'session_cancelled', 'Session Cancelled',
         'A session has been cancelled', json_build_object('session_id', p_session_id, 'refund_eligible', v_refund_eligible)::jsonb),
        (v_session.client_id, 'session_cancelled', 'Session Cancelled',
         'Your session has been cancelled', json_build_object('session_id', p_session_id, 'refund_eligible', v_refund_eligible)::jsonb);

    RETURN v_refund_eligible;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add cancellation fields to sessions table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE sessions
        ADD COLUMN cancellation_reason TEXT,
        ADD COLUMN cancellation_type TEXT,
        ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN cancelled_by UUID REFERENCES users(id);
    END IF;
END $$;

-- RLS policies for slot_reservations
ALTER TABLE slot_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY slot_reservations_select_own ON slot_reservations
    FOR SELECT
    USING (auth.uid() = client_id OR auth.uid() = coach_id);

CREATE POLICY slot_reservations_insert_own ON slot_reservations
    FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY slot_reservations_delete_own ON slot_reservations
    FOR DELETE
    USING (auth.uid() = client_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION reserve_slot(UUID, UUID, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION extend_reservation(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_session_from_reservation(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_reservation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_reservations() TO authenticated;
GRANT EXECUTE ON FUNCTION reschedule_session(UUID, UUID, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_session(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE slot_reservations IS 'Temporary slot reservations with 10-minute expiry to prevent double-booking';
COMMENT ON FUNCTION reserve_slot(UUID, UUID, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT) IS 'Reserve a time slot for booking (10-minute hold)';
COMMENT ON FUNCTION extend_reservation(UUID, UUID, INTEGER) IS 'Extend reservation expiry (max 20 minutes total)';
COMMENT ON FUNCTION create_session_from_reservation(UUID, UUID, TEXT, TEXT, TEXT, TEXT) IS 'Convert reservation to confirmed session';
COMMENT ON FUNCTION cancel_reservation(UUID, UUID) IS 'Cancel a slot reservation before booking';
COMMENT ON FUNCTION cleanup_expired_reservations() IS 'Remove expired reservations (for cron job)';
COMMENT ON FUNCTION reschedule_session(UUID, UUID, TIMESTAMP WITH TIME ZONE, TEXT) IS 'Reschedule an existing session to a new time';
COMMENT ON FUNCTION cancel_session(UUID, UUID, TEXT, TEXT) IS 'Cancel a session with refund eligibility check';

-- Schedule cleanup of expired reservations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'cleanup-expired-reservations',
            '*/5 * * * *', -- Every 5 minutes
            'SELECT cleanup_expired_reservations();'
        );
        RAISE NOTICE 'Scheduled cleanup of expired reservations every 5 minutes';
    ELSE
        RAISE NOTICE 'pg_cron not available - manual cleanup recommended';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not schedule cleanup - run manually: SELECT cleanup_expired_reservations();';
END $$;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Session booking flow installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Slot reservation system with 10-minute expiry';
    RAISE NOTICE '  - Double-booking prevention with exclusion constraint';
    RAISE NOTICE '  - Session creation from reservation';
    RAISE NOTICE '  - Reservation extension (max 20 minutes)';
    RAISE NOTICE '  - Session rescheduling with conflict detection';
    RAISE NOTICE '  - Session cancellation with 24-hour refund policy';
    RAISE NOTICE '  - Automatic notifications for all actions';
    RAISE NOTICE '  - Cleanup of expired reservations';
    RAISE NOTICE '  - Comprehensive RLS policies';
END $$;
