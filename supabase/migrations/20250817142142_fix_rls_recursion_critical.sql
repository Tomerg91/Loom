-- CRITICAL FIX: RLS Infinite Recursion Issue
-- Execute this script to fix recursive policies that query the users table from within policies ON the users table
-- This fixes policies that query the users table from within policies ON the users table

-- IMPORTANT: This approach uses auth.jwt() which requires that user role is stored in JWT metadata
-- If role is not in JWT, you'll need to set it up in your authentication flow

-- === BACKUP NOTICE ===
-- This script will drop and recreate policies. Ensure you have backups before running.

-- === USERS TABLE FIXES ===

-- Drop the problematic recursive admin policy on users table
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create new non-recursive admin policy using auth.jwt() metadata
-- This assumes role is stored in the JWT token's metadata
CREATE POLICY "Admins can view all users" ON users
    FOR ALL USING (
        (auth.jwt() ->> 'role' = 'admin')
    );

-- === SESSIONS TABLE FIXES ===

-- Drop and recreate sessions policies that reference users table for admin checks
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches and clients can update their sessions" ON sessions;
DROP POLICY IF EXISTS "Coaches and admins can delete sessions" ON sessions;

-- Recreate sessions policies without recursive users table queries
CREATE POLICY "Users can view their own sessions" ON sessions
    FOR SELECT USING (
        auth.uid() = coach_id OR 
        auth.uid() = client_id OR
        (auth.jwt() ->> 'role' = 'admin')
    );

CREATE POLICY "Coaches and clients can update their sessions" ON sessions
    FOR UPDATE USING (
        auth.uid() = coach_id OR 
        auth.uid() = client_id OR
        (auth.jwt() ->> 'role' = 'admin')
    );

CREATE POLICY "Coaches and admins can delete sessions" ON sessions
    FOR DELETE USING (
        auth.uid() = coach_id OR
        (auth.jwt() ->> 'role' = 'admin')
    );

-- === COACH_NOTES TABLE FIXES ===

-- Drop and recreate coach_notes policies that reference users table for admin checks
DROP POLICY IF EXISTS "Coaches can view their own notes" ON coach_notes;

-- Recreate coach_notes policy without recursive users table query
CREATE POLICY "Coaches can view their own notes" ON coach_notes
    FOR SELECT USING (
        auth.uid() = coach_id OR
        (auth.jwt() ->> 'role' = 'admin')
    );

-- === REFLECTIONS TABLE FIXES ===

-- Drop and recreate reflections policies that reference users table for admin checks
DROP POLICY IF EXISTS "Clients can view their own reflections" ON reflections;

-- Recreate reflections policy without recursive users table query
CREATE POLICY "Clients can view their own reflections" ON reflections
    FOR SELECT USING (
        auth.uid() = client_id OR
        (auth.jwt() ->> 'role' = 'admin')
    );

-- === NOTIFICATIONS TABLE FIXES ===

-- Drop and recreate notifications policies that reference users table for admin checks
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Recreate notifications policy without recursive users table query
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (
        -- Only allow system/admin roles or users creating notifications for themselves
        (auth.jwt() ->> 'role' = 'admin') OR
        auth.uid() = user_id
    );

-- === COACH_AVAILABILITY TABLE FIXES ===

-- Drop and recreate coach_availability policies that reference users table for admin checks
DROP POLICY IF EXISTS "Coaches can manage their own availability" ON coach_availability;
DROP POLICY IF EXISTS "Admins can manage all availability" ON coach_availability;

-- Recreate coach_availability policies without recursive users table queries
CREATE POLICY "Coaches can manage their own availability" ON coach_availability
    FOR ALL USING (
        auth.uid() = coach_id AND
        (auth.jwt() ->> 'role' = 'coach')
    );

CREATE POLICY "Admins can manage all availability" ON coach_availability
    FOR ALL USING (
        (auth.jwt() ->> 'role' = 'admin')
    );

-- === SECURITY_AUDIT_LOG TABLE FIXES ===

-- Fix policy from security_enhancements.sql
DROP POLICY IF EXISTS "Admins can view audit logs" ON security_audit_log;

-- Recreate without recursive users table query
CREATE POLICY "Admins can view audit logs" ON security_audit_log
    FOR SELECT USING (
        (auth.jwt() ->> 'role' = 'admin')
    );

-- === MFA_ADMIN_DASHBOARD TABLE FIXES ===

-- Fix policy from mfa_implementation.sql if the table exists
-- Note: This table may not exist, so we check first
DO $$
BEGIN
    -- Only manage policy if a BASE TABLE named mfa_admin_dashboard exists
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'mfa_admin_dashboard' AND c.relkind = 'r'
    ) THEN
        EXECUTE 'DROP POLICY IF EXISTS "Admins can view MFA dashboard" ON mfa_admin_dashboard';
        EXECUTE 'CREATE POLICY "Admins can view MFA dashboard" ON mfa_admin_dashboard
            FOR SELECT USING ((auth.jwt() ->> ''role'') = ''admin'')';
    ELSE
        RAISE NOTICE 'mfa_admin_dashboard is not a base table; skipping policy creation';
    END IF;
END $$;

-- === HELPER FUNCTIONS FOR ROLE CHECKING ===
-- Create non-recursive functions for checking user roles
-- These functions use auth.jwt() instead of querying users table

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN (auth.jwt() ->> 'role' = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean AS $$
BEGIN
    RETURN (auth.jwt() ->> 'role' = 'coach');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_client()
RETURNS boolean AS $$
BEGIN
    RETURN (auth.jwt() ->> 'role' = 'client');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative approach: Create a function that gets user role from auth metadata
-- without querying the users table
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
BEGIN
    RETURN auth.jwt() ->> 'role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for future reference
COMMENT ON FUNCTION public.is_admin() IS 'Non-recursive function to check if current user is admin using JWT metadata';
COMMENT ON FUNCTION public.is_coach() IS 'Non-recursive function to check if current user is coach using JWT metadata';
COMMENT ON FUNCTION public.is_client() IS 'Non-recursive function to check if current user is client using JWT metadata';
COMMENT ON FUNCTION public.get_user_role() IS 'Gets user role from JWT metadata without querying users table';
