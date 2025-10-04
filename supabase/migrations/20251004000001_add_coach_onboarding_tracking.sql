-- Add onboarding tracking to coach_profiles
-- This migration adds fields to track coach onboarding completion and settings

ALTER TABLE coach_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS default_session_duration INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS booking_buffer_time INTEGER DEFAULT 15;

-- Add constraints
ALTER TABLE coach_profiles
ADD CONSTRAINT valid_session_duration CHECK (default_session_duration IS NULL OR (default_session_duration >= 15 AND default_session_duration <= 480)),
ADD CONSTRAINT valid_buffer_time CHECK (booking_buffer_time IS NULL OR (booking_buffer_time >= 0 AND booking_buffer_time <= 120));

-- Create index for querying onboarded coaches
CREATE INDEX IF NOT EXISTS idx_coach_profiles_onboarding_completed
ON coach_profiles(onboarding_completed_at)
WHERE onboarding_completed_at IS NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN coach_profiles.onboarding_completed_at IS 'Timestamp when coach completed their onboarding process';
COMMENT ON COLUMN coach_profiles.default_session_duration IS 'Default session duration in minutes (15-480)';
COMMENT ON COLUMN coach_profiles.booking_buffer_time IS 'Buffer time between sessions in minutes (0-120)';
COMMENT ON COLUMN coach_profiles.profile_picture_url IS 'URL to coach profile picture (can also be stored in users.avatar_url)';

-- Update existing coach profiles to mark as onboarded if they have basic info
UPDATE coach_profiles
SET onboarding_completed_at = created_at
WHERE onboarding_completed_at IS NULL
  AND bio IS NOT NULL
  AND bio != ''
  AND experience_years > 0
  AND session_rate > 0;
