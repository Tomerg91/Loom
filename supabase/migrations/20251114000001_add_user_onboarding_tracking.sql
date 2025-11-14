-- Add onboarding tracking fields to users table
-- This migration adds comprehensive onboarding progress tracking for both coaches and clients

-- Create onboarding status enum if not exists
DO $$ BEGIN
    CREATE TYPE onboarding_status AS ENUM ('not_started', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add onboarding tracking columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_status onboarding_status NOT NULL DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

-- Add constraints for onboarding_step
ALTER TABLE users
ADD CONSTRAINT valid_onboarding_step CHECK (
    (role = 'coach' AND onboarding_step >= 0 AND onboarding_step <= 5) OR
    (role = 'client' AND onboarding_step >= 0 AND onboarding_step <= 3) OR
    (role = 'admin' AND onboarding_step >= 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_users_onboarding_status ON users(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_users_onboarding_incomplete ON users(role, onboarding_status)
WHERE onboarding_status IN ('not_started', 'in_progress');

-- Add comments explaining the fields
COMMENT ON COLUMN users.onboarding_status IS 'Current onboarding status: not_started, in_progress, or completed';
COMMENT ON COLUMN users.onboarding_step IS 'Current step in onboarding flow (0-5 for coach, 0-3 for client)';
COMMENT ON COLUMN users.onboarding_completed_at IS 'Timestamp when user completed their onboarding process';
COMMENT ON COLUMN users.onboarding_data IS 'JSONB field storing partial onboarding form data for resuming';

-- Function to automatically update onboarding_completed_at when status changes to completed
CREATE OR REPLACE FUNCTION update_onboarding_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.onboarding_status = 'completed' AND OLD.onboarding_status != 'completed' THEN
        NEW.onboarding_completed_at = NOW();
    END IF;

    IF NEW.onboarding_status != 'completed' AND OLD.onboarding_status = 'completed' THEN
        NEW.onboarding_completed_at = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Create trigger for automatic onboarding completion timestamp
DROP TRIGGER IF EXISTS trigger_update_onboarding_completed_at ON users;
CREATE TRIGGER trigger_update_onboarding_completed_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_completed_at();

-- Update existing users: mark coaches with coach_profiles as completed
UPDATE users u
SET
    onboarding_status = 'completed',
    onboarding_step = 5,
    onboarding_completed_at = cp.onboarding_completed_at
FROM coach_profiles cp
WHERE u.id = cp.coach_id
    AND u.role = 'coach'
    AND cp.onboarding_completed_at IS NOT NULL
    AND u.onboarding_status = 'not_started';

-- Update existing users: mark clients as completed if they have any sessions
UPDATE users u
SET
    onboarding_status = 'completed',
    onboarding_step = 3,
    onboarding_completed_at = (
        SELECT MIN(created_at)
        FROM sessions
        WHERE client_id = u.id
    )
WHERE u.role = 'client'
    AND u.onboarding_status = 'not_started'
    AND EXISTS (SELECT 1 FROM sessions WHERE client_id = u.id);
