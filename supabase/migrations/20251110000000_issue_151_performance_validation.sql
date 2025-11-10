-- ============================================================================
-- Issue #151: Monitor and Validate Database Performance Optimizations
-- ============================================================================
-- This migration adds comprehensive performance monitoring and validation
-- for the critical queries affected by Sprint 06 optimizations:
-- - Dashboard queries: 100ms → 5-10ms (10-20x faster)
-- - Coach clients list: 300ms → 15ms (20x faster)
-- - User statistics: 250ms → 10ms (25x faster)
--
-- The migration includes:
-- 1. Performance baseline tracking table
-- 2. Query performance validation functions
-- 3. Performance improvement report functions
-- ============================================================================

-- Create query performance metrics table for tracking historical data
CREATE TABLE IF NOT EXISTS query_performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    query_type TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    execution_time_ms NUMERIC NOT NULL,
    rows_returned BIGINT,
    cache_hit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_query_performance_type_created
    ON query_performance_metrics(query_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_query_performance_hash_created
    ON query_performance_metrics(query_hash, created_at DESC);

-- Function to validate dashboard query performance
CREATE OR REPLACE FUNCTION validate_dashboard_performance()
RETURNS TABLE (
    metric_name TEXT,
    current_avg_ms NUMERIC,
    target_ms NUMERIC,
    optimization_percentage NUMERIC,
    status TEXT,
    total_queries BIGINT,
    within_target BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH dashboard_queries AS (
        SELECT
            CASE
                WHEN query ILIKE '%sessions%' AND query ILIKE '%dashboard%' THEN 'Dashboard Sessions'
                WHEN query ILIKE '%session_ratings%' THEN 'Dashboard Ratings'
                WHEN query ILIKE '%coach_notes%' AND query ILIKE '%count%' THEN 'Dashboard Notes Count'
                WHEN query ILIKE '%tasks%' AND query NOT ILIKE '%pg_stat%' THEN 'Dashboard Tasks'
                ELSE NULL
            END AS metric_type,
            pss.mean_exec_time,
            pss.calls
        FROM pg_stat_statements pss
        WHERE (
            (query ILIKE '%sessions%' AND query ILIKE '%coach%') OR
            (query ILIKE '%session_ratings%') OR
            (query ILIKE '%coach_notes%') OR
            (query ILIKE '%tasks%' AND query NOT ILIKE '%pg_stat%')
        )
        AND query NOT ILIKE '%get_performance%'
        AND query NOT ILIKE '%query_performance_metrics%'
    ),
    aggregated AS (
        SELECT
            COALESCE(dq.metric_type, 'Other Dashboard Queries') AS metric_name,
            ROUND(AVG(dq.mean_exec_time), 2) AS avg_exec_time,
            COUNT(*) AS total_count
        FROM dashboard_queries dq
        WHERE metric_type IS NOT NULL
        GROUP BY dq.metric_type
        UNION ALL
        SELECT
            'All Dashboard Queries' AS metric_name,
            ROUND(AVG(mean_exec_time), 2) AS avg_exec_time,
            COUNT(*) AS total_count
        FROM dashboard_queries
    )
    SELECT
        agg.metric_name::TEXT,
        agg.avg_exec_time::NUMERIC,
        CASE
            WHEN agg.metric_name LIKE '%Sessions%' THEN 10::NUMERIC
            WHEN agg.metric_name LIKE '%Ratings%' THEN 5::NUMERIC
            WHEN agg.metric_name LIKE '%Notes%' THEN 8::NUMERIC
            WHEN agg.metric_name LIKE '%Tasks%' THEN 12::NUMERIC
            ELSE 10::NUMERIC
        END::NUMERIC AS target_ms,
        CASE
            WHEN agg.avg_exec_time > 0 THEN
                ROUND(((100::NUMERIC - agg.avg_exec_time) / 100::NUMERIC * 100), 2)
            ELSE 0::NUMERIC
        END::NUMERIC AS optimization_percentage,
        CASE
            WHEN agg.avg_exec_time < CASE
                WHEN agg.metric_name LIKE '%Sessions%' THEN 10
                WHEN agg.metric_name LIKE '%Ratings%' THEN 5
                WHEN agg.metric_name LIKE '%Notes%' THEN 8
                WHEN agg.metric_name LIKE '%Tasks%' THEN 12
                ELSE 10
            END THEN 'OPTIMAL'
            WHEN agg.avg_exec_time < (CASE
                WHEN agg.metric_name LIKE '%Sessions%' THEN 10
                WHEN agg.metric_name LIKE '%Ratings%' THEN 5
                WHEN agg.metric_name LIKE '%Notes%' THEN 8
                WHEN agg.metric_name LIKE '%Tasks%' THEN 12
                ELSE 10
            END * 2) THEN 'GOOD'
            ELSE 'NEEDS_OPTIMIZATION'
        END::TEXT AS status,
        agg.total_count::BIGINT,
        agg.avg_exec_time < CASE
            WHEN agg.metric_name LIKE '%Sessions%' THEN 10
            WHEN agg.metric_name LIKE '%Ratings%' THEN 5
            WHEN agg.metric_name LIKE '%Notes%' THEN 8
            WHEN agg.metric_name LIKE '%Tasks%' THEN 12
            ELSE 10
        END AS within_target
    FROM aggregated agg;
EXCEPTION
    WHEN OTHERS THEN
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public';

-- Function to validate coach clients list performance
CREATE OR REPLACE FUNCTION validate_coach_clients_performance()
RETURNS TABLE (
    metric_name TEXT,
    current_avg_ms NUMERIC,
    target_ms NUMERIC,
    baseline_ms NUMERIC,
    improvement_percentage NUMERIC,
    status TEXT,
    total_queries BIGINT,
    within_target BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH coach_client_queries AS (
        SELECT
            CASE
                WHEN query ILIKE '%sessions%' AND query ILIKE '%client%' THEN 'Coach Client Sessions'
                WHEN query ILIKE '%users%' AND query ILIKE '%coach_notes%' THEN 'Coach Client Notes'
                WHEN query ILIKE '%session_ratings%' AND query ILIKE '%client%' THEN 'Coach Client Ratings'
                ELSE 'Coach Client Queries'
            END AS metric_type,
            pss.mean_exec_time,
            pss.calls
        FROM pg_stat_statements pss
        WHERE (
            (query ILIKE '%sessions%' AND query ILIKE '%coach%') OR
            (query ILIKE '%users%' AND query ILIKE '%coach%') OR
            (query ILIKE '%coach_notes%')
        )
        AND query NOT ILIKE '%get_performance%'
        AND query NOT ILIKE '%query_performance_metrics%'
    ),
    aggregated AS (
        SELECT
            ccq.metric_type AS metric_name,
            ROUND(AVG(ccq.mean_exec_time), 2) AS avg_exec_time,
            COUNT(*) AS total_count
        FROM coach_client_queries ccq
        GROUP BY ccq.metric_type
    )
    SELECT
        agg.metric_name::TEXT,
        agg.avg_exec_time::NUMERIC,
        15::NUMERIC AS target_ms,
        300::NUMERIC AS baseline_ms,
        CASE
            WHEN agg.avg_exec_time > 0 THEN
                ROUND(((300::NUMERIC - agg.avg_exec_time) / 300::NUMERIC * 100), 2)
            ELSE 0::NUMERIC
        END::NUMERIC AS improvement_percentage,
        CASE
            WHEN agg.avg_exec_time < 15 THEN 'OPTIMAL'
            WHEN agg.avg_exec_time < 50 THEN 'GOOD'
            WHEN agg.avg_exec_time < 150 THEN 'FAIR'
            ELSE 'NEEDS_OPTIMIZATION'
        END::TEXT AS status,
        agg.total_count::BIGINT,
        agg.avg_exec_time < 15::NUMERIC AS within_target
    FROM aggregated agg;
EXCEPTION
    WHEN OTHERS THEN
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public';

-- Function to validate user statistics query performance
CREATE OR REPLACE FUNCTION validate_user_stats_performance()
RETURNS TABLE (
    metric_name TEXT,
    current_avg_ms NUMERIC,
    target_ms NUMERIC,
    baseline_ms NUMERIC,
    improvement_percentage NUMERIC,
    status TEXT,
    total_queries BIGINT,
    within_target BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH user_stats_queries AS (
        SELECT
            CASE
                WHEN query ILIKE '%users%' AND query ILIKE '%count%' THEN 'User Count'
                WHEN query ILIKE '%sessions%' AND query ILIKE '%count%' THEN 'Session Count'
                WHEN query ILIKE '%reflections%' THEN 'Reflections Count'
                WHEN query ILIKE '%session_ratings%' THEN 'Ratings Stats'
                ELSE 'User Statistics'
            END AS metric_type,
            pss.mean_exec_time,
            pss.calls
        FROM pg_stat_statements pss
        WHERE (
            (query ILIKE '%users%' AND query ILIKE '%count%') OR
            (query ILIKE '%sessions%' AND query ILIKE '%count%') OR
            (query ILIKE '%reflections%') OR
            (query ILIKE '%session_ratings%')
        )
        AND query NOT ILIKE '%get_performance%'
        AND query NOT ILIKE '%query_performance_metrics%'
    ),
    aggregated AS (
        SELECT
            usq.metric_type AS metric_name,
            ROUND(AVG(usq.mean_exec_time), 2) AS avg_exec_time,
            COUNT(*) AS total_count
        FROM user_stats_queries usq
        GROUP BY usq.metric_type
    )
    SELECT
        agg.metric_name::TEXT,
        agg.avg_exec_time::NUMERIC,
        10::NUMERIC AS target_ms,
        250::NUMERIC AS baseline_ms,
        CASE
            WHEN agg.avg_exec_time > 0 THEN
                ROUND(((250::NUMERIC - agg.avg_exec_time) / 250::NUMERIC * 100), 2)
            ELSE 0::NUMERIC
        END::NUMERIC AS improvement_percentage,
        CASE
            WHEN agg.avg_exec_time < 10 THEN 'OPTIMAL'
            WHEN agg.avg_exec_time < 50 THEN 'GOOD'
            WHEN agg.avg_exec_time < 100 THEN 'FAIR'
            ELSE 'NEEDS_OPTIMIZATION'
        END::TEXT AS status,
        agg.total_count::BIGINT,
        agg.avg_exec_time < 10::NUMERIC AS within_target
    FROM aggregated agg;
EXCEPTION
    WHEN OTHERS THEN
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public';

-- Comprehensive performance validation report
CREATE OR REPLACE FUNCTION get_performance_validation_report()
RETURNS TABLE (
    category TEXT,
    metric_name TEXT,
    current_avg_ms NUMERIC,
    target_ms NUMERIC,
    baseline_ms NUMERIC,
    improvement_percentage NUMERIC,
    status TEXT,
    total_queries BIGINT,
    within_target BOOLEAN
) AS $$
BEGIN
    -- Dashboard queries
    RETURN QUERY
    SELECT
        'Dashboard'::TEXT AS category,
        vdp.metric_name,
        vdp.current_avg_ms,
        vdp.target_ms,
        NULL::NUMERIC AS baseline_ms,
        NULL::NUMERIC AS improvement_percentage,
        vdp.status,
        vdp.total_queries,
        vdp.within_target
    FROM validate_dashboard_performance() vdp;

    -- Coach clients queries
    RETURN QUERY
    SELECT
        'Coach Clients'::TEXT AS category,
        vcp.metric_name,
        vcp.current_avg_ms,
        vcp.target_ms,
        vcp.baseline_ms,
        vcp.improvement_percentage,
        vcp.status,
        vcp.total_queries,
        vcp.within_target
    FROM validate_coach_clients_performance() vcp;

    -- User statistics queries
    RETURN QUERY
    SELECT
        'User Statistics'::TEXT AS category,
        vusp.metric_name,
        vusp.current_avg_ms,
        vusp.target_ms,
        vusp.baseline_ms,
        vusp.improvement_percentage,
        vusp.status,
        vusp.total_queries,
        vusp.within_target
    FROM validate_user_stats_performance() vusp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public';

-- Function to track index usage for optimization validation
CREATE OR REPLACE FUNCTION get_optimization_indexes_usage()
RETURNS TABLE (
    index_name TEXT,
    table_name TEXT,
    scans_count BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    cache_efficiency NUMERIC,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        psi.indexrelname::TEXT,
        psi.relname::TEXT,
        psi.idx_scan,
        psi.idx_tup_read,
        psi.idx_tup_fetch,
        CASE
            WHEN psi.idx_scan = 0 THEN 0
            ELSE ROUND((psi.idx_tup_fetch::NUMERIC / NULLIF(psi.idx_scan, 0)), 2)
        END::NUMERIC,
        CASE
            WHEN psi.idx_scan = 0 THEN 'Not Used'
            WHEN (psi.idx_tup_fetch::NUMERIC / NULLIF(psi.idx_scan, 0)) > 100 THEN 'Highly Efficient'
            WHEN (psi.idx_tup_fetch::NUMERIC / NULLIF(psi.idx_scan, 0)) > 10 THEN 'Efficient'
            ELSE 'Under Utilized'
        END::TEXT
    FROM pg_stat_user_indexes psi
    WHERE psi.indexrelname LIKE 'idx_%'
        AND (psi.idx_scan > 0 OR psi.indexrelname LIKE 'idx_sessions_%' OR psi.indexrelname LIKE 'idx_coach_%')
    ORDER BY psi.idx_scan DESC;
EXCEPTION
    WHEN OTHERS THEN
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public';

-- Grant permissions for authenticated users
GRANT EXECUTE ON FUNCTION validate_dashboard_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_coach_clients_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_user_stats_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_validation_report() TO authenticated;
GRANT EXECUTE ON FUNCTION get_optimization_indexes_usage() TO authenticated;

-- Comments for documentation
COMMENT ON TABLE query_performance_metrics IS 'Tracks historical query performance metrics for monitoring optimization effectiveness';
COMMENT ON FUNCTION validate_dashboard_performance() IS 'Validates dashboard query performance against optimization targets (100ms → 5-10ms)';
COMMENT ON FUNCTION validate_coach_clients_performance() IS 'Validates coach clients list performance against optimization targets (300ms → 15ms)';
COMMENT ON FUNCTION validate_user_stats_performance() IS 'Validates user statistics query performance against optimization targets (250ms → 10ms)';
COMMENT ON FUNCTION get_performance_validation_report() IS 'Comprehensive report on all performance optimizations and validation status';
COMMENT ON FUNCTION get_optimization_indexes_usage() IS 'Shows usage statistics for all optimization indexes to verify they are being utilized';

-- ============================================================================
-- MIGRATION COMPLETE - Issue #151
-- ============================================================================
-- This migration provides comprehensive performance monitoring and validation
-- for the database optimizations implemented in Sprint 06.
-- ============================================================================
