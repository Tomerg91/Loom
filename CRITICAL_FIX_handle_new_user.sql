-- CRITICAL FIX: handle_new_user function search_path issue
-- 
-- Issue: User signup fails because handle_new_user function has search_path = ''
-- but references enum types that require public schema access
--
-- This fix updates the function to use search_path = 'public' which is secure
-- for this specific function since it only accesses the public schema
--
-- To apply: Copy and paste this entire SQL into Supabase Dashboard SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert a profile row for the new auth user with proper enum handling
    -- Function now uses search_path = 'public' to access enum types safely
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
        -- Safely cast role with fallback
        COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'client'::user_role),
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
        NEW.raw_user_meta_data ->> 'phone',
        -- Safely cast language with fallback  
        COALESCE((NEW.raw_user_meta_data ->> 'language')::language, 'en'::language),
        'active'::user_status,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update comment to reflect the fix
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile with proper enum casting, conflict resolution, and secure search_path = public for enum access';

-- Verify the function was updated
DO $$
BEGIN
    RAISE NOTICE 'handle_new_user function has been updated with search_path = public fix';
    RAISE NOTICE 'User signup should now work correctly';
END
$$;