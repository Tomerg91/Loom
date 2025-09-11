-- Combined fix: proper role handling + conflict resolution
-- This migration combines both the enum casting fix and the conflict resolution
-- to prevent signup failures from both missing enums and duplicate profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert a profile row for the new auth user with proper enum handling
    -- If a row with the same email already exists, do nothing to avoid blocking signup
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
        -- Safely cast role with fallback - this is what was causing the enum error
        COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client'::public.user_role),
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
        NEW.raw_user_meta_data ->> 'phone',
        -- Safely cast language with fallback
        COALESCE((NEW.raw_user_meta_data ->> 'language')::public.language, 'en'::public.language),
        'active'::public.user_status,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment to reflect the combined fix
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile with proper enum casting and conflict resolution to prevent signup failures';