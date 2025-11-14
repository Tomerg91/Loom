-- ============================================================================
-- Resource Download Helper Functions
-- ============================================================================
-- This migration adds helper functions for tracking resource downloads
-- and client access to resources.
-- ============================================================================

-- ============================================================================
-- 1. INCREMENT COUNTER FUNCTION
-- ============================================================================

/**
 * Controlled increment helper for resource download counters.
 * Only supports incrementing file_uploads.download_count for
 * callers that have access to the specified resource.
 */
CREATE OR REPLACE FUNCTION increment(
  table_name TEXT,
  row_id UUID,
  column_name TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  -- Restrict the helper to the single supported table/column pair
  IF table_name <> 'file_uploads' OR column_name <> 'download_count' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = format(
        'increment() is not permitted for table %s column %s',
        table_name,
        column_name
      );
  END IF;

  -- Ensure the caller is allowed to record a download for the target resource
  SELECT EXISTS (
    SELECT 1
    FROM public.file_uploads f
    WHERE f.id = row_id
      AND f.is_library_resource = TRUE
      AND (
        f.user_id = auth.uid()
        OR f.is_public
        OR (
          f.shared_with_all_clients
          AND EXISTS (
            SELECT 1
            FROM public.sessions s
            WHERE s.client_id = auth.uid()
              AND s.coach_id = f.user_id
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.file_shares fs
          WHERE fs.file_id = row_id
            AND fs.shared_with = auth.uid()
            AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
        )
      )
  )
  INTO has_access;

  IF NOT COALESCE(has_access, FALSE) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'increment() not authorized for the specified resource';
  END IF;

  UPDATE public.file_uploads
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = row_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment(TEXT, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION increment(TEXT, UUID, TEXT) IS 'Increments file_uploads.download_count when the caller has access rights';

-- ============================================================================
-- 2. TRACK RESOURCE ACCESS FUNCTION
-- ============================================================================

/**
 * Track client access to a resource
 * Updates or creates resource_client_progress record
 */
CREATE OR REPLACE FUNCTION track_resource_access(
  p_file_id UUID,
  p_client_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert or update progress record
  INSERT INTO resource_client_progress (
    file_id,
    client_id,
    viewed_at,
    last_accessed_at,
    access_count
  ) VALUES (
    p_file_id,
    p_client_id,
    NOW(),
    NOW(),
    1
  )
  ON CONFLICT (file_id, client_id) DO UPDATE SET
    last_accessed_at = NOW(),
    access_count = resource_client_progress.access_count + 1,
    viewed_at = CASE
      WHEN resource_client_progress.viewed_at IS NULL THEN NOW()
      ELSE resource_client_progress.viewed_at
    END;

  -- Update view count on file_uploads
  UPDATE file_uploads
  SET view_count = view_count + 1
  WHERE id = p_file_id;
END;
$$;

GRANT EXECUTE ON FUNCTION track_resource_access(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION track_resource_access(UUID, UUID) IS 'Tracks client access to a resource and updates progress';

-- ============================================================================
-- 3. FILE DOWNLOAD TRACKING TABLE
-- ============================================================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS file_download_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE NOT NULL,
  downloaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_file_download_tracking_file_id
  ON file_download_tracking(file_id);

CREATE INDEX IF NOT EXISTS idx_file_download_tracking_user
  ON file_download_tracking(downloaded_by);

CREATE INDEX IF NOT EXISTS idx_file_download_tracking_date
  ON file_download_tracking(downloaded_at DESC);

-- Enable RLS
ALTER TABLE file_download_tracking ENABLE ROW LEVEL SECURITY;

-- Coaches can view download tracking for their resources
CREATE POLICY "Coaches can view download tracking for their resources"
  ON file_download_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_uploads
      WHERE file_uploads.id = file_download_tracking.file_id
      AND file_uploads.user_id = auth.uid()
    )
  );

-- Users can view their own download history
CREATE POLICY "Users can view their own download history"
  ON file_download_tracking
  FOR SELECT
  USING (
    downloaded_by = auth.uid()
  );

-- All authenticated users can insert download tracking
CREATE POLICY "Authenticated users can insert download tracking"
  ON file_download_tracking
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

GRANT SELECT, INSERT ON file_download_tracking TO authenticated;

COMMENT ON TABLE file_download_tracking IS 'Tracks resource download events for analytics';
COMMENT ON COLUMN file_download_tracking.file_id IS 'The resource that was downloaded';
COMMENT ON COLUMN file_download_tracking.downloaded_by IS 'User who downloaded the resource';
COMMENT ON COLUMN file_download_tracking.downloaded_at IS 'When the download occurred';

-- ============================================================================
-- 4. ADD DOWNLOAD_COUNT COLUMN IF MISSING
-- ============================================================================

-- Ensure download_count exists on file_uploads
ALTER TABLE file_uploads
  ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;

-- Add index for sorting by download count
CREATE INDEX IF NOT EXISTS idx_file_uploads_download_count
  ON file_uploads(download_count DESC)
  WHERE is_library_resource = true;

COMMENT ON COLUMN file_uploads.download_count IS 'Number of times this file has been downloaded';
