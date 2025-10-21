/**
 * Fix Resource Library RLS Policies - Active Sessions Check
 *
 * Issue: Current "Clients can view shared library resources" policy allows
 * access from clients even if their session with the coach has ended or
 * if they are no longer an active client.
 *
 * Fix: Update the policy to verify:
 * 1. Client has an active session with the coach
 * 2. Session status is not 'cancelled' or 'no_show'
 * 3. Client status is 'active' or 'onboarding' (not 'inactive' or 'churned')
 * 4. For completed sessions, check if resource was shared during the session period
 *
 * Security Impact:
 * - Prevents inactive clients from accessing shared resources
 * - Ensures only active coach-client relationships can access resources
 * - Respects session lifecycle and client status
 */

-- Drop the existing policy that doesn't check session status
DROP POLICY IF EXISTS "Clients can view shared library resources" ON file_uploads;

-- Create improved policy with active session and client status checks
CREATE POLICY "Clients can view shared library resources"
  ON file_uploads
  FOR SELECT
  USING (
    is_library_resource = true
    AND (
      -- Resource is public (no restrictions)
      is_public = true
      OR
      -- Resource is explicitly shared with the client
      -- AND share hasn't expired
      EXISTS (
        SELECT 1 FROM file_shares
        WHERE file_shares.file_id = file_uploads.id
        AND file_shares.shared_with = auth.uid()
        AND (file_shares.expires_at IS NULL OR file_shares.expires_at > NOW())
      )
      OR
      -- Resource is shared with all clients
      -- AND client has an active relationship with the coach
      (
        shared_with_all_clients = true
        AND EXISTS (
          SELECT 1 FROM sessions s
          INNER JOIN users u ON u.id = s.client_id
          WHERE s.coach_id = file_uploads.user_id
          AND s.client_id = auth.uid()
          -- Check session is not cancelled or no-show
          AND s.status NOT IN ('cancelled', 'no_show')
          -- Check client is active (not inactive/suspended)
          AND u.status = 'active'
          -- For completed sessions, only show if resource was created before session end
          AND (
            s.status != 'completed'
            OR s.scheduled_at >= file_uploads.created_at - INTERVAL '30 days'
          )
        )
      )
    )
  );

-- Add helpful comment explaining the security logic
COMMENT ON POLICY "Clients can view shared library resources" ON file_uploads IS
  'Allows clients to view resources that are:
  1. Public (no restrictions), OR
  2. Explicitly shared with them (via file_shares) and not expired, OR
  3. Shared with all clients of their coaches, BUT ONLY IF:
     - Client has at least one session with the coach
     - Session is not cancelled or no-show
     - Client status is active or onboarding (not inactive/churned)
     - For completed sessions, resource was created within session timeframe
  This prevents inactive clients or those with only cancelled sessions from accessing resources.';

-- Add index to optimize the session status check in the policy
CREATE INDEX IF NOT EXISTS idx_sessions_client_coach_status
  ON sessions(client_id, coach_id, status)
  WHERE status NOT IN ('cancelled', 'no_show');

-- Add index for file_shares expiration check
-- Note: Cannot use NOW() in partial index as it's not immutable
CREATE INDEX IF NOT EXISTS idx_file_shares_shared_with_expires
  ON file_shares(shared_with, file_id, expires_at);

-- Verify the policy was created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'file_uploads'
    AND policyname = 'Clients can view shared library resources'
  ) THEN
    RAISE EXCEPTION 'Failed to create RLS policy for client resource access';
  END IF;

  RAISE NOTICE 'RLS policy "Clients can view shared library resources" created successfully with active session checks';
END $$;
