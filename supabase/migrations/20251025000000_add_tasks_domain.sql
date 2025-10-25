-- Create task_categories table
CREATE TABLE task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coach_id, name)
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
  is_template BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create task_instances table
CREATE TABLE task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, client_id)
);

-- Create task_progress_updates table
CREATE TABLE task_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES task_instances(id) ON DELETE CASCADE,
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_tasks_coach_id ON tasks(coach_id);
CREATE INDEX idx_task_categories_coach_id ON task_categories(coach_id);
CREATE INDEX idx_task_instances_client_id ON task_instances(client_id);
CREATE INDEX idx_task_instances_task_id ON task_instances(task_id);
CREATE INDEX idx_task_progress_updates_instance_id ON task_progress_updates(instance_id);

-- Enable RLS
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_progress_updates ENABLE ROW LEVEL SECURITY;

-- Task Categories RLS
CREATE POLICY "Coaches can view their own categories"
  ON task_categories FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert categories"
  ON task_categories FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own categories"
  ON task_categories FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own categories"
  ON task_categories FOR DELETE
  USING (auth.uid() = coach_id);

-- Tasks RLS
CREATE POLICY "Coaches can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = coach_id);

-- Task Instances RLS
CREATE POLICY "Coaches can view instances of their tasks"
  ON task_instances FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks WHERE coach_id = auth.uid()) OR
    client_id = auth.uid()
  );

CREATE POLICY "Coaches can assign task instances"
  ON task_instances FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks WHERE coach_id = auth.uid())
  );

CREATE POLICY "Coaches can update instances of their tasks"
  ON task_instances FOR UPDATE
  USING (task_id IN (SELECT id FROM tasks WHERE coach_id = auth.uid()));

CREATE POLICY "Coaches can delete instances of their tasks"
  ON task_instances FOR DELETE
  USING (task_id IN (SELECT id FROM tasks WHERE coach_id = auth.uid()));

-- Task Progress Updates RLS
CREATE POLICY "Users can view progress on their instances"
  ON task_progress_updates FOR SELECT
  USING (
    instance_id IN (
      SELECT id FROM task_instances WHERE client_id = auth.uid() OR
      task_id IN (SELECT id FROM tasks WHERE coach_id = auth.uid())
    )
  );

CREATE POLICY "Clients can insert progress updates"
  ON task_progress_updates FOR INSERT
  WITH CHECK (
    instance_id IN (SELECT id FROM task_instances WHERE client_id = auth.uid())
  );

CREATE POLICY "Clients can update their own progress updates"
  ON task_progress_updates FOR UPDATE
  USING (
    instance_id IN (SELECT id FROM task_instances WHERE client_id = auth.uid())
  );

CREATE POLICY "Clients can delete their own progress updates"
  ON task_progress_updates FOR DELETE
  USING (
    instance_id IN (SELECT id FROM task_instances WHERE client_id = auth.uid())
  );
