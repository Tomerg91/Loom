-- Coach Discovery and Search System
-- Sprint 02 - Task 2.1.2: Implement Coach Discovery Interface (5 SP)
-- Adds comprehensive coach discovery with search, filters, and availability display

-- Create materialized view for coach discovery (includes all relevant data)
CREATE MATERIALIZED VIEW IF NOT EXISTS coach_discovery_view AS
SELECT
    u.id AS coach_id,
    u.email,
    u.first_name,
    u.last_name,
    u.first_name || ' ' || COALESCE(u.last_name, '') AS full_name,
    u.avatar_url,
    cp.bio,
    cp.session_rate,
    cp.currency,
    cp.specializations,
    cp.certifications,
    cp.experience_years,
    cp.languages,
    cp.timezone,
    cp.onboarding_completed_at,
    -- Calculate average rating
    COALESCE(AVG(sr.rating), 0) AS average_rating,
    COUNT(DISTINCT sr.id) AS total_ratings,
    -- Count completed sessions
    COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS completed_sessions,
    -- Count upcoming sessions (as indicator of popularity)
    COUNT(DISTINCT CASE WHEN s.status IN ('scheduled', 'confirmed') AND s.scheduled_at > NOW() THEN s.id END) AS upcoming_sessions,
    -- Next available slot (will be updated via function)
    NULL::DATE AS next_available_date,
    NULL::TIME AS next_available_time,
    -- Metadata
    NOW() AS cache_updated_at
FROM users u
INNER JOIN coach_profiles cp ON cp.coach_id = u.id
LEFT JOIN sessions s ON s.coach_id = u.id
LEFT JOIN session_ratings sr ON sr.session_id = s.id
WHERE u.role = 'coach'
AND cp.onboarding_completed_at IS NOT NULL -- Only onboarded coaches
GROUP BY
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.avatar_url,
    cp.bio,
    cp.session_rate,
    cp.currency,
    cp.specializations,
    cp.certifications,
    cp.experience_years,
    cp.languages,
    cp.timezone,
    cp.onboarding_completed_at;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_discovery_coach_id
ON coach_discovery_view(coach_id);

-- Create indexes for filtering and searching
CREATE INDEX IF NOT EXISTS idx_coach_discovery_rating
ON coach_discovery_view(average_rating DESC);

CREATE INDEX IF NOT EXISTS idx_coach_discovery_rate
ON coach_discovery_view(session_rate);

CREATE INDEX IF NOT EXISTS idx_coach_discovery_experience
ON coach_discovery_view(experience_years DESC);

CREATE INDEX IF NOT EXISTS idx_coach_discovery_specializations
ON coach_discovery_view USING GIN(specializations);

CREATE INDEX IF NOT EXISTS idx_coach_discovery_languages
ON coach_discovery_view USING GIN(languages);

CREATE INDEX IF NOT EXISTS idx_coach_discovery_full_name
ON coach_discovery_view USING gin(to_tsvector('english', full_name));

CREATE INDEX IF NOT EXISTS idx_coach_discovery_bio
ON coach_discovery_view USING gin(to_tsvector('english', COALESCE(bio, '')));

-- Function to refresh coach discovery cache
CREATE OR REPLACE FUNCTION refresh_coach_discovery_cache()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY coach_discovery_view;

    -- Update next available slots for all coaches
    UPDATE coach_discovery_view cdv
    SET
        next_available_date = nas.available_date,
        next_available_time = nas.slot_start
    FROM (
        SELECT DISTINCT ON (coach_id)
            coach_id,
            available_date,
            slot_start
        FROM (
            SELECT
                u.id AS coach_id,
                nas.available_date,
                nas.slot_start
            FROM users u
            CROSS JOIN LATERAL get_next_available_slot(u.id, CURRENT_DATE, 30) nas
            WHERE u.role = 'coach'
        ) AS next_slots
        ORDER BY coach_id, available_date, slot_start
    ) nas
    WHERE cdv.coach_id = nas.coach_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search and filter coaches
