-- Fix custom access token hook to avoid RLS and metadata issues
-- Safely derive role from user metadata when available; gracefully fallback.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  claims jsonb := '{}'::jsonb;
  user_role text;
  user_id uuid;
BEGIN
  -- Extract user id if present
  user_id := NULLIF(event->>'user_id', '')::uuid;

  -- Start with existing claims if provided
  IF (event ? 'claims') THEN
    claims := event->'claims';
  END IF;

  -- Prefer role from user/app metadata to avoid table access and RLS
  user_role := COALESCE(
    event #>> '{user_metadata,role}',
    event #>> '{app_metadata,role}'
  );

  -- Fallback: try reading from public.users, but never fail the hook
  IF user_role IS NULL AND user_id IS NOT NULL THEN
  BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore any errors (e.g., RLS), default later
    user_role := NULL;
  END;
  END IF;

  -- Default to 'client' if role is still unknown
  claims := jsonb_set(claims, '{role}', to_jsonb(COALESCE(user_role, 'client')));

  -- Return updated event with claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Ensure the auth system can execute the hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO service_role;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS 'Access token hook: sets claims.role from user/app metadata, with safe fallback.';

