-- Fix handle_new_user function search_path issue
-- Migration: 2025-09-14T13-31-58-121Z


        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger AS $$
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
                NOW(),
                NOW()
            )
            ON CONFLICT (email) DO NOTHING;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
      

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile with proper enum casting, conflict resolution, and secure search_path setting';
