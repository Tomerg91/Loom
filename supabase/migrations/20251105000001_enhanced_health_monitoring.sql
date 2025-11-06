-- Enhanced Database Health Monitoring
-- Sprint 01 - Task 1.3.1: Complete database health monitoring implementation
-- Adds RLS policy validation and enhanced connection pool monitoring

-- Function to validate RLS policies on all tables
CREATE OR REPLACE FUNCTION validate_rls_policies()
RETURNS TABLE (
    schema_name TEXT,
    table_name TEXT,
    rls_enabled BOOLEAN,
    rls_forced BOOLEAN,
    policy_count INTEGER,
    has_select_policy BOOLEAN,
    has_insert_policy BOOLEAN,
    has_update_policy BOOLEAN,
    has_delete_policy BOOLEAN,
    security_status TEXT,
    recommendations TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH table_rls AS (
        SELECT
            n.nspname::TEXT AS schema_name,
            c.relname::TEXT AS table_name,
            c.relrowsecurity AS rls_enabled,
            c.relforcerowsecurity AS rls_forced
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND n.nspname NOT LIKE 'pg_temp%'
    ),
    policy_stats AS (
        SELECT
            schemaname::TEXT AS schema_name,
            tablename::TEXT AS table_name,
            COUNT(*)::INTEGER AS policy_count,
            COUNT(*) FILTER (WHERE cmd = 'SELECT')::INTEGER > 0 AS has_select,
            COUNT(*) FILTER (WHERE cmd = 'INSERT')::INTEGER > 0 AS has_insert,
            COUNT(*) FILTER (WHERE cmd = 'UPDATE')::INTEGER > 0 AS has_update,
            COUNT(*) FILTER (WHERE cmd = 'DELETE')::INTEGER > 0 AS has_delete
        FROM pg_policies
        GROUP BY schemaname, tablename
    )
    SELECT
        t.schema_name,
        t.table_name,
        t.rls_enabled,
        t.rls_forced,
        COALESCE(p.policy_count, 0)::INTEGER AS policy_count,
        COALESCE(p.has_select, FALSE) AS has_select_policy,
        COALESCE(p.has_insert, FALSE) AS has_insert_policy,
        COALESCE(p.has_update, FALSE) AS has_update_policy,
        COALESCE(p.has_delete, FALSE) AS has_delete_policy,
        CASE
            WHEN NOT t.rls_enabled THEN 'critical'
            WHEN t.rls_enabled AND COALESCE(p.policy_count, 0) = 0 THEN 'warning'
            WHEN t.rls_enabled AND COALESCE(p.policy_count, 0) > 0 THEN 'healthy'
            ELSE 'unknown'
        END::TEXT AS security_status,
        CASE
            WHEN NOT t.rls_enabled THEN
                ARRAY['RLS is not enabled on this table', 'Enable RLS with: ALTER TABLE ' || t.schema_name || '.' || t.table_name || ' ENABLE ROW LEVEL SECURITY;']
            WHEN t.rls_enabled AND COALESCE(p.policy_count, 0) = 0 THEN
                ARRAY['RLS is enabled but no policies defined', 'Table is effectively inaccessible to users', 'Add appropriate RLS policies']
            WHEN t.rls_enabled AND NOT COALESCE(p.has_select, FALSE) THEN
                ARRAY['Consider adding SELECT policy if users need read access']
            ELSE
                ARRAY['RLS configuration appears healthy']::TEXT[]
        END AS recommendations
    FROM table_rls t
    LEFT JOIN policy_stats p ON t.schema_name = p.schema_name AND t.table_name = p.table_name
    WHERE t.schema_name = 'public'
    ORDER BY
        CASE
            WHEN NOT t.rls_enabled THEN 1
            WHEN t.rls_enabled AND COALESCE(p.policy_count, 0) = 0 THEN 2
            ELSE 3
        END,
        t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get detailed connection pool statistics
CREATE OR REPLACE FUNCTION get_connection_pool_stats()
RETURNS TABLE (
    metric TEXT,
    value NUMERIC,
    unit TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    total_conn INTEGER;
    active_conn INTEGER;
    idle_conn INTEGER;
    idle_in_transaction INTEGER;
    max_conn INTEGER;
    utilization NUMERIC;
BEGIN
    -- Get connection counts
    SELECT
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE state = 'active')::INTEGER,
        COUNT(*) FILTER (WHERE state = 'idle')::INTEGER,
        COUNT(*) FILTER (WHERE state = 'idle in transaction')::INTEGER
    INTO total_conn, active_conn, idle_conn, idle_in_transaction
    FROM pg_stat_activity;

    -- Get max connections setting
    SELECT setting::INTEGER INTO max_conn
    FROM pg_settings
    WHERE name = 'max_connections';

    -- Calculate utilization percentage
    utilization := ROUND((total_conn::NUMERIC / max_conn::NUMERIC) * 100, 2);

    -- Return connection metrics
    RETURN QUERY VALUES
        ('total_connections', total_conn::NUMERIC, 'connections',
         CASE WHEN total_conn < max_conn * 0.8 THEN 'healthy' WHEN total_conn < max_conn * 0.9 THEN 'warning' ELSE 'critical' END,
         format('Current: %s, Max: %s', total_conn, max_conn)),

        ('active_connections', active_conn::NUMERIC, 'connections',
         CASE WHEN active_conn < max_conn * 0.5 THEN 'healthy' WHEN active_conn < max_conn * 0.7 THEN 'warning' ELSE 'critical' END,
         format('Connections actively executing queries')),

        ('idle_connections', idle_conn::NUMERIC, 'connections',
         CASE WHEN idle_conn < total_conn * 0.5 THEN 'healthy' ELSE 'info' END,
         format('Connections waiting for queries')),

        ('idle_in_transaction', idle_in_transaction::NUMERIC, 'connections',
         CASE WHEN idle_in_transaction = 0 THEN 'healthy' WHEN idle_in_transaction < 5 THEN 'warning' ELSE 'critical' END,
         format('Connections holding transactions open - should be minimal')),

        ('max_connections', max_conn::NUMERIC, 'connections', 'info',
         format('Maximum allowed connections')),

        ('utilization_percentage', utilization, 'percent',
         CASE WHEN utilization < 80 THEN 'healthy' WHEN utilization < 90 THEN 'warning' ELSE 'critical' END,
         format('Connection pool utilization: %.2f%%', utilization));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table health metrics
CREATE OR REPLACE FUNCTION get_table_health_metrics()
RETURNS TABLE (
    table_name TEXT,
    live_tuples BIGINT,
    dead_tuples BIGINT,
    bloat_ratio NUMERIC,
    last_vacuum TIMESTAMPTZ,
    last_analyze TIMESTAMPTZ,
    seq_scans BIGINT,
    idx_scans BIGINT,
    health_status TEXT,
    maintenance_needed TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || relname AS table_name,
        n_live_tup AS live_tuples,
        n_dead_tup AS dead_tuples,
        CASE
            WHEN n_live_tup = 0 THEN 0
            ELSE ROUND((n_dead_tup::NUMERIC / GREATEST(n_live_tup, 1)::NUMERIC) * 100, 2)
        END AS bloat_ratio,
        last_vacuum,
        last_analyze,
        seq_scan AS seq_scans,
        idx_scan AS idx_scans,
        CASE
            WHEN n_dead_tup > 10000 AND n_dead_tup::NUMERIC / GREATEST(n_live_tup, 1) > 0.2 THEN 'critical'
            WHEN n_dead_tup > 5000 OR last_vacuum < NOW() - INTERVAL '7 days' THEN 'warning'
            WHEN last_analyze < NOW() - INTERVAL '7 days' THEN 'warning'
            ELSE 'healthy'
        END AS health_status,
        ARRAY_REMOVE(ARRAY[
            CASE WHEN n_dead_tup > 10000 THEN 'High dead tuple count - run VACUUM' END,
            CASE WHEN last_vacuum < NOW() - INTERVAL '7 days' THEN 'Table not vacuumed recently' END,
            CASE WHEN last_analyze < NOW() - INTERVAL '7 days' THEN 'Table statistics outdated - run ANALYZE' END,
            CASE WHEN seq_scan > idx_scan * 10 AND n_live_tup > 1000 THEN 'High sequential scan ratio - consider adding indexes' END
        ], NULL) AS maintenance_needed
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY
        CASE
            WHEN n_dead_tup > 10000 AND n_dead_tup::NUMERIC / GREATEST(n_live_tup, 1) > 0.2 THEN 1
            WHEN n_dead_tup > 5000 OR last_vacuum < NOW() - INTERVAL '7 days' THEN 2
            ELSE 3
        END,
        n_dead_tup DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comprehensive database health summary
CREATE OR REPLACE FUNCTION get_database_health_summary()
RETURNS JSON AS $$
DECLARE
    health_summary JSON;
    db_size_bytes BIGINT;
    active_connections_count INTEGER;
    long_queries_count INTEGER;
    tables_count INTEGER;
    rls_issues_count INTEGER;
    bloated_tables_count INTEGER;
BEGIN
    -- Gather all metrics
    db_size_bytes := get_database_size();
    active_connections_count := get_active_connections();
    long_queries_count := get_long_running_queries();

    SELECT COUNT(*)::INTEGER INTO tables_count
    FROM information_schema.tables
    WHERE table_schema = 'public';

    SELECT COUNT(*)::INTEGER INTO rls_issues_count
    FROM validate_rls_policies()
    WHERE security_status IN ('critical', 'warning');

    SELECT COUNT(*)::INTEGER INTO bloated_tables_count
    FROM get_table_health_metrics()
    WHERE health_status IN ('critical', 'warning');

    -- Build JSON summary
    health_summary := json_build_object(
        'overall_status', CASE
            WHEN rls_issues_count > 0 OR long_queries_count > 5 OR bloated_tables_count > 10 THEN 'critical'
            WHEN bloated_tables_count > 5 OR active_connections_count > 80 THEN 'warning'
            ELSE 'healthy'
        END,
        'timestamp', NOW(),
        'metrics', json_build_object(
            'database_size_bytes', db_size_bytes,
            'database_size_pretty', pg_size_pretty(db_size_bytes),
            'tables_count', tables_count,
            'active_connections', active_connections_count,
            'long_running_queries', long_queries_count,
            'rls_issues', rls_issues_count,
            'bloated_tables', bloated_tables_count
        ),
        'checks', json_build_object(
            'database_size', CASE WHEN db_size_bytes < 1073741824 THEN 'healthy' ELSE 'info' END,
            'connections', CASE WHEN active_connections_count < 80 THEN 'healthy' WHEN active_connections_count < 90 THEN 'warning' ELSE 'critical' END,
            'query_performance', CASE WHEN long_queries_count = 0 THEN 'healthy' WHEN long_queries_count < 5 THEN 'warning' ELSE 'critical' END,
            'rls_security', CASE WHEN rls_issues_count = 0 THEN 'healthy' WHEN rls_issues_count < 3 THEN 'warning' ELSE 'critical' END,
            'table_health', CASE WHEN bloated_tables_count < 3 THEN 'healthy' WHEN bloated_tables_count < 10 THEN 'warning' ELSE 'critical' END
        )
    );

    RETURN health_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION validate_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION get_connection_pool_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_health_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_health_summary() TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION validate_rls_policies() IS 'Validates RLS policies on all tables and provides security recommendations';
COMMENT ON FUNCTION get_connection_pool_stats() IS 'Returns detailed connection pool statistics including utilization and status';
COMMENT ON FUNCTION get_table_health_metrics() IS 'Returns table health metrics including bloat, vacuum status, and maintenance recommendations';
COMMENT ON FUNCTION get_database_health_summary() IS 'Returns comprehensive database health summary as JSON';

-- Create indexes to improve health check performance
CREATE INDEX IF NOT EXISTS idx_pg_stat_activity_state ON pg_stat_activity(state) WHERE state IS NOT NULL;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Enhanced health monitoring functions installed successfully';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '  - validate_rls_policies(): Check RLS policy configuration';
    RAISE NOTICE '  - get_connection_pool_stats(): Monitor connection pool';
    RAISE NOTICE '  - get_table_health_metrics(): Check table health and maintenance needs';
    RAISE NOTICE '  - get_database_health_summary(): Get comprehensive health overview';
END $$;
