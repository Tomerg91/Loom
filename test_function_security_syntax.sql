-- Test script to validate function security migration syntax
-- This tests a subset of the functions to ensure our ALTER statements are correct

-- Test basic utility functions
\echo 'Testing basic utility functions...'
SELECT 'update_updated_at_column' as function_name, 
       prosecdef as security_definer,
       proconfig as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'update_updated_at_column';

-- Test MFA functions
\echo 'Testing MFA functions...'
SELECT p.proname as function_name,
       array_to_string(p.proargtypes::regtype[], ',') as arg_types,
       prosecdef as security_definer,
       proconfig as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname LIKE '%mfa%'
ORDER BY p.proname;

-- Test notification functions
\echo 'Testing notification functions...'
SELECT p.proname as function_name,
       array_to_string(p.proargtypes::regtype[], ',') as arg_types,
       prosecdef as security_definer,
       proconfig as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname LIKE '%notification%'
ORDER BY p.proname;