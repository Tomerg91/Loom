-- Session Payment Flow
-- Sprint 02 - Task 2.3.2: Session Payment Flow (5 SP)
-- Complete payment flow integration for session bookings

-- Function to create payment for session reservation
CREATE OR REPLACE FUNCTION create_session_payment(
    p_reservation_id UUID,
    p_client_id UUID,
    p_stripe_payment_intent_id TEXT,
    p_amount BIGINT,
    p_currency TEXT DEFAULT 'usd',
    p_payment_method TEXT DEFAULT 'card'
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_payment_id UUID;
    v_coach_id UUID;
    v_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Verify reservation ownership and get details
    SELECT coach_id, reserved_start INTO v_coach_id, v_start_time
    FROM slot_reservations
    WHERE id = p_reservation_id
    AND client_id = p_client_id
    AND expires_at > NOW();

    IF v_coach_id IS NULL THEN
        RAISE EXCEPTION 'Reservation not found, expired, or access denied';
    END IF;

    -- Create session from reservation first (in pending_payment state)
    v_session_id := create_session_from_reservation(
        p_reservation_id,
        p_client_id,
        NULL, -- title will be set later
        NULL, -- description
        NULL, -- agenda
        p_stripe_payment_intent_id
    );

    -- Create payment record
    INSERT INTO session_payments (
        session_id,
        stripe_payment_intent_id,
        amount,
        currency,
        payment_method,
        status
    )
    VALUES (
        v_session_id,
        p_stripe_payment_intent_id,
        p_amount,
        p_currency,
        p_payment_method,
        'pending'
    )
    RETURNING id INTO v_payment_id;

    -- Session will remain in 'pending_payment' status until webhook confirms payment

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create checkout session for direct booking
CREATE OR REPLACE FUNCTION create_booking_checkout_session(
    p_client_id UUID,
    p_coach_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_duration_minutes INTEGER,
    p_session_type TEXT DEFAULT 'individual',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_reservation_id UUID;
    v_session_rate DECIMAL(10, 2);
    v_amount_cents BIGINT;
    v_coach_name TEXT;
    result JSON;
BEGIN
    -- Get coach rate
    v_session_rate := get_coach_session_rate(p_coach_id, p_session_type);

    IF v_session_rate IS NULL THEN
        RAISE EXCEPTION 'Coach rate not found for session type: %', p_session_type;
    END IF;

    -- Calculate amount in cents
    v_amount_cents := (v_session_rate * 100)::BIGINT;

    -- Get coach name for description
    SELECT first_name || ' ' || COALESCE(last_name, '') INTO v_coach_name
    FROM users
    WHERE id = p_coach_id;

    -- Create slot reservation
    v_reservation_id := reserve_slot(
        p_coach_id,
        p_client_id,
        p_start_time,
        p_duration_minutes,
        p_session_type,
        p_notes
    );

    -- Return checkout session data
    SELECT json_build_object(
        'reservation_id', v_reservation_id,
        'amount', v_amount_cents,
        'currency', 'usd',
        'coach_id', p_coach_id,
        'coach_name', v_coach_name,
        'session_type', p_session_type,
        'duration_minutes', p_duration_minutes,
        'scheduled_start', p_start_time,
        'scheduled_end', p_start_time + (p_duration_minutes || ' minutes')::INTERVAL,
        'description', 'Coaching session with ' || v_coach_name,
        'expires_at', (
            SELECT expires_at FROM slot_reservations WHERE id = v_reservation_id
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to confirm payment and finalize booking
CREATE OR REPLACE FUNCTION confirm_session_payment(
    p_payment_id UUID,
    p_client_id UUID,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_agenda TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_payment_status TEXT;
BEGIN
    -- Get session and verify payment
    SELECT sp.session_id, sp.status
    INTO v_session_id, v_payment_status
    FROM session_payments sp
    JOIN sessions s ON s.id = sp.session_id
    WHERE sp.id = p_payment_id
    AND s.client_id = p_client_id;

    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'Payment not found or access denied';
    END IF;

    IF v_payment_status != 'succeeded' THEN
        RAISE EXCEPTION 'Payment has not succeeded yet. Status: %', v_payment_status;
    END IF;

    -- Update session details
    UPDATE sessions
    SET
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        agenda = COALESCE(p_agenda, agenda),
        updated_at = NOW()
    WHERE id = v_session_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle payment retry
CREATE OR REPLACE FUNCTION retry_session_payment(
    p_session_id UUID,
    p_client_id UUID,
    p_new_stripe_payment_intent_id TEXT
)
RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_session_status TEXT;
BEGIN
    -- Verify session ownership and status
    SELECT status INTO v_session_status
    FROM sessions
    WHERE id = p_session_id
    AND client_id = p_client_id;

    IF v_session_status IS NULL THEN
        RAISE EXCEPTION 'Session not found or access denied';
    END IF;

    IF v_session_status NOT IN ('pending_payment', 'payment_failed') THEN
        RAISE EXCEPTION 'Session is not in a retryable payment state. Status: %', v_session_status;
    END IF;

    -- Mark old payment as failed if it exists
    UPDATE session_payments
    SET status = 'failed'
    WHERE session_id = p_session_id
    AND status = 'pending';

    -- Create new payment record
    INSERT INTO session_payments (
        session_id,
        stripe_payment_intent_id,
        amount,
        currency,
        payment_method,
        status
    )
    SELECT
        p_session_id,
        p_new_stripe_payment_intent_id,
        sp.amount,
        sp.currency,
        sp.payment_method,
        'pending'
    FROM session_payments sp
    WHERE sp.session_id = p_session_id
    ORDER BY sp.created_at DESC
    LIMIT 1
    RETURNING id INTO v_payment_id;

    -- Update session status
    UPDATE sessions
    SET
        status = 'pending_payment',
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payment status for session
CREATE OR REPLACE FUNCTION get_session_payment_status(
    p_session_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    payment_status JSON;
    user_role TEXT;
BEGIN
    -- Check user access to session
    SELECT
        CASE
            WHEN coach_id = p_user_id THEN 'coach'
            WHEN client_id = p_user_id THEN 'client'
            ELSE NULL
        END INTO user_role
    FROM sessions
    WHERE id = p_session_id;

    IF user_role IS NULL THEN
        RAISE EXCEPTION 'Session not found or access denied';
    END IF;

    -- Build payment status JSON
    SELECT json_build_object(
        'session_id', s.id,
        'session_status', s.status,
        'total_cost', s.total_cost,
        'payment', COALESCE(
            (
                SELECT json_build_object(
                    'id', sp.id,
                    'amount', sp.amount,
                    'currency', sp.currency,
                    'status', sp.status,
                    'payment_method', sp.payment_method,
                    'stripe_payment_intent_id', sp.stripe_payment_intent_id,
                    'paid_at', sp.paid_at,
                    'refund_amount', sp.refund_amount,
                    'refund_reason', sp.refund_reason,
                    'refunded_at', sp.refunded_at,
                    'created_at', sp.created_at
                )
                FROM session_payments sp
                WHERE sp.session_id = s.id
                ORDER BY sp.created_at DESC
                LIMIT 1
            ),
            json_build_object('status', 'not_created')
        ),
        'can_retry_payment', (
            s.status IN ('pending_payment', 'payment_failed')
            AND s.scheduled_start > NOW()
        ),
        'refund_eligible', (
            s.status = 'cancelled'
            AND EXISTS (
                SELECT 1 FROM session_payments sp
                WHERE sp.session_id = s.id
                AND sp.status = 'succeeded'
            )
        )
    ) INTO payment_status
    FROM sessions s
    WHERE s.id = p_session_id;

    RETURN payment_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate session cost with any applicable discounts
CREATE OR REPLACE FUNCTION calculate_session_cost(
    p_coach_id UUID,
    p_session_type TEXT,
    p_duration_minutes INTEGER DEFAULT 60,
    p_client_id UUID DEFAULT NULL,
    p_promo_code TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_base_rate DECIMAL(10, 2);
    v_duration_hours DECIMAL(10, 2);
    v_subtotal DECIMAL(10, 2);
    v_discount_amount DECIMAL(10, 2) := 0;
    v_discount_reason TEXT := NULL;
    v_total DECIMAL(10, 2);
    v_platform_fee DECIMAL(10, 2);
    v_coach_earnings DECIMAL(10, 2);
    v_platform_fee_percent DECIMAL(5, 2) := 10.0; -- 10% platform fee
BEGIN
    -- Get base rate
    v_base_rate := get_coach_session_rate(p_coach_id, p_session_type);

    IF v_base_rate IS NULL THEN
        RAISE EXCEPTION 'Rate not found for coach and session type';
    END IF;

    -- Calculate based on duration (pro-rated)
    v_duration_hours := p_duration_minutes::DECIMAL / 60.0;
    v_subtotal := v_base_rate * v_duration_hours;

    -- Apply promo code if provided (simplified - in production would check promo_codes table)
    IF p_promo_code IS NOT NULL THEN
        -- Example: 10% discount for first-time clients
        IF p_promo_code = 'FIRST10' THEN
            v_discount_amount := v_subtotal * 0.10;
            v_discount_reason := 'First-time client discount (10%)';
        END IF;
    END IF;

    -- Calculate final total
    v_total := v_subtotal - v_discount_amount;

    -- Calculate platform fee and coach earnings
    v_platform_fee := v_total * (v_platform_fee_percent / 100);
    v_coach_earnings := v_total - v_platform_fee;

    RETURN json_build_object(
        'base_rate', v_base_rate,
        'duration_hours', v_duration_hours,
        'subtotal', v_subtotal,
        'discount_amount', v_discount_amount,
        'discount_reason', v_discount_reason,
        'total', v_total,
        'total_cents', (v_total * 100)::BIGINT,
        'platform_fee', v_platform_fee,
        'coach_earnings', v_coach_earnings,
        'currency', 'usd'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client payment history
CREATE OR REPLACE FUNCTION get_client_payment_history(
    p_client_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    payment_id UUID,
    session_id UUID,
    session_title TEXT,
    coach_name TEXT,
    amount BIGINT,
    currency TEXT,
    status TEXT,
    payment_method TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    refund_amount BIGINT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    scheduled_start TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sp.id AS payment_id,
        s.id AS session_id,
        s.title AS session_title,
        (coach.first_name || ' ' || COALESCE(coach.last_name, ''))::TEXT AS coach_name,
        sp.amount,
        sp.currency,
        sp.status,
        sp.payment_method,
        sp.paid_at,
        sp.refund_amount,
        sp.refunded_at,
        s.scheduled_start
    FROM session_payments sp
    JOIN sessions s ON s.id = sp.session_id
    JOIN users coach ON coach.id = s.coach_id
    WHERE s.client_id = p_client_id
    ORDER BY sp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get coach earnings summary
CREATE OR REPLACE FUNCTION get_coach_earnings_summary(
    p_coach_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    earnings_summary JSON;
BEGIN
    v_start_date := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
    v_end_date := COALESCE(p_end_date, CURRENT_DATE);

    SELECT json_build_object(
        'period_start', v_start_date,
        'period_end', v_end_date,
        'total_sessions', COUNT(*),
        'completed_sessions', COUNT(*) FILTER (WHERE s.status = 'completed'),
        'total_revenue', COALESCE(SUM(sp.amount), 0),
        'platform_fees', COALESCE(SUM(sp.amount * 0.10), 0),
        'net_earnings', COALESCE(SUM(sp.amount * 0.90), 0),
        'average_session_value', COALESCE(AVG(sp.amount), 0),
        'currency', 'usd',
        'pending_payout', COALESCE(
            (
                SELECT SUM(sp2.amount * 0.90)
                FROM session_payments sp2
                JOIN sessions s2 ON s2.id = sp2.session_id
                WHERE s2.coach_id = p_coach_id
                AND sp2.status = 'succeeded'
                AND s2.status = 'completed'
                AND s2.scheduled_end >= v_start_date
                AND s2.scheduled_end <= v_end_date
            ),
            0
        )
    ) INTO earnings_summary
    FROM sessions s
    LEFT JOIN session_payments sp ON sp.session_id = s.id AND sp.status = 'succeeded'
    WHERE s.coach_id = p_coach_id
    AND s.scheduled_start::DATE >= v_start_date
    AND s.scheduled_start::DATE <= v_end_date;

    RETURN earnings_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_session_payment(UUID, UUID, TEXT, BIGINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_booking_checkout_session(UUID, UUID, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_session_payment(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION retry_session_payment(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_payment_status(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_session_cost(UUID, TEXT, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_payment_history(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_earnings_summary(UUID, DATE, DATE) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION create_session_payment(UUID, UUID, TEXT, BIGINT, TEXT, TEXT) IS
    'Create payment record for session reservation';

COMMENT ON FUNCTION create_booking_checkout_session(UUID, UUID, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT) IS
    'Create checkout session data for direct booking with payment';

COMMENT ON FUNCTION confirm_session_payment(UUID, UUID, TEXT, TEXT, TEXT) IS
    'Confirm payment and finalize session booking with details';

COMMENT ON FUNCTION retry_session_payment(UUID, UUID, TEXT) IS
    'Retry failed payment for session with new payment intent';

COMMENT ON FUNCTION get_session_payment_status(UUID, UUID) IS
    'Get comprehensive payment status for a session';

COMMENT ON FUNCTION calculate_session_cost(UUID, TEXT, INTEGER, UUID, TEXT) IS
    'Calculate session cost with duration and discounts';

COMMENT ON FUNCTION get_client_payment_history(UUID, INTEGER, INTEGER) IS
    'Get paginated payment history for a client';

COMMENT ON FUNCTION get_coach_earnings_summary(UUID, DATE, DATE) IS
    'Get earnings summary for coach over date range';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Session payment flow installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Complete booking checkout session creation';
    RAISE NOTICE '  - Payment creation and confirmation';
    RAISE NOTICE '  - Payment retry for failed transactions';
    RAISE NOTICE '  - Payment status tracking';
    RAISE NOTICE '  - Session cost calculation with discounts';
    RAISE NOTICE '  - Client payment history';
    RAISE NOTICE '  - Coach earnings summary and tracking';
END $$;
