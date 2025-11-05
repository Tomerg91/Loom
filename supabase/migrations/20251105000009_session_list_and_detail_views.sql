-- Session List and Detail Views
-- Sprint 02 - Task 2.1.4: Session List and Detail Views (5 SP)
-- Provides comprehensive session querying and detail retrieval with filtering

-- Function to get session list for a user with filtering
CREATE OR REPLACE FUNCTION get_user_sessions(
    p_user_id UUID,
    p_filter_status TEXT DEFAULT 'all', -- 'upcoming', 'past', 'cancelled', 'completed', 'all'
    p_user_role TEXT DEFAULT 'client', -- 'client' or 'coach'
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    session_id UUID,
    title TEXT,
    description TEXT,
    session_type TEXT,
    status TEXT,
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    coach_id UUID,
    coach_name TEXT,
    coach_avatar_url TEXT,
    client_id UUID,
    client_name TEXT,
    client_avatar_url TEXT,
    payment_status TEXT,
    total_cost DECIMAL(10, 2),
    cancellation_policy TEXT,
    can_reschedule BOOLEAN,
    can_cancel BOOLEAN,
    can_rate BOOLEAN,
    rating_submitted BOOLEAN,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id AS session_id,
        s.title,
        s.description,
        s.session_type,
        s.status,
        s.scheduled_start,
        s.scheduled_end,
        EXTRACT(EPOCH FROM (s.scheduled_end - s.scheduled_start))::INTEGER / 60 AS duration_minutes,

        -- Coach information
        s.coach_id,
        (coach.first_name || ' ' || COALESCE(coach.last_name, ''))::TEXT AS coach_name,
        coach.avatar_url AS coach_avatar_url,

        -- Client information
        s.client_id,
        (client.first_name || ' ' || COALESCE(client.last_name, ''))::TEXT AS client_name,
        client.avatar_url AS client_avatar_url,

        -- Payment information
        COALESCE(sp.status, 'pending')::TEXT AS payment_status,
        s.total_cost,
        s.cancellation_policy,

        -- Action permissions
        (
            s.status = 'scheduled'
            AND s.scheduled_start > NOW() + INTERVAL '24 hours'
        ) AS can_reschedule,

        (
            s.status = 'scheduled'
            AND s.scheduled_start > NOW()
        ) AS can_cancel,

        (
            s.status = 'completed'
            AND s.scheduled_end < NOW()
        ) AS can_rate,

        EXISTS (
            SELECT 1 FROM session_ratings sr
            WHERE sr.session_id = s.id
            AND sr.rated_by = p_user_id
        ) AS rating_submitted,

        s.notes,
        s.created_at

    FROM sessions s
    INNER JOIN users coach ON coach.id = s.coach_id
    INNER JOIN users client ON client.id = s.client_id
    LEFT JOIN session_payments sp ON sp.session_id = s.id

    WHERE
        -- User role filter
        (
            (p_user_role = 'client' AND s.client_id = p_user_id) OR
            (p_user_role = 'coach' AND s.coach_id = p_user_id)
        )

        -- Status filter
        AND (
            (p_filter_status = 'all') OR
            (p_filter_status = 'upcoming' AND s.status = 'scheduled' AND s.scheduled_start > NOW()) OR
            (p_filter_status = 'past' AND s.status IN ('completed', 'cancelled') AND s.scheduled_end < NOW()) OR
            (p_filter_status = 'cancelled' AND s.status = 'cancelled') OR
            (p_filter_status = 'completed' AND s.status = 'completed')
        )

    ORDER BY
        CASE
            WHEN s.status = 'scheduled' AND s.scheduled_start > NOW() THEN 1
            ELSE 2
        END,
        s.scheduled_start DESC

    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count sessions for a user with filtering
CREATE OR REPLACE FUNCTION count_user_sessions(
    p_user_id UUID,
    p_filter_status TEXT DEFAULT 'all',
    p_user_role TEXT DEFAULT 'client'
)
RETURNS INTEGER AS $$
DECLARE
    session_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO session_count
    FROM sessions s
    WHERE
        (
            (p_user_role = 'client' AND s.client_id = p_user_id) OR
            (p_user_role = 'coach' AND s.coach_id = p_user_id)
        )
        AND (
            (p_filter_status = 'all') OR
            (p_filter_status = 'upcoming' AND s.status = 'scheduled' AND s.scheduled_start > NOW()) OR
            (p_filter_status = 'past' AND s.status IN ('completed', 'cancelled') AND s.scheduled_end < NOW()) OR
            (p_filter_status = 'cancelled' AND s.status = 'cancelled') OR
            (p_filter_status = 'completed' AND s.status = 'completed')
        );

    RETURN session_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get detailed session information
CREATE OR REPLACE FUNCTION get_session_detail(
    p_session_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    session_detail JSON;
    user_role TEXT;
BEGIN
    -- Determine user role in this session
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

    -- Build comprehensive session detail JSON
    SELECT json_build_object(
        'session', json_build_object(
            'id', s.id,
            'title', s.title,
            'description', s.description,
            'session_type', s.session_type,
            'status', s.status,
            'scheduled_start', s.scheduled_start,
            'scheduled_end', s.scheduled_end,
            'duration_minutes', EXTRACT(EPOCH FROM (s.scheduled_end - s.scheduled_start))::INTEGER / 60,
            'total_cost', s.total_cost,
            'cancellation_policy', s.cancellation_policy,
            'notes', s.notes,
            'agenda', s.agenda,
            'created_at', s.created_at,
            'updated_at', s.updated_at
        ),

        'coach', json_build_object(
            'id', coach.id,
            'name', coach.first_name || ' ' || COALESCE(coach.last_name, ''),
            'email', coach.email,
            'avatar_url', coach.avatar_url,
            'bio', cp.bio,
            'specializations', cp.specializations,
            'years_of_experience', cp.years_of_experience,
            'average_rating', (
                SELECT COALESCE(AVG(sr.rating), 0)
                FROM session_ratings sr
                JOIN sessions s2 ON s2.id = sr.session_id
                WHERE s2.coach_id = coach.id
            ),
            'total_sessions', (
                SELECT COUNT(*)
                FROM sessions s2
                WHERE s2.coach_id = coach.id AND s2.status = 'completed'
            )
        ),

        'client', json_build_object(
            'id', client.id,
            'name', client.first_name || ' ' || COALESCE(client.last_name, ''),
            'email', client.email,
            'avatar_url', client.avatar_url
        ),

        'payment', (
            SELECT json_build_object(
                'id', sp.id,
                'amount', sp.amount,
                'currency', sp.currency,
                'status', sp.status,
                'payment_method', sp.payment_method,
                'stripe_payment_intent_id', sp.stripe_payment_intent_id,
                'refund_amount', sp.refund_amount,
                'refund_reason', sp.refund_reason,
                'paid_at', sp.paid_at,
                'refunded_at', sp.refunded_at
            )
            FROM session_payments sp
            WHERE sp.session_id = s.id
        ),

        'rating', (
            SELECT json_build_object(
                'id', sr.id,
                'rating', sr.rating,
                'rating_professionalism', sr.rating_professionalism,
                'rating_communication', sr.rating_communication,
                'rating_helpfulness', sr.rating_helpfulness,
                'comment', sr.comment,
                'would_recommend', sr.would_recommend,
                'is_anonymous', sr.is_anonymous,
                'helpful_count', sr.helpful_count,
                'coach_response', sr.coach_response,
                'created_at', sr.created_at
            )
            FROM session_ratings sr
            WHERE sr.session_id = s.id
            LIMIT 1
        ),

        'files', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', sf.file_id,
                'filename', fu.filename,
                'file_type', fu.file_type,
                'file_size', fu.file_size,
                'file_category', sf.file_category,
                'is_required', sf.is_required,
                'uploaded_at', sf.created_at
            )), '[]'::json)
            FROM session_files sf
            JOIN file_uploads fu ON fu.id = sf.file_id
            WHERE sf.session_id = s.id
        ),

        'permissions', json_build_object(
            'can_view', TRUE,
            'can_reschedule', (
                s.status = 'scheduled'
                AND s.scheduled_start > NOW() + INTERVAL '24 hours'
            ),
            'can_cancel', (
                s.status = 'scheduled'
                AND s.scheduled_start > NOW()
            ),
            'can_rate', (
                user_role = 'client'
                AND s.status = 'completed'
                AND s.scheduled_end < NOW()
                AND NOT EXISTS (
                    SELECT 1 FROM session_ratings sr
                    WHERE sr.session_id = s.id AND sr.rated_by = p_user_id
                )
            ),
            'can_respond_to_rating', (
                user_role = 'coach'
                AND EXISTS (
                    SELECT 1 FROM session_ratings sr
                    WHERE sr.session_id = s.id AND sr.coach_response IS NULL
                )
            ),
            'can_start_session', (
                s.status = 'scheduled'
                AND s.scheduled_start <= NOW() + INTERVAL '5 minutes'
                AND s.scheduled_end > NOW()
            ),
            'can_join_session', (
                s.status = 'scheduled'
                AND s.scheduled_start <= NOW() + INTERVAL '5 minutes'
                AND s.scheduled_end > NOW()
            ),
            'user_role', user_role
        ),

        'history', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', n.id,
                'title', n.title,
                'message', n.message,
                'type', n.notification_type,
                'created_at', n.created_at
            ) ORDER BY n.created_at DESC), '[]'::json)
            FROM notifications n
            WHERE n.user_id = p_user_id
            AND n.related_entity_type = 'session'
            AND n.related_entity_id = s.id
        )

    ) INTO session_detail
    FROM sessions s
    INNER JOIN users coach ON coach.id = s.coach_id
    INNER JOIN users client ON client.id = s.client_id
    LEFT JOIN coach_profiles cp ON cp.coach_id = coach.id
    WHERE s.id = p_session_id;

    RETURN session_detail;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get upcoming sessions summary
