-- Verification queries to test that RLS recursion fix worked
-- Run these to verify the fix was successful

-- 1. Check that policies are now non-recursive
SELECT schemaname, tablename, policyname, definition 
FROM pg_policies 
WHERE definition LIKE '%auth.jwt()%'
ORDER BY tablename, policyname;

-- 2. Test basic users table access (should not cause infinite recursion)
-- This query should complete without hanging
SELECT COUNT(*) as total_users FROM users;

-- 3. Test that new helper functions exist and work
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname IN ('is_admin', 'is_coach', 'is_client', 'get_user_role');

-- 4. Verify specific policies that were fixed
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'sessions', 'coach_notes', 'reflections', 'notifications', 'coach_availability', 'security_audit_log')
ORDER BY tablename, policyname;