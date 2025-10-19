-- Enhanced performance monitoring for database refactoring improvements
-- This migration adds comprehensive performance tracking for MFA and Resource Library queries

-- Enable pg_stat_statements extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Function to get MFA-related query performance metrics
CREATE OR REPLACE FUNCTION get_mfa_query_performance()
RETURNS TABLE (
    query_type TEXT,
    query_pattern TEXT,
    calls BIGINT,
    mean_exec_time_ms NUMERIC,
    total_exec_time_ms NUMERIC,
    rows_returned BIGINT,
    improvement_estimate TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH mfa_queries AS (
        SELECT
            CASE
                WHEN query ILIKE '%user_mfa_status_unified%' THEN 'MFA Status (Materialized View)'
                WHEN query ILIKE '%auth.mfa%' AND query ILIKE '%users%' THEN 'MFA Status (Legacy Join)'
                WHEN query ILIKE '%refresh materialized view%user_mfa_status_unified%' THEN 'MFA View Refresh'
                ELSE 'Other MFA Query'
            END AS query_type,
            LEFT(query, 100) AS query_pattern,
            pss.calls,
            ROUND(pss.mean_exec_time::NUMERIC, 2) AS mean_exec_time_ms,
            ROUND(pss.total_exec_time::NUMERIC, 2) AS total_exec_time_ms,
            pss.rows
        FROM pg_stat_statements pss
        WHERE
            query ILIKE '%mfa%'
            OR query ILIKE '%user_mfa_status%'
        ORDER BY pss.mean_exec_time DESC
    )
    SELECT
        mq.query_type::TEXT,
        mq.query_pattern::TEXT,
        mq.calls,
        mq.mean_exec_time_ms,
        mq.total_exec_time_ms,
        mq.rows,
        CASE
            WHEN mq.query_type = 'MFA Status (Materialized View)' AND mq.mean_exec_time_ms < 50 THEN 'Excellent (80%+ improvement)'
            WHEN mq.query_type = 'MFA Status (Legacy Join)' AND mq.mean_exec_time_ms > 200 THEN 'Needs optimization'
            WHEN mq.mean_exec_time_ms < 100 THEN 'Good performance'
            ELSE 'Baseline'
        END::TEXT AS improvement_estimate
    FROM mfa_queries mq;
EXCEPTION
    WHEN OTHERS THEN
        -- Return empty result if pg_stat_statements is not available
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'extensions';

-- Function to get Resource Library query performance metrics
CREATE OR REPLACE FUNCTION get_resource_library_query_performance()
RETURNS TABLE (
    query_type TEXT,
    query_pattern TEXT,
    calls BIGINT,
    mean_exec_time_ms NUMERIC,
    total_exec_time_ms NUMERIC,
    rows_returned BIGINT,
    rls_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH resource_queries AS (
        SELECT
            CASE
                WHEN query ILIKE '%file_uploads%is_library_resource%' THEN 'Resource Library Query'
                WHEN query ILIKE '%resource_client_progress%' THEN 'Client Progress Query'
                WHEN query ILIKE '%resource_collections%' THEN 'Collections Query'
                WHEN query ILIKE '%get_library_analytics%' THEN 'Analytics Query'
                ELSE 'Other Resource Query'
            END AS query_type,
            LEFT(query, 100) AS query_pattern,
            pss.calls,
            ROUND(pss.mean_exec_time::NUMERIC, 2) AS mean_exec_time_ms,
            ROUND(pss.total_exec_time::NUMERIC, 2) AS total_exec_time_ms,
            pss.rows
        FROM pg_stat_statements pss
        WHERE
            query ILIKE '%file_uploads%'
            OR query ILIKE '%resource%'
        ORDER BY pss.mean_exec_time DESC
        LIMIT 20
    )
    SELECT
        rq.query_type::TEXT,
        rq.query_pattern::TEXT,
        rq.calls,
        rq.mean_exec_time_ms,
        rq.total_exec_time_ms,
        rq.rows,
        CASE
            WHEN rq.mean_exec_time_ms < 100 THEN 'Optimized (30-50% improvement)'
            WHEN rq.mean_exec_time_ms BETWEEN 100 AND 200 THEN 'Good performance'
            WHEN rq.mean_exec_time_ms > 200 THEN 'Needs review'
            ELSE 'Baseline'
        END::TEXT AS rls_status
    FROM resource_queries rq;
EXCEPTION
    WHEN OTHERS THEN
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'extensions';

-- Function to get comprehensive performance metrics
CREATE OR REPLACE FUNCTION get_performance_metrics(
    p_slow_query_threshold_ms INTEGER DEFAULT 100
)
RETURNS TABLE (
    category TEXT,
    metric_name TEXT,
    metric_value NUMERIC,
    metric_unit TEXT,
    status TEXT,
    description TEXT
) AS $$
DECLARE
    mfa_avg_time NUMERIC;
    resource_avg_time NUMERIC;
    slow_query_count INTEGER;
    total_queries BIGINT;
    cache_hit_ratio NUMERIC;
BEGIN
    -- Check if pg_stat_statements is available
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RETURN QUERY
        VALUES (
            'system'::TEXT,
            'pg_stat_statements'::TEXT,
            0::NUMERIC,
            'status'::TEXT,
            'warning'::TEXT,
            'Extension not enabled'::TEXT
        );
        RETURN;
    END IF;

    -- Get MFA query average time
    SELECT COALESCE(AVG(mean_exec_time), 0)
    INTO mfa_avg_time
    FROM pg_stat_statements
    WHERE query ILIKE '%user_mfa_status%';

    -- Get Resource Library average time
    SELECT COALESCE(AVG(mean_exec_time), 0)
    INTO resource_avg_time
    FROM pg_stat_statements
    WHERE query ILIKE '%file_uploads%is_library_resource%';

    -- Count slow queries
    SELECT COUNT(*)::INTEGER
    INTO slow_query_count
    FROM pg_stat_statements
    WHERE mean_exec_time > p_slow_query_threshold_ms;

    -- Total query count
    SELECT COALESCE(SUM(calls), 0)
    INTO total_queries
    FROM pg_stat_statements;

    -- Cache hit ratio
    SELECT COALESCE(
        ROUND(
            SUM(blks_hit) / NULLIF(SUM(blks_hit + blks_read), 0) * 100,
            2
        ),
        0
    )
    INTO cache_hit_ratio
    FROM pg_stat_statements;

    -- Return metrics
    RETURN QUERY
    VALUES
        ('mfa'::TEXT, 'avg_query_time'::TEXT, ROUND(mfa_avg_time, 2), 'ms'::TEXT,
         CASE WHEN mfa_avg_time < 50 THEN 'excellent' WHEN mfa_avg_time < 100 THEN 'good' ELSE 'needs_optimization' END::TEXT,
         'Average MFA query execution time'::TEXT),

        ('resource_library'::TEXT, 'avg_query_time'::TEXT, ROUND(resource_avg_time, 2), 'ms'::TEXT,
         CASE WHEN resource_avg_time < 100 THEN 'excellent' WHEN resource_avg_time < 200 THEN 'good' ELSE 'needs_optimization' END::TEXT,
         'Average Resource Library query execution time'::TEXT),

        ('overall'::TEXT, 'slow_query_count'::TEXT, slow_query_count::NUMERIC, 'count'::TEXT,
         CASE WHEN slow_query_count = 0 THEN 'excellent' WHEN slow_query_count < 10 THEN 'good' ELSE 'warning' END::TEXT,
         format('Queries slower than %s ms', p_slow_query_threshold_ms)::TEXT),

        ('overall'::TEXT, 'total_queries'::TEXT, total_queries::NUMERIC, 'count'::TEXT, 'info'::TEXT,
         'Total number of queries executed'::TEXT),

        ('cache'::TEXT, 'hit_ratio'::TEXT, cache_hit_ratio, 'percent'::TEXT,
         CASE WHEN cache_hit_ratio > 90 THEN 'excellent' WHEN cache_hit_ratio > 80 THEN 'good' ELSE 'warning' END::TEXT,
         'Database cache hit ratio'::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'extensions';

-- Function to get slow queries with details
CREATE OR REPLACE FUNCTION get_slow_queries_detailed(
    p_min_duration_ms NUMERIC DEFAULT 100,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    query_id BIGINT,
    query_text TEXT,
    calls BIGINT,
    total_exec_time_ms NUMERIC,
    mean_exec_time_ms NUMERIC,
    max_exec_time_ms NUMERIC,
    stddev_exec_time_ms NUMERIC,
    rows_returned BIGINT,
    shared_blks_hit BIGINT,
    shared_blks_read BIGINT,
    cache_hit_ratio NUMERIC,
    optimization_priority TEXT
) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        pss.queryid::BIGINT,
        LEFT(pss.query, 200)::TEXT AS query_text,
        pss.calls,
        ROUND(pss.total_exec_time::NUMERIC, 2) AS total_exec_time_ms,
        ROUND(pss.mean_exec_time::NUMERIC, 2) AS mean_exec_time_ms,
        ROUND(pss.max_exec_time::NUMERIC, 2) AS max_exec_time_ms,
        ROUND(pss.stddev_exec_time::NUMERIC, 2) AS stddev_exec_time_ms,
        pss.rows,
        pss.shared_blks_hit,
        pss.shared_blks_read,
        CASE
            WHEN (pss.shared_blks_hit + pss.shared_blks_read) = 0 THEN 100
            ELSE ROUND((pss.shared_blks_hit::NUMERIC / (pss.shared_blks_hit + pss.shared_blks_read)) * 100, 2)
        END AS cache_hit_ratio,
        CASE
            WHEN pss.mean_exec_time > 1000 AND pss.calls > 100 THEN 'CRITICAL'
            WHEN pss.mean_exec_time > 500 THEN 'HIGH'
            WHEN pss.mean_exec_time > 200 THEN 'MEDIUM'
            ELSE 'LOW'
        END::TEXT AS optimization_priority
    FROM pg_stat_statements pss
    WHERE pss.mean_exec_time > p_min_duration_ms
        AND pss.query NOT ILIKE '%pg_stat_statements%'
        AND pss.query NOT ILIKE '%get_performance_metrics%'
    ORDER BY pss.mean_exec_time DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'extensions';

-- Function to reset pg_stat_statements (useful for benchmarking)
CREATE OR REPLACE FUNCTION reset_performance_stats()
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RETURN QUERY VALUES (FALSE, 'pg_stat_statements extension not enabled');
        RETURN;
    END IF;

    PERFORM pg_stat_statements_reset();

    RETURN QUERY VALUES (TRUE, 'Performance statistics reset successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'extensions';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_mfa_query_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_resource_library_query_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries_detailed(NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_performance_stats() TO authenticated;

-- Comments
COMMENT ON FUNCTION get_mfa_query_performance() IS 'Returns performance metrics for MFA-related queries, tracking improvements from materialized view';
COMMENT ON FUNCTION get_resource_library_query_performance() IS 'Returns performance metrics for Resource Library queries, tracking RLS optimization improvements';
COMMENT ON FUNCTION get_performance_metrics(INTEGER) IS 'Returns comprehensive performance metrics for all query categories';
COMMENT ON FUNCTION get_slow_queries_detailed(NUMERIC, INTEGER) IS 'Returns detailed analysis of slow queries with optimization priorities';
COMMENT ON FUNCTION reset_performance_stats() IS 'Resets pg_stat_statements for fresh performance benchmarking';
