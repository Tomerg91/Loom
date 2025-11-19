-- Setup JWT Configuration for User Roles
-- This migration creates the necessary functions and triggers to include user roles in JWT tokens
-- This is required for RLS policies that use auth.jwt() ->> 'role' to work properly

-- === CUSTOM ACCESS TOKEN HOOK FUNCTION ===
-- This function will be configured as a custom access token hook in Supabase Auth
-- It adds the user's role from the users table to the JWT claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'extensions'
AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_id uuid;
BEGIN
  -- Extract user ID from the event
  user_id := (event->>'user_id')::uuid;
  
  -- Fetch the user role from the users table
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = user_id;
  
  -- Get existing claims
  claims := event->'claims';
  
  -- Add the role to claims
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  ELSE
    -- Default role if none found
    claims := jsonb_set(claims, '{role}', to_jsonb('client'));
  END IF;
  
  -- Update the event with new claims
  event := jsonb_set(event, '{claims}', claims);
  
  RETURN event;
END;
$$;

-- Grant necessary permissions for the custom access token hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO service_role;

-- Add function comment
COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS 'Adds user role from users table to JWT claims for RLS policies. Must be configured as custom access token hook in Supabase Auth settings.';

-- === USER AUTH METADATA UPDATE FUNCTION ===
-- Function to update user auth metadata with role for immediate JWT refresh
CREATE OR REPLACE FUNCTION public.update_user_auth_metadata(user_id uuid, user_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'extensions'
AS $$
BEGIN
  -- Update the auth.users raw_user_meta_data with the role
  UPDATE auth.users 
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', user_role)
  WHERE id = user_id;
END;
$$;

-- Grant permissions for metadata update function
GRANT EXECUTE ON FUNCTION public.update_user_auth_metadata(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_auth_metadata(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_auth_metadata(uuid, text) TO postgres;

-- Add function comment
COMMENT ON FUNCTION public.update_user_auth_metadata(uuid, text) IS 'Updates auth.users metadata with role for immediate JWT claim updates';

-- === ROLE CHANGE TRIGGER FUNCTION ===
-- Function to handle user role changes and sync to auth metadata
CREATE OR REPLACE FUNCTION public.handle_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'extensions'
AS $$
BEGIN
  -- Update auth metadata when role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM public.update_user_auth_metadata(NEW.id, NEW.role);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION public.handle_user_role_change() IS 'Trigger function to sync role changes to auth metadata';

-- === USER ROLE CHANGE TRIGGER ===
-- Create trigger on users table to auto-update JWT claims when roles change
DROP TRIGGER IF EXISTS trigger_user_role_change ON public.users;
CREATE TRIGGER trigger_user_role_change
  AFTER UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_role_change();

-- Add trigger comment
COMMENT ON TRIGGER trigger_user_role_change ON public.users IS 'Automatically syncs role changes to auth metadata for JWT claims';

-- === SYNC EXISTING USER ROLES ===
-- Sync all existing user roles to auth metadata
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users and sync their roles to auth metadata
  FOR user_record IN SELECT id, role FROM public.users WHERE role IS NOT NULL LOOP
    PERFORM public.update_user_auth_metadata(user_record.id, user_record.role);
  END LOOP;
  
  -- Log the sync operation
  RAISE NOTICE 'Synced roles to auth metadata for existing users';
END $$;

-- === TEST FUNCTION ===
-- Function to verify JWT role setup is working correctly
CREATE OR REPLACE FUNCTION public.test_jwt_role_setup()
RETURNS table(
  test_name text,
  status text,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'extensions'
AS $$
BEGIN
  -- Test 1: Custom Access Token Hook Function
  RETURN QUERY
  SELECT 
    'Custom Access Token Hook'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'custom_access_token_hook' 
        AND routine_schema = 'public'
      ) THEN 'PASS'::text
      ELSE 'FAIL'::text
    END,
    'Function exists and ready for configuration in Supabase Auth settings'::text;
    
  -- Test 2: Role Update Function
  RETURN QUERY
  SELECT 
    'Role Update Function'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'update_user_auth_metadata' 
        AND routine_schema = 'public'
      ) THEN 'PASS'::text
      ELSE 'FAIL'::text
    END,
    'Metadata sync function available'::text;
    
  -- Test 3: Role Change Trigger
  RETURN QUERY
  SELECT 
    'Role Change Trigger'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_user_role_change'
      ) THEN 'PASS'::text
      ELSE 'FAIL'::text
    END,
    'Auto-sync trigger configured'::text;

  -- Test 4: Users Table Exists
  RETURN QUERY
  SELECT 
    'Users Table'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
      ) THEN 'PASS'::text
      ELSE 'FAIL'::text
    END,
    'Users table exists for role lookups'::text;

  -- Test 5: Role Column Exists
  RETURN QUERY
  SELECT 
    'Role Column'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
        AND table_schema = 'public'
      ) THEN 'PASS'::text
      ELSE 'FAIL'::text
    END,
    'Role column exists in users table'::text;
END;
$$;

-- Add test function comment
COMMENT ON FUNCTION public.test_jwt_role_setup() IS 'Tests JWT role configuration setup and returns status of all components';

-- === MANUAL ROLE SYNC HELPER FUNCTION ===
-- Function to manually sync a user's role to auth metadata (for troubleshooting)
CREATE OR REPLACE FUNCTION public.sync_user_role_to_jwt(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'extensions'
AS $$
DECLARE
  user_role text;
  user_exists boolean := false;
BEGIN
  -- Check if user exists and get their role
  SELECT role, true INTO user_role, user_exists
  FROM public.users 
  WHERE id = target_user_id;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User with ID % not found', target_user_id;
  END IF;
  
  -- Update auth metadata with role
  PERFORM public.update_user_auth_metadata(target_user_id, COALESCE(user_role, 'client'));
  
  RETURN true;
END;
$$;

-- Grant permissions for manual sync function
GRANT EXECUTE ON FUNCTION public.sync_user_role_to_jwt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_role_to_jwt(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_user_role_to_jwt(uuid) TO postgres;

-- Add manual sync function comment
COMMENT ON FUNCTION public.sync_user_role_to_jwt(uuid) IS 'Manually syncs a specific user role to auth metadata for JWT claims';