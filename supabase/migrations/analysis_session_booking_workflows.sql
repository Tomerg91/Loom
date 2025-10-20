--
-- Migration: 20251020000020_session_booking_workflows.sql
-- Description: Introduces session_requests workflow tables and supporting
--              indexes to back the scheduling APIs implemented in Phase 3.
--

-- Ensure the custom type for request statuses exists before creating the table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'session_request_status'
  ) THEN
    EXECUTE $$
      CREATE TYPE public.session_request_status AS ENUM (
        'pending',
        'approved',
        'declined'
      )
    $$;
  END IF;
END$$;

-- Create the session_requests table when it does not yet exist.
CREATE TABLE IF NOT EXISTS public.session_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
  status public.session_request_status NOT NULL DEFAULT 'pending',
  title TEXT,
  timezone TEXT,
  meeting_url TEXT,
  notes TEXT,
  reschedule_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.session_requests IS
  'Captures coach/client scheduling requests before a session is approved.';
COMMENT ON COLUMN public.session_requests.session_id IS
  'Populated once a request is approved and a session record exists.';
COMMENT ON COLUMN public.session_requests.requested_by IS
  'User that initiated the scheduling request.';
COMMENT ON COLUMN public.session_requests.status IS
  'Represents whether the request is pending, approved, or declined.';

-- Maintain updated_at values automatically for auditing.
CREATE OR REPLACE FUNCTION public.touch_session_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_requests_set_updated_at
  BEFORE UPDATE ON public.session_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_session_requests_updated_at();

-- Helpful indexes for dashboard and API filters.
CREATE INDEX IF NOT EXISTS idx_session_requests_coach_status
  ON public.session_requests (coach_id, status, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_requests_client_status
  ON public.session_requests (client_id, status, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_requests_requested_by
  ON public.session_requests (requested_by, requested_at DESC);

-- Enable row level security and add default policies mirroring sessions table.
ALTER TABLE public.session_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_requests'
      AND policyname = 'Participants can view related requests'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Participants can view related requests" ON public.session_requests
      FOR SELECT
      USING (
        auth.uid() IN (coach_id, client_id, requested_by)
      )
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_requests'
      AND policyname = 'Clients can create their own requests'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Clients can create their own requests" ON public.session_requests
      FOR INSERT
      WITH CHECK (
        auth.uid() = requested_by
        AND auth.uid() = client_id
      )
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_requests'
      AND policyname = 'Coaches manage their request queue'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Coaches manage their request queue" ON public.session_requests
      FOR ALL
      USING (auth.uid() = coach_id)
      WITH CHECK (auth.uid() = coach_id)
    $$;
  END IF;
END$$;

-- Keep a lightweight view that surfaces pending requests for dashboards.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'coach_pending_session_requests'
  ) THEN
    EXECUTE $$
      CREATE VIEW public.coach_pending_session_requests AS
      SELECT
        r.id,
        r.coach_id,
        r.client_id,
        r.scheduled_at,
        r.duration_minutes,
        r.title,
        r.timezone,
        r.meeting_url,
        r.notes,
        r.requested_at,
        r.requested_by
      FROM public.session_requests r
      WHERE r.status = 'pending'
    $$;
  END IF;
END$$;
