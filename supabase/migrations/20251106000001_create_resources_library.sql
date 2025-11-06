-- Migration: Create Resources Library
-- Description: Add tables for coach resources management and client resource assignments
-- Date: 2025-11-06
-- Sprint: 06 - Story 5

-- ============================================================================
-- Create ENUM types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE resource_type AS ENUM ('video', 'audio', 'pdf', 'link');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Create resources table
-- ============================================================================

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Resource metadata
  title TEXT NOT NULL,
  description TEXT,
  type resource_type NOT NULL,

  -- Resource location
  url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Organization and categorization
  tags TEXT[] DEFAULT '{}',
  category TEXT,

  -- Duration for video/audio resources (in minutes)
  duration_minutes INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT resources_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT resources_url_not_empty CHECK (length(trim(url)) > 0),
  CONSTRAINT resources_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

-- ============================================================================
-- Create resource_assignments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Assignment details
  notes TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Tracking
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Ensure unique assignment per client-resource pair
  CONSTRAINT resource_assignments_unique UNIQUE(resource_id, client_id)
);

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

-- Resources indexes
CREATE INDEX IF NOT EXISTS idx_resources_coach_id
  ON resources(coach_id);

CREATE INDEX IF NOT EXISTS idx_resources_type
  ON resources(type);

CREATE INDEX IF NOT EXISTS idx_resources_created_at
  ON resources(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resources_tags
  ON resources USING GIN(tags);

-- Resource assignments indexes
CREATE INDEX IF NOT EXISTS idx_resource_assignments_client_id
  ON resource_assignments(client_id);

CREATE INDEX IF NOT EXISTS idx_resource_assignments_resource_id
  ON resource_assignments(resource_id);

CREATE INDEX IF NOT EXISTS idx_resource_assignments_assigned_by
  ON resource_assignments(assigned_by);

CREATE INDEX IF NOT EXISTS idx_resource_assignments_assigned_at
  ON resource_assignments(assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_resource_assignments_viewed
  ON resource_assignments(client_id, viewed_at)
  WHERE viewed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resource_assignments_completed
  ON resource_assignments(client_id, completed_at)
  WHERE completed_at IS NOT NULL;

-- ============================================================================
-- Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for resources table
-- ============================================================================

-- Coaches can manage their own resources (CRUD)
CREATE POLICY "Coaches can manage their own resources"
  ON resources
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Clients can view resources assigned to them
CREATE POLICY "Clients can view assigned resources"
  ON resources
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT resource_id
      FROM resource_assignments
      WHERE client_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies for resource_assignments table
-- ============================================================================

-- Coaches can assign resources to their clients
CREATE POLICY "Coaches can assign resources"
  ON resource_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM resources
      WHERE resources.id = resource_assignments.resource_id
      AND resources.coach_id = auth.uid()
    )
  );

-- Coaches can view assignments for their resources
CREATE POLICY "Coaches can view their resource assignments"
  ON resource_assignments
  FOR SELECT
  TO authenticated
  USING (
    assigned_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM resources
      WHERE resources.id = resource_assignments.resource_id
      AND resources.coach_id = auth.uid()
    )
  );

-- Coaches can update/delete assignments for their resources
CREATE POLICY "Coaches can manage their resource assignments"
  ON resource_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resources
      WHERE resources.id = resource_assignments.resource_id
      AND resources.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resources
      WHERE resources.id = resource_assignments.resource_id
      AND resources.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete their resource assignments"
  ON resource_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resources
      WHERE resources.id = resource_assignments.resource_id
      AND resources.coach_id = auth.uid()
    )
  );

-- Clients can view their assigned resources
CREATE POLICY "Clients can view their assigned resources"
  ON resource_assignments
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Clients can update tracking fields (viewed_at, completed_at) for their assignments
CREATE POLICY "Clients can update their resource progress"
  ON resource_assignments
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (
    client_id = auth.uid() AND
    -- Only allow updating tracking fields, not reassignment
    resource_id = (SELECT resource_id FROM resource_assignments WHERE id = resource_assignments.id) AND
    assigned_by = (SELECT assigned_by FROM resource_assignments WHERE id = resource_assignments.id)
  );

-- ============================================================================
-- Create trigger for updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER resources_updated_at_trigger
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();

-- ============================================================================
-- Create helpful views for querying
-- ============================================================================

-- View: Resources with assignment counts
CREATE OR REPLACE VIEW resources_with_stats AS
SELECT
  r.*,
  COUNT(DISTINCT ra.id) AS total_assignments,
  COUNT(DISTINCT ra.id) FILTER (WHERE ra.viewed_at IS NOT NULL) AS viewed_count,
  COUNT(DISTINCT ra.id) FILTER (WHERE ra.completed_at IS NOT NULL) AS completed_count
FROM resources r
LEFT JOIN resource_assignments ra ON r.id = ra.resource_id
GROUP BY r.id;

-- View: Client resources with progress
CREATE OR REPLACE VIEW client_resources_with_progress AS
SELECT
  ra.id AS assignment_id,
  ra.client_id,
  ra.assigned_by,
  ra.notes,
  ra.assigned_at,
  ra.viewed_at,
  ra.completed_at,
  r.id AS resource_id,
  r.title,
  r.description,
  r.type,
  r.url,
  r.thumbnail_url,
  r.tags,
  r.category,
  r.duration_minutes,
  r.created_at AS resource_created_at,
  CASE
    WHEN ra.completed_at IS NOT NULL THEN 'completed'
    WHEN ra.viewed_at IS NOT NULL THEN 'in_progress'
    ELSE 'not_started'
  END AS progress_status
FROM resource_assignments ra
JOIN resources r ON ra.resource_id = r.id;

-- ============================================================================
-- Grant permissions on views
-- ============================================================================

GRANT SELECT ON resources_with_stats TO authenticated;
GRANT SELECT ON client_resources_with_progress TO authenticated;

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON TABLE resources IS 'Stores resources (videos, PDFs, audio, links) created by coaches';
COMMENT ON TABLE resource_assignments IS 'Tracks which resources are assigned to which clients';
COMMENT ON COLUMN resources.coach_id IS 'The coach who created/owns this resource';
COMMENT ON COLUMN resources.type IS 'Type of resource: video, audio, pdf, or link';
COMMENT ON COLUMN resources.duration_minutes IS 'Duration in minutes for video/audio resources';
COMMENT ON COLUMN resource_assignments.viewed_at IS 'When the client first viewed the resource';
COMMENT ON COLUMN resource_assignments.completed_at IS 'When the client marked the resource as completed';
