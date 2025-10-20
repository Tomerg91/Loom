-- ============================================================================
-- Harden SECURITY DEFINER function search_path
-- ============================================================================
-- Ensures every SECURITY DEFINER routine in the public schema runs with a
-- safe, deterministic search_path that prevents hijacking via attacker
-- controlled schemas. We include the extensions schema to support Supabase
-- extensions that register helper functions outside of pg_catalog/public.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = ''pg_catalog'', ''public'', ''extensions'';',
      r.schema_name,
      r.function_name,
      r.args
    );
  END LOOP;
END;
$$;

-- Re-run security definer regression tests after applying this migration to
-- confirm the new search_path configuration is enforced project-wide.
