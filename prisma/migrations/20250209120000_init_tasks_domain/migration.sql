-- Migration: init_tasks_domain
-- Purpose: Introduce task management tables, enums, and indices required for
-- the Action Items & Homework feature set.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskStatus') THEN
    CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskPriority') THEN
    CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationJobType') THEN
    CREATE TYPE "NotificationJobType" AS ENUM ('ASSIGNMENT_CREATED', 'UPCOMING_DUE', 'OVERDUE', 'RECURRING_PROMPT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationJobStatus') THEN
    CREATE TYPE "NotificationJobStatus" AS ENUM ('PENDING', 'SCHEDULED', 'SENT', 'FAILED', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  label text NOT NULL,
  color_hex varchar(9) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  client_id uuid NOT NULL,
  category_id uuid REFERENCES public.task_categories (id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  visibility_to_coach boolean NOT NULL DEFAULT true,
  due_date timestamptz,
  recurrence_rule jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  scheduled_date timestamptz,
  due_date timestamptz NOT NULL,
  status "TaskStatus" NOT NULL DEFAULT 'PENDING',
  completion_percentage integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.progress_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id uuid NOT NULL REFERENCES public.task_instances (id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  percentage integer NOT NULL,
  note text,
  is_visible_to_coach boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id uuid REFERENCES public.task_instances (id) ON DELETE SET NULL,
  progress_update_id uuid REFERENCES public.progress_updates (id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  uploaded_by_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id uuid NOT NULL REFERENCES public.task_instances (id) ON DELETE CASCADE,
  type "NotificationJobType" NOT NULL,
  status "NotificationJobStatus" NOT NULL DEFAULT 'PENDING',
  scheduled_at timestamptz NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  client_id uuid NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  file_url text,
  filters jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS task_categories_coach_id_idx ON public.task_categories (coach_id);
CREATE INDEX IF NOT EXISTS tasks_coach_id_idx ON public.tasks (coach_id);
CREATE INDEX IF NOT EXISTS tasks_client_due_idx ON public.tasks (client_id, due_date);
CREATE INDEX IF NOT EXISTS tasks_category_id_idx ON public.tasks (category_id);
CREATE INDEX IF NOT EXISTS task_instances_task_due_idx ON public.task_instances (task_id, due_date);
CREATE INDEX IF NOT EXISTS task_instances_due_status_idx ON public.task_instances (due_date, status);
CREATE INDEX IF NOT EXISTS progress_updates_instance_idx ON public.progress_updates (task_instance_id);
CREATE INDEX IF NOT EXISTS progress_updates_author_created_idx ON public.progress_updates (author_id, created_at);
CREATE INDEX IF NOT EXISTS attachments_task_instance_idx ON public.attachments (task_instance_id);
CREATE INDEX IF NOT EXISTS attachments_progress_update_idx ON public.attachments (progress_update_id);
CREATE INDEX IF NOT EXISTS notification_jobs_instance_status_idx ON public.notification_jobs (task_instance_id, status);
CREATE INDEX IF NOT EXISTS notification_jobs_scheduled_at_idx ON public.notification_jobs (scheduled_at);
CREATE INDEX IF NOT EXISTS export_logs_coach_client_generated_idx ON public.export_logs (coach_id, client_id, generated_at);

-- Ensure updated_at columns maintain recency automatically.
CREATE OR REPLACE FUNCTION public.set_current_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_task_categories_updated_at
BEFORE UPDATE ON public.task_categories
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp();

CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp();

CREATE TRIGGER set_task_instances_updated_at
BEFORE UPDATE ON public.task_instances
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp();

CREATE TRIGGER set_progress_updates_updated_at
BEFORE UPDATE ON public.progress_updates
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp();
