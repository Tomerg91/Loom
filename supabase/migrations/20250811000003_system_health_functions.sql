-- Additional database functions for system health and maintenance operations
-- This migration adds helper functions that support the maintenance system

-- Function to check database connection (simple version)
CREATE OR REPLACE FUNCTION check_connection()
RETURNS TEXT AS $$
BEGIN
    -- Simple connection test
    RETURN 'connected';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active connections count (approximation)
CREATE OR REPLACE FUNCTION get_active_connections()
RETURNS INTEGER AS $$
DECLARE
    connection_count INTEGER;
BEGIN
    -- Get approximate connection count from pg_stat_activity
    SELECT count(*)
    INTO connection_count
    FROM pg_stat_activity
    WHERE state = 'active';
    
    RETURN COALESCE(connection_count, 0);
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get database size
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS BIGINT AS $$
DECLARE
    db_size BIGINT;
BEGIN
    SELECT pg_database_size(current_database())
    INTO db_size;
    
    RETURN COALESCE(db_size, 0);
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get long running queries count
CREATE OR REPLACE FUNCTION get_long_running_queries()
RETURNS INTEGER AS $$
DECLARE
    long_queries INTEGER;
BEGIN
    -- Count queries running longer than 30 seconds
    SELECT count(*)
    INTO long_queries
    FROM pg_stat_activity
    WHERE state = 'active'
    AND query_start < now() - interval '30 seconds'
    AND query NOT LIKE '%pg_stat_activity%';
    
    RETURN COALESCE(long_queries, 0);
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table sizes for monitoring
CREATE OR REPLACE FUNCTION get_table_sizes(
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    table_name TEXT,
    size_bytes BIGINT,
    size_pretty TEXT,
    row_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename AS table_name,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size_pretty,
        COALESCE(n_tup_ins + n_tup_upd + n_tup_del, 0) AS row_count
    FROM pg_tables pt
    LEFT JOIN pg_stat_user_tables psut ON pt.tablename = psut.relname AND pt.schemaname = psut.schemaname
    WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get system statistics
CREATE OR REPLACE FUNCTION get_system_statistics()
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    metric_unit TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    VALUES 
        ('database_size', get_database_size()::NUMERIC, 'bytes', 'Total database size'),
        ('active_connections', get_active_connections()::NUMERIC, 'count', 'Number of active connections'),
        ('long_queries', get_long_running_queries()::NUMERIC, 'count', 'Long running queries (>30s)'),
        ('tables_count', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public')::NUMERIC, 'count', 'Number of tables'),
        ('uptime_seconds', EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time()))::NUMERIC, 'seconds', 'Database uptime');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION get_slow_queries(
    p_min_duration INTERVAL DEFAULT '1 second',
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    query_text TEXT,
    calls BIGINT,
    total_time NUMERIC,
    mean_time NUMERIC,
    rows_returned BIGINT
) AS $$
BEGIN
    -- This function requires pg_stat_statements extension
    -- Return empty result if extension is not available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RETURN QUERY
        SELECT 
            pss.query,
            pss.calls,
            pss.total_exec_time,
            pss.mean_exec_time,
            pss.rows
        FROM pg_stat_statements pss
        WHERE pss.mean_exec_time > EXTRACT(EPOCH FROM p_min_duration) * 1000
        ORDER BY pss.mean_exec_time DESC
        LIMIT p_limit;
    ELSE
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old data (for maintenance operations)
CREATE OR REPLACE FUNCTION maintenance_cleanup_old_data(
    p_table_name TEXT,
    p_date_column TEXT,
    p_days_old INTEGER,
    p_batch_size INTEGER DEFAULT 1000,
    p_dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE (
    batch_number INTEGER,
    records_processed INTEGER,
    records_deleted INTEGER,
    batch_completed_at TIMESTAMPTZ
) AS $$
DECLARE
    batch_count INTEGER := 0;
    deleted_count INTEGER;
    sql_command TEXT;
    total_processed INTEGER := 0;
BEGIN
    -- Validate inputs
    IF p_table_name IS NULL OR p_date_column IS NULL OR p_days_old < 1 THEN
        RAISE EXCEPTION 'Invalid parameters for cleanup operation';
    END IF;

    -- Build the DELETE command
    sql_command := format('DELETE FROM %I WHERE %I < NOW() - INTERVAL ''%s days''',
                         p_table_name, p_date_column, p_days_old);

    IF p_dry_run THEN
        -- Dry run: count records that would be deleted
        sql_command := format('SELECT COUNT(*) FROM %I WHERE %I < NOW() - INTERVAL ''%s days''',
                             p_table_name, p_date_column, p_days_old);
        EXECUTE sql_command INTO deleted_count;
        
        RETURN QUERY VALUES (0, deleted_count, 0, NOW());
    ELSE
        -- Actual cleanup in batches
        LOOP
            batch_count := batch_count + 1;
            
            -- Delete batch
            sql_command := format('WITH deleted AS (DELETE FROM %I WHERE %I < NOW() - INTERVAL ''%s days'' LIMIT %s RETURNING *) SELECT COUNT(*) FROM deleted',
                                 p_table_name, p_date_column, p_days_old, p_batch_size);
            
            EXECUTE sql_command INTO deleted_count;
            total_processed := total_processed + deleted_count;
            
            RETURN QUERY VALUES (batch_count, deleted_count, total_processed, NOW());
            
            -- Exit if no more records to delete
            EXIT WHEN deleted_count = 0;
            
            -- Small delay between batches to avoid overwhelming the database
            PERFORM pg_sleep(0.1);
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to optimize database tables
CREATE OR REPLACE FUNCTION maintenance_optimize_tables(
    p_analyze_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
    table_name TEXT,
    operation TEXT,
    status TEXT,
    duration_ms INTEGER,
    details TEXT
) AS $$
DECLARE
    table_record RECORD;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    duration INTEGER;
    operation_type TEXT;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        start_time := clock_timestamp();
        
        BEGIN
            IF p_analyze_only THEN
                operation_type := 'ANALYZE';
                EXECUTE format('ANALYZE %I.%I', table_record.schemaname, table_record.tablename);
            ELSE
                operation_type := 'VACUUM ANALYZE';
                EXECUTE format('VACUUM ANALYZE %I.%I', table_record.schemaname, table_record.tablename);
            END IF;
            
            end_time := clock_timestamp();
            duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
            
            RETURN QUERY VALUES (
                format('%s.%s', table_record.schemaname, table_record.tablename),
                operation_type,
                'completed',
                duration::INTEGER,
                format('Processed table successfully in %s ms', duration)
            );
            
        EXCEPTION
            WHEN OTHERS THEN
                end_time := clock_timestamp();
                duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
                
                RETURN QUERY VALUES (
                    format('%s.%s', table_record.schemaname, table_record.tablename),
                    operation_type,
                    'failed',
                    duration::INTEGER,
                    format('Error: %s', SQLERRM)
                );
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get index statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT,
    usage_ratio NUMERIC,
    is_unique BOOLEAN,
    index_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        psi.schemaname::TEXT,
        psi.relname::TEXT AS tablename,
        psi.indexrelname::TEXT AS indexname,
        psi.idx_tup_read,
        psi.idx_tup_fetch,
        CASE 
            WHEN psi.idx_tup_read = 0 THEN 0
            ELSE ROUND((psi.idx_tup_fetch::NUMERIC / psi.idx_tup_read::NUMERIC) * 100, 2)
        END AS usage_ratio,
        pi.indisunique AS is_unique,
        pg_size_pretty(pg_relation_size(psi.indexrelid))::TEXT AS index_size
    FROM pg_stat_user_indexes psi
    JOIN pg_index pi ON psi.indexrelid = pi.indexrelid
    WHERE psi.schemaname = 'public'
    ORDER BY psi.idx_tup_read DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_connection() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_size() TO authenticated;
GRANT EXECUTE ON FUNCTION get_long_running_queries() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_sizes(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries(INTERVAL, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION maintenance_cleanup_old_data(TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION maintenance_optimize_tables(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_index_usage_stats() TO authenticated;

-- Comments
COMMENT ON FUNCTION check_connection() IS 'Simple database connection test';
COMMENT ON FUNCTION get_active_connections() IS 'Returns count of active database connections';
COMMENT ON FUNCTION get_database_size() IS 'Returns total database size in bytes';
COMMENT ON FUNCTION get_long_running_queries() IS 'Returns count of queries running longer than 30 seconds';
COMMENT ON FUNCTION get_table_sizes(INTEGER) IS 'Returns table sizes ordered by size descending';
COMMENT ON FUNCTION get_system_statistics() IS 'Returns comprehensive system statistics';
COMMENT ON FUNCTION get_slow_queries(INTERVAL, INTEGER) IS 'Returns slow queries from pg_stat_statements if available';
COMMENT ON FUNCTION maintenance_cleanup_old_data(TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) IS 'Cleanup old data in batches with dry-run support';
COMMENT ON FUNCTION maintenance_optimize_tables(BOOLEAN) IS 'Optimize database tables with VACUUM/ANALYZE';
COMMENT ON FUNCTION get_index_usage_stats() IS 'Returns index usage statistics for performance monitoring';