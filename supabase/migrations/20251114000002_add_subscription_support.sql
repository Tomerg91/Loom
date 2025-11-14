-- ============================================================================
-- Add Subscription Support for Coaches
-- ============================================================================
-- This migration adds subscription/plan tracking for coaches to enable
-- access gating for premium features like the resource library.
--
-- Key Changes:
-- 1. Add subscription_tier to users table
-- 2. Add subscription_expires_at to users table
-- 3. Create subscription helper functions
-- 4. Add indexes for subscription queries
-- ============================================================================

-- ============================================================================
-- 1. ADD SUBSCRIPTION FIELDS TO USERS TABLE
-- ============================================================================

-- Add subscription tier enum
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'professional', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add subscription fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for subscription queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier
  ON users(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_users_subscription_expires_at
  ON users(subscription_expires_at)
  WHERE subscription_expires_at IS NOT NULL;

-- ============================================================================
-- 2. SUBSCRIPTION HELPER FUNCTIONS
-- ============================================================================

/**
 * Check if a user has an active subscription
 */
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  tier subscription_tier;
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT subscription_tier, subscription_expires_at
  INTO tier, expires_at
  FROM users
  WHERE id = user_uuid;

  -- Free tier is always "active" but limited
  IF tier = 'free' THEN
    RETURN TRUE;
  END IF;

  -- Other tiers require valid expiration date
  IF expires_at IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN expires_at > NOW();
END;
$$;

/**
 * Check if a user has a paid subscription (not free tier)
 */
CREATE OR REPLACE FUNCTION has_paid_subscription(user_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  tier subscription_tier;
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT subscription_tier, subscription_expires_at
  INTO tier, expires_at
  FROM users
  WHERE id = user_uuid;

  -- Free tier is not paid
  IF tier = 'free' OR tier IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if subscription is still valid
  IF expires_at IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN expires_at > NOW();
END;
$$;

/**
 * Get user's subscription tier
 */
CREATE OR REPLACE FUNCTION get_user_subscription_tier(user_uuid UUID)
RETURNS subscription_tier
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  tier subscription_tier;
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT subscription_tier, subscription_expires_at
  INTO tier, expires_at
  FROM users
  WHERE id = user_uuid;

  -- If subscription expired, downgrade to free
  IF tier != 'free' AND (expires_at IS NULL OR expires_at <= NOW()) THEN
    RETURN 'free';
  END IF;

  RETURN COALESCE(tier, 'free');
END;
$$;

/**
 * Check if a coach can access the resource library
 * Resource library is available to all paid tiers (basic, professional, enterprise)
 */
CREATE OR REPLACE FUNCTION can_access_resource_library(coach_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role user_role;
  tier subscription_tier;
BEGIN
  SELECT role, subscription_tier
  INTO user_role, tier
  FROM users
  WHERE id = coach_uuid;

  -- Must be a coach or admin
  IF user_role NOT IN ('coach', 'admin') THEN
    RETURN FALSE;
  END IF;

  -- Admins always have access
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check if coach has paid subscription
  RETURN has_paid_subscription(coach_uuid);
END;
$$;

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION has_active_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_paid_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_resource_library(UUID) TO authenticated;

-- ============================================================================
-- 4. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN users.subscription_tier IS 'User subscription tier (free, basic, professional, enterprise)';
COMMENT ON COLUMN users.subscription_expires_at IS 'When the current subscription expires (NULL for free tier or lifetime)';
COMMENT ON COLUMN users.subscription_started_at IS 'When the current subscription started';
COMMENT ON COLUMN users.subscription_metadata IS 'Additional subscription metadata (features, limits, etc.)';

COMMENT ON FUNCTION has_active_subscription(UUID) IS 'Returns TRUE if user has an active subscription (including free tier)';
COMMENT ON FUNCTION has_paid_subscription(UUID) IS 'Returns TRUE if user has a paid subscription (not free tier)';
COMMENT ON FUNCTION get_user_subscription_tier(UUID) IS 'Returns user subscription tier, accounting for expiration';
COMMENT ON FUNCTION can_access_resource_library(UUID) IS 'Returns TRUE if coach can access the resource library feature';
