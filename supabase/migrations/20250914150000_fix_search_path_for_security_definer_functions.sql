-- Set a fixed search_path for all SECURITY DEFINER functions in public that lack it
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.prosecdef = true
      AND (p.proconfig IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'))
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = ''pg_catalog, public'';', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

