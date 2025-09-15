-- Targeted fixes: signup trigger and stats function search_path
-- Context: Production signup failures due to handle_new_user enum casting under restricted search_path.
--         Also fix get_database_statistics failure by allowing safe pg_catalog access.

-- 1) Critical: robust handle_new_user with secure search_path and enum casting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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
        COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client'::public.user_role),
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
        NEW.raw_user_meta_data ->> 'phone',
        COALESCE((NEW.raw_user_meta_data ->> 'language')::public.language, 'en'::public.language),
        'active'::public.user_status,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile on auth signup with safe enum casts and search_path=public';

-- Ensure trigger exists and uses this function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Non-blocking: allow stats function to access pg_stat_* tables safely
DO $$
BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'get_database_statistics';
  IF FOUND THEN
    -- Safe, minimal search_path for system catalogs and public
    EXECUTE 'ALTER FUNCTION public.get_database_statistics() SET search_path = ''pg_catalog, public''';
  END IF;
END $$;
