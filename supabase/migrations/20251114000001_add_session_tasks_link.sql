-- Migration: Add session linking to tasks
-- Date: 2025-11-14
-- Purpose: Link tasks to specific coaching sessions for better context and tracking

-- Add session_id column to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL;

-- Add index for session-based task queries
CREATE INDEX IF NOT EXISTS idx_tasks_session_id ON public.tasks (session_id);

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.session_id IS 'Optional reference to the session during which this task was assigned. Provides context for task creation and helps with session-based task filtering.';
