-- Task domain schema for Supabase
-- Date: 2025-10-01
-- Creates enums and tables powering the Action Items & Homework feature set

-- Enum definitions ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'task_priority'
  ) THEN
    CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'task_status'
  ) THEN
    CREATE TYPE task_status AS ENUM (
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
      'OVERDUE'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'task_notification_type'
  ) THEN
    CREATE TYPE task_notification_type AS ENUM (
      'ASSIGNMENT_CREATED',
      'UPCOMING_DUE',
      'OVERDUE',
      'RECURRING_PROMPT'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'task_notification_status'
  ) THEN
    CREATE TYPE task_notification_status AS ENUM (
      'SCHEDULED',
      'PROCESSING',
      'SENT',
      'FAILED',
      'CANCELLED'
    );
  END IF;
END
$$;

-- Utility trigger ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Task categories ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color_hex TEXT DEFAULT '#1D7A85',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE TRIGGER task_categories_set_updated_at
BEFORE UPDATE ON public.task_categories
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Tasks -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'MEDIUM',
  status task_status NOT NULL DEFAULT 'PENDING',
  visibility_to_coach BOOLEAN NOT NULL DEFAULT TRUE,
  due_date TIMESTAMPTZ,
  recurrence_rule JSONB,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Task instances ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ NOT NULL,
  status task_status NOT NULL DEFAULT 'PENDING',
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE TRIGGER task_instances_set_updated_at
BEFORE UPDATE ON public.task_instances
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Progress updates --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id UUID NOT NULL REFERENCES public.task_instances(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  percentage INTEGER NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  note TEXT,
  is_visible_to_coach BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Attachments -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id UUID REFERENCES public.task_instances(id) ON DELETE CASCADE,
  progress_update_id UUID REFERENCES public.task_progress_updates(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  mime_type TEXT,
  uploaded_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Notification jobs -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id UUID NOT NULL REFERENCES public.task_instances(id) ON DELETE CASCADE,
  type task_notification_type NOT NULL,
  status task_notification_status NOT NULL DEFAULT 'SCHEDULED',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE TRIGGER task_notification_jobs_set_updated_at
BEFORE UPDATE ON public.task_notification_jobs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Export logs -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  file_url TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::JSONB
);

-- Indexes -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_task_categories_coach_id ON public.task_categories (coach_id);
CREATE INDEX IF NOT EXISTS idx_tasks_coach_client ON public.tasks (coach_id, client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_due_date ON public.tasks (client_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_task_instances_task_due_date ON public.task_instances (task_id, due_date);
CREATE INDEX IF NOT EXISTS idx_task_instances_status ON public.task_instances (status);
CREATE INDEX IF NOT EXISTS idx_task_progress_updates_instance ON public.task_progress_updates (task_instance_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_instance ON public.task_attachments (task_instance_id);
CREATE INDEX IF NOT EXISTS idx_task_notification_jobs_status ON public.task_notification_jobs (status);
CREATE INDEX IF NOT EXISTS idx_task_notification_jobs_scheduled_at ON public.task_notification_jobs (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_task_export_logs_coach_client ON public.task_export_logs (coach_id, client_id);

-- Row level security ------------------------------------------------------
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_export_logs ENABLE ROW LEVEL SECURITY;

-- Basic policies allow service role access; detailed policies will follow in later steps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_service_role'
  ) THEN
    CREATE POLICY tasks_service_role ON public.tasks
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_categories' AND policyname = 'task_categories_service_role'
  ) THEN
    CREATE POLICY task_categories_service_role ON public.task_categories
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_instances' AND policyname = 'task_instances_service_role'
  ) THEN
    CREATE POLICY task_instances_service_role ON public.task_instances
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_progress_updates' AND policyname = 'task_progress_updates_service_role'
  ) THEN
    CREATE POLICY task_progress_updates_service_role ON public.task_progress_updates
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_attachments' AND policyname = 'task_attachments_service_role'
  ) THEN
    CREATE POLICY task_attachments_service_role ON public.task_attachments
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_notification_jobs' AND policyname = 'task_notification_jobs_service_role'
  ) THEN
    CREATE POLICY task_notification_jobs_service_role ON public.task_notification_jobs
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_export_logs' AND policyname = 'task_export_logs_service_role'
  ) THEN
    CREATE POLICY task_export_logs_service_role ON public.task_export_logs
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;
