-- Coach-Specific Rate Lookup Enhancement
-- Sprint 01 - Task 1.4.1: Implement Coach-Specific Rate Lookup
-- Adds functions for efficient coach rate retrieval

-- Function to get coach session rate
CREATE OR REPLACE FUNCTION get_coach_session_rate(p_coach_id UUID)
RETURNS TABLE (
    coach_id UUID,
    session_rate DECIMAL(10,2),
    currency VARCHAR(3),
    rate_updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.coach_id,
        cp.session_rate,
        cp.currency,
        cp.updated_at AS rate_updated_at
    FROM coach_profiles cp
    WHERE cp.coach_id = p_coach_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get multiple coach rates efficiently (batch lookup)
CREATE OR REPLACE FUNCTION get_coach_rates_batch(p_coach_ids UUID[])
RETURNS TABLE (
    coach_id UUID,
    session_rate DECIMAL(10,2),
    currency VARCHAR(3),
    coach_name TEXT,
    experience_years INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.coach_id,
        cp.session_rate,
        cp.currency,
        (u.first_name || ' ' || COALESCE(u.last_name, ''))::TEXT AS coach_name,
        cp.experience_years
    FROM coach_profiles cp
    JOIN users u ON u.id = cp.coach_id
    WHERE cp.coach_id = ANY(p_coach_ids)
    ORDER BY cp.session_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get average rate by specialization
CREATE OR REPLACE FUNCTION get_average_rate_by_specialization(p_specialization TEXT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    avg_rate DECIMAL(10,2);
BEGIN
    SELECT AVG(session_rate) INTO avg_rate
    FROM coach_profiles
    WHERE p_specialization = ANY(specializations);

    RETURN COALESCE(avg_rate, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get rate range (min/max/avg) for all coaches
CREATE OR REPLACE FUNCTION get_coach_rate_statistics()
RETURNS TABLE (
    min_rate DECIMAL(10,2),
    max_rate DECIMAL(10,2),
    avg_rate DECIMAL(10,2),
    median_rate DECIMAL(10,2),
    total_coaches INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        MIN(session_rate) AS min_rate,
        MAX(session_rate) AS max_rate,
        AVG(session_rate) AS avg_rate,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY session_rate) AS median_rate,
        COUNT(*)::INTEGER AS total_coaches
    FROM coach_profiles
    WHERE session_rate > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Materialized view for rate caching (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS coach_rates_cache AS
SELECT
    cp.coach_id,
    cp.session_rate,
    cp.currency,
    cp.specializations,
    cp.experience_years,
    u.first_name || ' ' || COALESCE(u.last_name, '') AS coach_name,
    cp.updated_at,
    NOW() AS cache_updated_at
FROM coach_profiles cp
JOIN users u ON u.id = cp.coach_id
WHERE cp.session_rate > 0;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_rates_cache_coach_id
ON coach_rates_cache(coach_id);

-- Create index on rate for range queries
CREATE INDEX IF NOT EXISTS idx_coach_rates_cache_rate
ON coach_rates_cache(session_rate);

-- Function to refresh rate cache
CREATE OR REPLACE FUNCTION refresh_coach_rates_cache()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY coach_rates_cache;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rate from cache (fastest lookup)
CREATE OR REPLACE FUNCTION get_coach_rate_cached(p_coach_id UUID)
RETURNS TABLE (
    coach_id UUID,
    session_rate DECIMAL(10,2),
    currency VARCHAR(3),
    coach_name TEXT,
    cache_age INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        crc.coach_id,
        crc.session_rate,
        crc.currency,
        crc.coach_name,
        NOW() - crc.cache_updated_at AS cache_age
    FROM coach_rates_cache crc
    WHERE crc.coach_id = p_coach_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to search coaches by rate range
CREATE OR REPLACE FUNCTION find_coaches_by_rate_range(
    p_min_rate DECIMAL(10,2),
    p_max_rate DECIMAL(10,2),
    p_currency VARCHAR(3) DEFAULT 'USD',
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    coach_id UUID,
    coach_name TEXT,
    session_rate DECIMAL(10,2),
    currency VARCHAR(3),
    specializations TEXT[],
    experience_years INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        crc.coach_id,
        crc.coach_name,
        crc.session_rate,
        crc.currency,
        crc.specializations,
        crc.experience_years
    FROM coach_rates_cache crc
    WHERE crc.session_rate BETWEEN p_min_rate AND p_max_rate
    AND crc.currency = p_currency
    ORDER BY crc.session_rate, crc.experience_years DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add index on coach_profiles for rate lookups
CREATE INDEX IF NOT EXISTS idx_coach_profiles_session_rate
ON coach_profiles(session_rate) WHERE session_rate > 0;

CREATE INDEX IF NOT EXISTS idx_coach_profiles_currency_rate
ON coach_profiles(currency, session_rate);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_coach_session_rate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_rates_batch(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_average_rate_by_specialization(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_rate_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_coach_rates_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_rate_cached(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION find_coaches_by_rate_range(DECIMAL, DECIMAL, VARCHAR, INTEGER) TO authenticated;

-- Grant select on materialized view
GRANT SELECT ON coach_rates_cache TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION get_coach_session_rate(UUID) IS 'Get current session rate for a specific coach';
COMMENT ON FUNCTION get_coach_rates_batch(UUID[]) IS 'Batch lookup for multiple coach rates efficiently';
COMMENT ON FUNCTION get_average_rate_by_specialization(TEXT) IS 'Calculate average rate for coaches with specific specialization';
COMMENT ON FUNCTION get_coach_rate_statistics() IS 'Get rate statistics across all coaches';
COMMENT ON FUNCTION refresh_coach_rates_cache() IS 'Refresh materialized view for rate caching';
COMMENT ON FUNCTION get_coach_rate_cached(UUID) IS 'Fast rate lookup using materialized view cache';
COMMENT ON FUNCTION find_coaches_by_rate_range(DECIMAL, DECIMAL, VARCHAR, INTEGER) IS 'Find coaches within a specific rate range';
COMMENT ON MATERIALIZED VIEW coach_rates_cache IS 'Cached coach rates for fast lookups - refresh periodically';

-- Create a scheduled job to refresh cache (if pg_cron is available)
-- Note: This requires pg_cron extension which may need to be enabled
DO $$
BEGIN
    -- Check if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule cache refresh every hour
        PERFORM cron.schedule(
            'refresh-coach-rates-cache',
            '0 * * * *', -- Every hour
            'SELECT refresh_coach_rates_cache();'
        );
        RAISE NOTICE 'Scheduled hourly cache refresh for coach rates';
    ELSE
        RAISE NOTICE 'pg_cron extension not available - manual cache refresh required';
        RAISE NOTICE 'Run "SELECT refresh_coach_rates_cache();" periodically to update cache';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not schedule cache refresh: %', SQLERRM;
        RAISE NOTICE 'Manual cache refresh can be done with: SELECT refresh_coach_rates_cache();';
END $$;

-- Initial cache population
SELECT refresh_coach_rates_cache();

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Coach rate lookup system installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Fast rate lookup functions';
    RAISE NOTICE '  - Batch rate retrieval';
    RAISE NOTICE '  - Rate statistics and analytics';
    RAISE NOTICE '  - Materialized view caching';
    RAISE NOTICE '  - Rate range search';
END $$;
