-- Remediation for security advisor findings

-- 1) Make views run as invoker so underlying RLS applies
DO $$
DECLARE v text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'client_progress',
    'mfa_admin_dashboard',
    'coach_statistics',
    'security_dashboard',
    'coach_stats',
    'mfa_statistics',
    'session_details',
    'coach_availability_with_timezone',
    'database_schema_summary',
    'client_progress_summary'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true);', v);
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'View % not found, skipping', v;
    END;
  END LOOP;
END $$;

-- 2) Enable RLS and add policies on flagged tables

-- trusted_devices
DO $$
BEGIN
  BEGIN EXECUTE 'ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN undefined_table THEN RETURN; END;
  EXECUTE 'DROP POLICY IF EXISTS trusted_devices_select ON public.trusted_devices';
  EXECUTE 'DROP POLICY IF EXISTS trusted_devices_insert ON public.trusted_devices';
  EXECUTE 'DROP POLICY IF EXISTS trusted_devices_update ON public.trusted_devices';
  EXECUTE 'DROP POLICY IF EXISTS trusted_devices_delete ON public.trusted_devices';
  EXECUTE 'CREATE POLICY trusted_devices_select ON public.trusted_devices FOR SELECT USING (user_id = auth.uid())';
  EXECUTE 'CREATE POLICY trusted_devices_insert ON public.trusted_devices FOR INSERT WITH CHECK (user_id = auth.uid())';
  EXECUTE 'CREATE POLICY trusted_devices_update ON public.trusted_devices FOR UPDATE USING (user_id = auth.uid())';
  EXECUTE 'CREATE POLICY trusted_devices_delete ON public.trusted_devices FOR DELETE USING (user_id = auth.uid())';
END $$;

-- mfa_sessions
DO $$
BEGIN
  BEGIN EXECUTE 'ALTER TABLE public.mfa_sessions ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN undefined_table THEN RETURN; END;
  EXECUTE 'DROP POLICY IF EXISTS mfa_sessions_select ON public.mfa_sessions';
  EXECUTE 'DROP POLICY IF EXISTS mfa_sessions_insert ON public.mfa_sessions';
  EXECUTE 'DROP POLICY IF EXISTS mfa_sessions_update ON public.mfa_sessions';
  EXECUTE 'DROP POLICY IF EXISTS mfa_sessions_delete ON public.mfa_sessions';
  EXECUTE 'CREATE POLICY mfa_sessions_select ON public.mfa_sessions FOR SELECT USING (user_id = auth.uid())';
  EXECUTE 'CREATE POLICY mfa_sessions_insert ON public.mfa_sessions FOR INSERT WITH CHECK (user_id = auth.uid())';
  EXECUTE 'CREATE POLICY mfa_sessions_update ON public.mfa_sessions FOR UPDATE USING (user_id = auth.uid())';
  EXECUTE 'CREATE POLICY mfa_sessions_delete ON public.mfa_sessions FOR DELETE USING (user_id = auth.uid())';
END $$;

-- mfa_audit_log (assumes user_id column)
DO $$
BEGIN
  BEGIN EXECUTE 'ALTER TABLE public.mfa_audit_log ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN undefined_table THEN RETURN; END;
  EXECUTE 'DROP POLICY IF EXISTS mfa_audit_log_select ON public.mfa_audit_log';
  EXECUTE 'CREATE POLICY mfa_audit_log_select ON public.mfa_audit_log FOR SELECT USING (user_id = auth.uid())';
END $$;

-- session_ratings
DO $$
BEGIN
  BEGIN EXECUTE 'ALTER TABLE public.session_ratings ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN undefined_table THEN RETURN; END;
  EXECUTE 'DROP POLICY IF EXISTS session_ratings_select ON public.session_ratings';
  EXECUTE 'DROP POLICY IF EXISTS session_ratings_insert ON public.session_ratings';
  EXECUTE 'DROP POLICY IF EXISTS session_ratings_update ON public.session_ratings';
  EXECUTE 'DROP POLICY IF EXISTS session_ratings_delete ON public.session_ratings';
  EXECUTE 'CREATE POLICY session_ratings_select ON public.session_ratings FOR SELECT USING (client_id = auth.uid() OR coach_id = auth.uid())';
  EXECUTE 'CREATE POLICY session_ratings_insert ON public.session_ratings FOR INSERT WITH CHECK (client_id = auth.uid())';
  EXECUTE 'CREATE POLICY session_ratings_update ON public.session_ratings FOR UPDATE USING (client_id = auth.uid())';
  EXECUTE 'CREATE POLICY session_ratings_delete ON public.session_ratings FOR DELETE USING (client_id = auth.uid())';
END $$;

