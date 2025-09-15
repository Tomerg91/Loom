-- Harden handle_new_user to never block auth inserts; add exception-safe fallback
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  BEGIN
    INSERT INTO public.users (
      id, email, role, first_name, last_name, phone, language, status, created_at, updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client'::public.user_role),
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
      NEW.raw_user_meta_data ->> 'phone',
      COALESCE((NEW.raw_user_meta_data ->> 'language')::public.language, 'en'::public.language),
      'active'::public.user_status,
      NOW(), NOW()
    ) ON CONFLICT (email) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.users (
        id, email, role, language, status, created_at, updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        'client'::public.user_role,
        'en'::public.language,
        'active'::public.user_status,
        NOW(), NOW()
      ) ON CONFLICT (email) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

