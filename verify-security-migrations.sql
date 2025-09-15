-- Security Migration Verification Script
-- This script verifies that the security migrations (20250914000001 and 20250914000002) were applied successfully

-- ============================================================================
-- 1. MIGRATION RECORDS CHECK
-- ============================================================================
SELECT 
    'Migration Records' as check_category,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    COUNT(*) as found_migrations,
    string_agg(version, ', ' ORDER BY version) as migration_versions
FROM supabase_migrations.schema_migrations 
WHERE version IN ('20250914000001', '20250914000002');

-- ============================================================================
-- 2. RLS STATUS CHECK - Critical Tables
-- ============================================================================
SELECT 
    'RLS Status' as check_category,
    t.table_name,
    CASE 
        WHEN t.row_security = 'YES' THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM (
    SELECT 'trusted_devices' as table_name
    UNION ALL SELECT 'mfa_sessions'
    UNION ALL SELECT 'mfa_audit_log'  
    UNION ALL SELECT 'session_ratings'
) expected
LEFT JOIN information_schema.tables t ON t.table_name = expected.table_name 
    AND t.table_schema = 'public'
ORDER BY expected.table_name;

-- ============================================================================
-- 3. RLS POLICIES CHECK
-- ============================================================================
SELECT 
    'RLS Policies' as check_category,
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN cmd = 'ALL' THEN '✅ ALL OPERATIONS'
        WHEN cmd = 'SELECT' THEN '✅ SELECT ONLY'
        WHEN cmd = 'INSERT' THEN '✅ INSERT ONLY'
        WHEN cmd = 'UPDATE' THEN '✅ UPDATE ONLY'
        WHEN cmd = 'DELETE' THEN '✅ DELETE ONLY'
        ELSE cmd
    END as policy_command,
    CASE 
        WHEN policyname LIKE '%admin%' THEN '👑 ADMIN ACCESS'
        WHEN policyname LIKE '%own%' OR policyname LIKE '%their%' THEN '👤 USER ACCESS'
        ELSE '🔒 OTHER'
    END as access_type
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('trusted_devices', 'mfa_sessions', 'mfa_audit_log', 'session_ratings')
ORDER BY tablename, policyname;

-- ============================================================================
-- 4. FUNCTION SEARCH PATH SECURITY CHECK
-- ============================================================================
SELECT 
    'Function Security' as check_category,
    p.proname as function_name,
    CASE 
        WHEN pg_get_function_identity_arguments(p.oid) != '' 
        THEN p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
        ELSE p.proname || '()'
    END as full_signature,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'  
    END as security_type,
    CASE 
        WHEN array_length(proconfig, 1) > 0 THEN
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM unnest(proconfig) as config 
                    WHERE config LIKE 'search_path=%'
                ) THEN '✅ SEARCH_PATH SET'
                ELSE '❌ SEARCH_PATH MISSING'
            END
        ELSE '❌ NO CONFIG'
    END as search_path_status,
    CASE 
        WHEN array_length(proconfig, 1) > 0 THEN
            (SELECT config FROM unnest(proconfig) as config WHERE config LIKE 'search_path=%' LIMIT 1)
        ELSE NULL
    END as search_path_value
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN (
        'handle_new_user', 'validate_user_access', 'check_mfa_enforcement',
        'send_notification', 'get_unread_notification_count', 'create_session',
        'log_security_event', 'get_system_health_stats', 'db_health_check'
    )
ORDER BY p.proname;

-- ============================================================================
-- 5. CRITICAL VIEWS EXISTENCE CHECK
-- ============================================================================
SELECT 
    'Critical Views' as check_category,
    v.view_name,
    CASE 
        WHEN v.view_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status,
    CASE 
        WHEN v.is_updatable = 'YES' THEN '📝 UPDATABLE'
        ELSE '👁️ READ-ONLY'
    END as update_status
FROM (
    SELECT 'mfa_admin_dashboard' as expected_view
    UNION ALL SELECT 'coach_availability_with_timezone'
    UNION ALL SELECT 'client_progress'
    UNION ALL SELECT 'coach_statistics'
    UNION ALL SELECT 'security_dashboard'
    UNION ALL SELECT 'session_details'
) expected
LEFT JOIN information_schema.views v ON v.table_name = expected.expected_view 
    AND v.table_schema = 'public'
ORDER BY expected.expected_view;

