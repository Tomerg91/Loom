--
-- Migration: 20251015000010_tasks_performance_view.sql
-- Description: Adds additional indexes and an aggregated view to support the
--              sessions module task list queries.
--

-- Ensure composite indexes exist for the filters the dashboard leverages.
CREATE INDEX IF NOT EXISTS idx_tasks_coach_status_due_date
  ON public.tasks (coach_id, status, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_client_status_due_date
  ON public.tasks (client_id, status, due_date DESC);

-- Provide a lightweight view summarizing active task counts per coach/client.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'coach_task_overview'
  ) THEN
    EXECUTE $view$
      CREATE VIEW public.coach_task_overview AS
      SELECT
        t.coach_id,
        t.client_id,
        COUNT(*) FILTER (WHERE t.status = 'PENDING') AS pending_tasks,
        COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS') AS in_progress_tasks,
        COUNT(*) FILTER (WHERE t.status = 'COMPLETED') AS completed_tasks,
        COUNT(*) FILTER (WHERE t.status = 'OVERDUE') AS overdue_tasks
      FROM public.tasks t
      WHERE t.archived_at IS NULL
      GROUP BY t.coach_id, t.client_id
    $view$;
  END IF;
END$$;

COMMENT ON VIEW public.coach_task_overview IS
  'Aggregated task counts per coach/client pairing used by the sessions module';
