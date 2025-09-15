-- Add missing helper functions and columns expected by app/tests

-- 1) Role helper functions that operate by explicit user_id
CREATE OR REPLACE FUNCTION public.is_client(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = is_client.user_id AND u.role = 'client'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT (u.role::text)
  FROM public.users u
  WHERE u.id = get_user_role.user_id
$$;

COMMENT ON FUNCTION public.is_client(uuid) IS 'Checks if the given user_id has role=client via public.users';
COMMENT ON FUNCTION public.get_user_role(uuid) IS 'Returns the role for the given user_id from public.users as text';

GRANT EXECUTE ON FUNCTION public.is_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- 2) Add sessions.type column with basic validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='type'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN type text NOT NULL DEFAULT 'individual';
    ALTER TABLE public.sessions ADD CONSTRAINT sessions_type_valid
      CHECK (type IN ('individual','group'));
  END IF;
END $$;

-- 3) Add mfa_sessions.verified and keep it in sync with mfa_verified
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='mfa_sessions' AND column_name='verified'
  ) THEN
    ALTER TABLE public.mfa_sessions ADD COLUMN verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_mfa_verified()
RETURNS trigger AS $$
BEGIN
  IF NEW.verified IS NOT NULL THEN
    NEW.mfa_verified := NEW.verified;
  ELSIF NEW.mfa_verified IS NOT NULL THEN
    NEW.verified := NEW.mfa_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

DROP TRIGGER IF EXISTS sync_mfa_verified_trg ON public.mfa_sessions;
CREATE TRIGGER sync_mfa_verified_trg
  BEFORE INSERT OR UPDATE ON public.mfa_sessions
  FOR EACH ROW EXECUTE FUNCTION public.sync_mfa_verified();