CREATE OR REPLACE FUNCTION get_upcoming_sessions_summary(
    p_user_id UUID,
    p_user_role TEXT DEFAULT 'client'
)
RETURNS JSON AS $$
DECLARE
    summary JSON;
BEGIN
    SELECT json_build_object(
        'next_session', (
            SELECT json_build_object(
                'id', s.id,
                'title', s.title,
                'scheduled_start', s.scheduled_start,
                'duration_minutes', EXTRACT(EPOCH FROM (s.scheduled_end - s.scheduled_start))::INTEGER / 60,
                'other_party_name', CASE
                    WHEN p_user_role = 'client' THEN coach.first_name || ' ' || COALESCE(coach.last_name, '')
                    ELSE client.first_name || ' ' || COALESCE(client.last_name, '')
                END,
                'other_party_avatar', CASE
                    WHEN p_user_role = 'client' THEN coach.avatar_url
                    ELSE client.avatar_url
                END
            )
            FROM sessions s
            JOIN users coach ON coach.id = s.coach_id
            JOIN users client ON client.id = s.client_id
            WHERE s.status = 'scheduled'
            AND s.scheduled_start > NOW()
            AND (
                (p_user_role = 'client' AND s.client_id = p_user_id) OR
                (p_user_role = 'coach' AND s.coach_id = p_user_id)
            )
            ORDER BY s.scheduled_start ASC
            LIMIT 1
        ),

        'today_count', (
            SELECT COUNT(*)
            FROM sessions s
            WHERE s.status = 'scheduled'
            AND s.scheduled_start::DATE = CURRENT_DATE
            AND (
                (p_user_role = 'client' AND s.client_id = p_user_id) OR
                (p_user_role = 'coach' AND s.coach_id = p_user_id)
            )
        ),

        'this_week_count', (
            SELECT COUNT(*)
            FROM sessions s
            WHERE s.status = 'scheduled'
            AND s.scheduled_start >= DATE_TRUNC('week', NOW())
            AND s.scheduled_start < DATE_TRUNC('week', NOW()) + INTERVAL '1 week'
            AND (
                (p_user_role = 'client' AND s.client_id = p_user_id) OR
                (p_user_role = 'coach' AND s.coach_id = p_user_id)
            )
        ),

        'pending_ratings_count', (
            SELECT COUNT(*)
            FROM sessions s
            WHERE s.status = 'completed'
            AND s.scheduled_end < NOW()
            AND s.client_id = p_user_id
            AND NOT EXISTS (
                SELECT 1 FROM session_ratings sr
                WHERE sr.session_id = s.id AND sr.rated_by = p_user_id
            )
        )
    ) INTO summary;

    RETURN summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get session activity timeline
