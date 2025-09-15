-- Fix handle_new_user function to work with empty search_path
-- The function needs to explicitly reference the public schema for custom types

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert a profile row for the new auth user with proper enum handling
    -- All types must be fully qualified when search_path is empty
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
        -- Explicitly reference public schema for enum types
        COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client'::public.user_role),
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
        NEW.raw_user_meta_data ->> 'phone',
        -- Explicitly reference public schema for language enum
        COALESCE((NEW.raw_user_meta_data ->> 'language')::public.language, 'en'::public.language),
        'active'::public.user_status,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update the comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile with proper enum casting, conflict resolution, and secure search_path setting';

-- Verify the function works by doing a test (this will be commented out for safety)
-- DO $$
-- DECLARE
--     test_result BOOLEAN := TRUE;
-- BEGIN
--     -- This is just to check if the function definition is valid
--     RAISE NOTICE 'handle_new_user function updated successfully with secure search_path';
-- END
-- $$;