CREATE OR REPLACE FUNCTION search_coaches(
    p_search_query TEXT DEFAULT NULL,
    p_specializations TEXT[] DEFAULT NULL,
    p_languages TEXT[] DEFAULT NULL,
    p_min_rating DECIMAL DEFAULT NULL,
    p_max_rating DECIMAL DEFAULT NULL,
    p_min_rate DECIMAL DEFAULT NULL,
    p_max_rate DECIMAL DEFAULT NULL,
    p_min_experience INTEGER DEFAULT NULL,
    p_currency TEXT DEFAULT 'USD',
    p_available_on_date DATE DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'rating',
    p_sort_order TEXT DEFAULT 'desc',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    coach_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    session_rate DECIMAL,
    currency VARCHAR,
    specializations TEXT[],
    experience_years INTEGER,
    languages TEXT[],
    average_rating NUMERIC,
    total_ratings BIGINT,
    completed_sessions BIGINT,
    next_available_date DATE,
    next_available_time TIME,
    timezone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cdv.coach_id,
        cdv.full_name,
        cdv.avatar_url,
        cdv.bio,
        cdv.session_rate,
        cdv.currency,
        cdv.specializations,
        cdv.experience_years,
        cdv.languages,
        cdv.average_rating,
        cdv.total_ratings,
        cdv.completed_sessions,
        cdv.next_available_date,
        cdv.next_available_time,
        cdv.timezone
    FROM coach_discovery_view cdv
    WHERE
        -- Search filter (name or bio)
        (p_search_query IS NULL OR
         to_tsvector('english', cdv.full_name || ' ' || COALESCE(cdv.bio, '')) @@ plainto_tsquery('english', p_search_query))
        -- Specializations filter (has any of the specified specializations)
        AND (p_specializations IS NULL OR cdv.specializations && p_specializations)
        -- Languages filter (has any of the specified languages)
        AND (p_languages IS NULL OR cdv.languages && p_languages)
        -- Rating filter
        AND (p_min_rating IS NULL OR cdv.average_rating >= p_min_rating)
        AND (p_max_rating IS NULL OR cdv.average_rating <= p_max_rating)
        -- Rate filter
        AND (p_min_rate IS NULL OR cdv.session_rate >= p_min_rate)
        AND (p_max_rate IS NULL OR cdv.session_rate <= p_max_rate)
        -- Experience filter
        AND (p_min_experience IS NULL OR cdv.experience_years >= p_min_experience)
        -- Currency filter
        AND cdv.currency = p_currency
        -- Availability filter (if specific date requested)
        AND (p_available_on_date IS NULL OR
             EXISTS (
                 SELECT 1
                 FROM get_coach_available_slots(cdv.coach_id, p_available_on_date) slots
                 WHERE slots.is_available = true
             ))
    ORDER BY
        CASE WHEN p_sort_by = 'rating' AND p_sort_order = 'desc' THEN cdv.average_rating END DESC,
        CASE WHEN p_sort_by = 'rating' AND p_sort_order = 'asc' THEN cdv.average_rating END ASC,
        CASE WHEN p_sort_by = 'rate' AND p_sort_order = 'desc' THEN cdv.session_rate END DESC,
        CASE WHEN p_sort_by = 'rate' AND p_sort_order = 'asc' THEN cdv.session_rate END ASC,
        CASE WHEN p_sort_by = 'experience' AND p_sort_order = 'desc' THEN cdv.experience_years END DESC,
        CASE WHEN p_sort_by = 'experience' AND p_sort_order = 'asc' THEN cdv.experience_years END ASC,
        CASE WHEN p_sort_by = 'popularity' AND p_sort_order = 'desc' THEN cdv.completed_sessions END DESC,
        CASE WHEN p_sort_by = 'popularity' AND p_sort_order = 'asc' THEN cdv.completed_sessions END ASC,
        CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN cdv.full_name END DESC,
        CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN cdv.full_name END ASC,
        cdv.coach_id -- Stable sort
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to count search results (for pagination)
CREATE OR REPLACE FUNCTION count_search_coaches(
    p_search_query TEXT DEFAULT NULL,
    p_specializations TEXT[] DEFAULT NULL,
    p_languages TEXT[] DEFAULT NULL,
    p_min_rating DECIMAL DEFAULT NULL,
    p_max_rating DECIMAL DEFAULT NULL,
    p_min_rate DECIMAL DEFAULT NULL,
    p_max_rate DECIMAL DEFAULT NULL,
    p_min_experience INTEGER DEFAULT NULL,
    p_currency TEXT DEFAULT 'USD',
    p_available_on_date DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    result_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO result_count
    FROM coach_discovery_view cdv
    WHERE
        (p_search_query IS NULL OR
         to_tsvector('english', cdv.full_name || ' ' || COALESCE(cdv.bio, '')) @@ plainto_tsquery('english', p_search_query))
        AND (p_specializations IS NULL OR cdv.specializations && p_specializations)
        AND (p_languages IS NULL OR cdv.languages && p_languages)
        AND (p_min_rating IS NULL OR cdv.average_rating >= p_min_rating)
        AND (p_max_rating IS NULL OR cdv.average_rating <= p_max_rating)
        AND (p_min_rate IS NULL OR cdv.session_rate >= p_min_rate)
        AND (p_max_rate IS NULL OR cdv.session_rate <= p_max_rate)
        AND (p_min_experience IS NULL OR cdv.experience_years >= p_min_experience)
        AND cdv.currency = p_currency
        AND (p_available_on_date IS NULL OR
             EXISTS (
                 SELECT 1
                 FROM get_coach_available_slots(cdv.coach_id, p_available_on_date) slots
                 WHERE slots.is_available = true
             ));

    RETURN result_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get coach profile details (for modal/detail view)
CREATE OR REPLACE FUNCTION get_coach_profile_details(p_coach_id UUID)
RETURNS JSON AS $$
DECLARE
    profile_json JSON;
BEGIN
    SELECT json_build_object(
        'coach_id', cdv.coach_id,
        'full_name', cdv.full_name,
        'email', cdv.email,
        'avatar_url', cdv.avatar_url,
        'bio', cdv.bio,
        'session_rate', cdv.session_rate,
        'currency', cdv.currency,
        'specializations', cdv.specializations,
        'certifications', cdv.certifications,
        'experience_years', cdv.experience_years,
        'languages', cdv.languages,
        'timezone', cdv.timezone,
        'average_rating', cdv.average_rating,
        'total_ratings', cdv.total_ratings,
        'completed_sessions', cdv.completed_sessions,
        'upcoming_sessions', cdv.upcoming_sessions,
        'next_available_date', cdv.next_available_date,
        'next_available_time', cdv.next_available_time,
        'availability_summary', (
            SELECT json_agg(json_build_object(
                'day_of_week', ca.day_of_week,
                'start_time', ca.start_time,
                'end_time', ca.end_time,
                'timezone', ca.timezone,
                'session_duration', ca.session_duration_minutes
            ))
            FROM coach_availability ca
            WHERE ca.coach_id = p_coach_id
            AND ca.is_recurring = true
            AND ca.is_available = true
        ),
        'recent_reviews', (
            SELECT COALESCE(json_agg(json_build_object(
                'rating', sr.rating,
                'comment', sr.comment,
                'created_at', sr.created_at,
                'client_name', u.first_name
            )), '[]'::json)
            FROM session_ratings sr
            JOIN sessions s ON s.id = sr.session_id
            JOIN users u ON u.id = s.client_id
            WHERE s.coach_id = p_coach_id
            ORDER BY sr.created_at DESC
            LIMIT 5
        )
    ) INTO profile_json
    FROM coach_discovery_view cdv
    WHERE cdv.coach_id = p_coach_id;

    RETURN profile_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get featured coaches (highest rated with availability)
CREATE OR REPLACE FUNCTION get_featured_coaches(
    p_limit INTEGER DEFAULT 6
)
RETURNS TABLE (
    coach_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    session_rate DECIMAL,
    average_rating NUMERIC,
    total_ratings BIGINT,
    specializations TEXT[],
    next_available_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cdv.coach_id,
        cdv.full_name,
        cdv.avatar_url,
        cdv.bio,
        cdv.session_rate,
        cdv.average_rating,
        cdv.total_ratings,
        cdv.specializations,
        cdv.next_available_date
    FROM coach_discovery_view cdv
    WHERE cdv.total_ratings >= 3 -- At least 3 ratings
    AND cdv.average_rating >= 4.0 -- Minimum 4.0 rating
    AND cdv.next_available_date IS NOT NULL -- Has availability
    ORDER BY
        cdv.average_rating DESC,
        cdv.total_ratings DESC,
        cdv.completed_sessions DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get similar coaches (based on specializations)
CREATE OR REPLACE FUNCTION get_similar_coaches(
    p_coach_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    coach_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    specializations TEXT[],
    session_rate DECIMAL,
    average_rating NUMERIC,
    similarity_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH target_coach AS (
        SELECT specializations
        FROM coach_discovery_view
        WHERE coach_id = p_coach_id
    )
    SELECT
        cdv.coach_id,
        cdv.full_name,
        cdv.avatar_url,
        cdv.specializations,
        cdv.session_rate,
        cdv.average_rating,
        -- Calculate similarity based on overlapping specializations
        (
            SELECT COUNT(*)::INTEGER
            FROM unnest(cdv.specializations) AS spec
            WHERE spec = ANY((SELECT specializations FROM target_coach))
        ) AS similarity_score
    FROM coach_discovery_view cdv
    WHERE cdv.coach_id != p_coach_id
    AND EXISTS (
        SELECT 1
        FROM unnest(cdv.specializations) AS spec
        WHERE spec = ANY((SELECT specializations FROM target_coach))
    )
    ORDER BY similarity_score DESC, cdv.average_rating DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant select on materialized view
GRANT SELECT ON coach_discovery_view TO authenticated;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_coach_discovery_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION search_coaches(TEXT, TEXT[], TEXT[], DECIMAL, DECIMAL, DECIMAL, DECIMAL, INTEGER, TEXT, DATE, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION count_search_coaches(TEXT, TEXT[], TEXT[], DECIMAL, DECIMAL, DECIMAL, DECIMAL, INTEGER, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_profile_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_coaches(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_similar_coaches(UUID, INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON MATERIALIZED VIEW coach_discovery_view IS 'Cached view of all coaches with ratings, availability, and search metadata';
COMMENT ON FUNCTION refresh_coach_discovery_cache() IS 'Refresh coach discovery cache including next available slots';
COMMENT ON FUNCTION search_coaches(TEXT, TEXT[], TEXT[], DECIMAL, DECIMAL, DECIMAL, DECIMAL, INTEGER, TEXT, DATE, TEXT, TEXT, INTEGER, INTEGER) IS 'Comprehensive coach search with filters, sorting, and pagination';
COMMENT ON FUNCTION count_search_coaches(TEXT, TEXT[], TEXT[], DECIMAL, DECIMAL, DECIMAL, DECIMAL, INTEGER, TEXT, DATE) IS 'Count coaches matching search criteria (for pagination)';
COMMENT ON FUNCTION get_coach_profile_details(UUID) IS 'Get complete coach profile with availability, reviews, and statistics';
COMMENT ON FUNCTION get_featured_coaches(INTEGER) IS 'Get top-rated coaches with availability for homepage';
COMMENT ON FUNCTION get_similar_coaches(UUID, INTEGER) IS 'Find coaches with similar specializations for recommendations';

-- Initial cache population
SELECT refresh_coach_discovery_cache();

-- Schedule cache refresh (if pg_cron available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'refresh-coach-discovery',
            '*/30 * * * *', -- Every 30 minutes
            'SELECT refresh_coach_discovery_cache();'
        );
        RAISE NOTICE 'Scheduled cache refresh every 30 minutes for coach discovery';
    ELSE
        RAISE NOTICE 'pg_cron not available - manual cache refresh recommended';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not schedule cache refresh - run manually: SELECT refresh_coach_discovery_cache();';
END $$;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Coach discovery system installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Materialized view with coach data, ratings, availability';
    RAISE NOTICE '  - Full-text search on name and bio';
    RAISE NOTICE '  - Comprehensive filters (specializations, rating, rate, experience, language)';
    RAISE NOTICE '  - Multiple sort options (rating, rate, experience, popularity, name)';
    RAISE NOTICE '  - Availability filtering by date';
    RAISE NOTICE '  - Coach profile details with reviews';
    RAISE NOTICE '  - Featured coaches (top rated)';
    RAISE NOTICE '  - Similar coach recommendations';
    RAISE NOTICE '  - Pagination support with count function';
END $$;