CREATE OR REPLACE FUNCTION get_session_activity_timeline(
    p_user_id UUID,
    p_days_back INTEGER DEFAULT 30,
    p_user_role TEXT DEFAULT 'client'
)
RETURNS TABLE (
    activity_date DATE,
    total_sessions INTEGER,
    completed_sessions INTEGER,
    cancelled_sessions INTEGER,
    total_duration_minutes INTEGER,
    total_spent DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - (p_days_back || ' days')::INTERVAL,
            CURRENT_DATE,
            '1 day'::INTERVAL
        )::DATE AS activity_date
    )
    SELECT
        ds.activity_date,
        COALESCE(COUNT(s.id), 0)::INTEGER AS total_sessions,
        COALESCE(COUNT(s.id) FILTER (WHERE s.status = 'completed'), 0)::INTEGER AS completed_sessions,
        COALESCE(COUNT(s.id) FILTER (WHERE s.status = 'cancelled'), 0)::INTEGER AS cancelled_sessions,
        COALESCE(SUM(EXTRACT(EPOCH FROM (s.scheduled_end - s.scheduled_start))::INTEGER / 60), 0)::INTEGER AS total_duration_minutes,
        COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.total_cost ELSE 0 END), 0)::DECIMAL(10, 2) AS total_spent
    FROM date_series ds
    LEFT JOIN sessions s ON s.scheduled_start::DATE = ds.activity_date
        AND (
            (p_user_role = 'client' AND s.client_id = p_user_id) OR
            (p_user_role = 'coach' AND s.coach_id = p_user_id)
        )
    GROUP BY ds.activity_date
    ORDER BY ds.activity_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for session querying performance
