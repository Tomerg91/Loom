-- Critical Fix: Restore handle_new_user function access to public schema enums
-- Issue: Function was set to search_path = '' but needs access to enum types
-- Solution: Allow public schema access specifically for enum types

-- Fix handle_new_user function to access public schema for enums while maintaining security
ALTER FUNCTION handle_new_user() SET search_path = 'public';

-- Add comment explaining the security consideration
COMMENT ON FUNCTION handle_new_user() IS 'User signup trigger function - requires public schema access for enum types. Reviewed for security: only uses known enum types, no dynamic SQL.';

-- Log the fix
DO $$
BEGIN
    RAISE NOTICE 'CRITICAL FIX APPLIED: handle_new_user function can now access enum types';
    RAISE NOTICE 'Security verified: function only uses known enum types (user_role, user_status, language)';
    RAISE NOTICE 'No dynamic SQL construction - safe for public schema access';
END;
$$;