-- ============================================================================
-- 6. VIEW PERMISSIONS CHECK
-- ============================================================================
SELECT 
    'View Permissions' as check_category,
    t.table_name,
    grantee,
    privilege_type,
    CASE 
        WHEN grantee = 'authenticated' AND privilege_type = 'SELECT' THEN '✅ CORRECT'
        WHEN grantee = 'anon' THEN '⚠️ ANONYMOUS ACCESS'
        ELSE '❓ REVIEW NEEDED'
    END as permission_status
FROM information_schema.table_privileges tp
JOIN information_schema.tables t ON t.table_name = tp.table_name
WHERE t.table_schema = 'public' 
    AND t.table_type = 'VIEW'
    AND t.table_name IN (
        'mfa_admin_dashboard', 'coach_availability_with_timezone', 
        'client_progress', 'coach_statistics', 'security_dashboard'
    )
ORDER BY t.table_name, grantee, privilege_type;

-- ============================================================================
-- 7. SECURITY DEFINER FUNCTIONS CHECK (Should be minimal)
-- ============================================================================
SELECT 
    'Security Definer Functions' as check_category,
    p.proname as function_name,
    CASE 
        WHEN p.proname = 'get_daily_notification_stats' THEN '✅ EXPECTED (Admin-only)'
        WHEN prosecdef THEN '⚠️ REVIEW NEEDED'
        ELSE '✅ SECURITY INVOKER'
    END as security_status,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as current_setting
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND prosecdef = true
ORDER BY p.proname;

-- ============================================================================
-- 8. MATERIALIZED VIEW SECURITY CHECK
-- ============================================================================
SELECT 
    'Materialized View Security' as check_category,
    schemaname,
    matviewname as view_name,
    CASE 
        WHEN matviewname = 'daily_notification_stats' THEN
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.table_privileges 
                    WHERE table_name = 'daily_notification_stats' 
                    AND grantee IN ('anon', 'authenticated') 
                    AND privilege_type = 'SELECT'
                ) THEN '❌ DIRECT ACCESS ALLOWED'
                ELSE '✅ ACCESS RESTRICTED'
            END
        ELSE '❓ UNKNOWN VIEW'
    END as access_status
FROM pg_matviews 
WHERE schemaname = 'public';

-- ============================================================================
-- 9. ADMIN FUNCTION ACCESS CHECK
-- ============================================================================
SELECT 
    'Admin Function Access' as check_category,
    p.proname as function_name,
    grantee,
    privilege_type,
    CASE 
        WHEN p.proname = 'get_daily_notification_stats' AND grantee = 'authenticated' 
        THEN '✅ CORRECT (Internal access control)'
        ELSE '❓ REVIEW'
    END as access_status
FROM information_schema.routine_privileges rp
JOIN pg_proc p ON p.proname = rp.routine_name
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
    AND p.proname = 'get_daily_notification_stats';

-- ============================================================================
-- 10. OVERALL SECURITY SUMMARY
-- ============================================================================
SELECT 
    'Security Summary' as check_category,
    'RLS Tables' as security_component,
    COUNT(CASE WHEN t.row_security = 'YES' THEN 1 END) as secured_count,
    COUNT(*) as total_count,
    CASE 
        WHEN COUNT(CASE WHEN t.row_security = 'YES' THEN 1 END) = COUNT(*) THEN '✅ ALL SECURED'
        ELSE '❌ SOME UNSECURED'
    END as status
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
    AND t.table_name IN ('trusted_devices', 'mfa_sessions', 'mfa_audit_log', 'session_ratings')

UNION ALL

SELECT 
    'Security Summary' as check_category,
    'Functions with search_path' as security_component,
    COUNT(CASE WHEN array_length(proconfig, 1) > 0 AND 
        EXISTS (SELECT 1 FROM unnest(proconfig) as config WHERE config LIKE 'search_path=%') 
        THEN 1 END) as secured_count,
    COUNT(*) as total_count,
    CASE 
        WHEN COUNT(CASE WHEN array_length(proconfig, 1) > 0 AND 
            EXISTS (SELECT 1 FROM unnest(proconfig) as config WHERE config LIKE 'search_path=%') 
            THEN 1 END) = COUNT(*) THEN '✅ ALL SECURED'
        ELSE '❌ SOME UNSECURED'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

-- End of verification script