CREATE INDEX IF NOT EXISTS idx_sessions_client_status_start
    ON sessions(client_id, status, scheduled_start DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_coach_status_start
    ON sessions(coach_id, status, scheduled_start DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_start_date
    ON sessions(scheduled_start::DATE) WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_sessions_completed_for_rating
    ON sessions(client_id, status, scheduled_end)
    WHERE status = 'completed';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_sessions(UUID, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION count_user_sessions(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_detail(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_sessions_summary(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_activity_timeline(UUID, INTEGER, TEXT) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION get_user_sessions(UUID, TEXT, TEXT, INTEGER, INTEGER) IS
    'Get filtered and paginated list of sessions for a user (client or coach)';

COMMENT ON FUNCTION count_user_sessions(UUID, TEXT, TEXT) IS
    'Count sessions for a user with status filtering';

COMMENT ON FUNCTION get_session_detail(UUID, UUID) IS
    'Get comprehensive session details including coach, client, payment, rating, and files';

COMMENT ON FUNCTION get_upcoming_sessions_summary(UUID, TEXT) IS
    'Get summary of upcoming sessions including next session and counts';

COMMENT ON FUNCTION get_session_activity_timeline(UUID, INTEGER, TEXT) IS
    'Get daily session activity timeline for analytics and history';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Session list and detail views installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Filtered session lists (upcoming, past, cancelled, completed)';
    RAISE NOTICE '  - Comprehensive session detail retrieval';
    RAISE NOTICE '  - Permission checking for reschedule/cancel/rate actions';
    RAISE NOTICE '  - Session activity timeline for analytics';
    RAISE NOTICE '  - Upcoming sessions summary dashboard';
END $$;
