-- Fix user signup by creating trigger to automatically create user profile
-- This trigger will create a user profile in the users table when someone signs up via auth.users

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user into users table with data from auth metadata
  INSERT INTO public.users (
    id,
    email,
    role,
    first_name,
    last_name,
    phone,
    language,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'client'),
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE((NEW.raw_user_meta_data ->> 'language')::language, 'en'),
    'active'::user_status,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;

-- Create index for better performance on auth user lookups
CREATE INDEX IF NOT EXISTS idx_users_id_email ON users(id, email);

-- Add comment for documentation
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates user profile in users table when new user signs up via auth.users';
-- Commenting on trigger requires ownership of auth.users; skip if insufficient privileges
DO $do$
BEGIN
  BEGIN
    COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger to create user profile when new auth user is created';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping trigger comment on auth.users due to insufficient privileges';
  END;
END
$do$;
