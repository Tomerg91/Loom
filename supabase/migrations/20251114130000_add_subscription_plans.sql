-- ============================================================================
-- Subscription Plans Table
-- ============================================================================
-- This migration creates a subscription_plans table to store pricing tiers
-- and feature configurations aligned with marketing requirements.
--
-- Key Changes:
-- 1. Create subscription_plans table with pricing and features
-- 2. Insert default plans (free, basic, professional, enterprise)
-- 3. Add plan_features table for flexible feature management
-- 4. Add helper functions for plan queries
-- ============================================================================

-- ============================================================================
-- 1. CREATE SUBSCRIPTION_PLANS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier subscription_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',

  -- Billing
  billing_interval TEXT DEFAULT 'monthly', -- 'monthly', 'yearly', 'lifetime'
  trial_days INTEGER DEFAULT 0,

  -- Features (JSON for flexibility)
  features JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Limits
  max_clients INTEGER, -- NULL = unlimited
  max_sessions_per_month INTEGER, -- NULL = unlimited
  max_resources INTEGER, -- NULL = unlimited
  max_storage_mb INTEGER, -- NULL = unlimited

  -- Visibility
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE, -- Show on pricing page
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS subscription_plans_tier_idx ON public.subscription_plans(tier);
CREATE INDEX IF NOT EXISTS subscription_plans_active_idx ON public.subscription_plans(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS subscription_plans_public_idx ON public.subscription_plans(is_public, sort_order) WHERE is_public = TRUE;

-- ============================================================================
-- 2. INSERT DEFAULT PLANS
-- ============================================================================

-- Free Plan
INSERT INTO public.subscription_plans (
  tier, name, description,
  price_monthly_cents, price_yearly_cents, currency,
  billing_interval, trial_days,
  features, max_clients, max_sessions_per_month, max_resources, max_storage_mb,
  is_active, is_public, sort_order
) VALUES (
  'free', 'Free', 'Perfect for trying out the platform',
  0, 0, 'ILS',
  'lifetime', 0,
  '{
    "session_management": true,
    "client_management": true,
    "basic_analytics": true,
    "resource_library": false,
    "advanced_analytics": false,
    "custom_branding": false,
    "priority_support": false,
    "api_access": false
  }'::jsonb,
  5, 20, 0, 100,
  TRUE, TRUE, 1
) ON CONFLICT (tier) DO NOTHING;

-- Basic Plan
INSERT INTO public.subscription_plans (
  tier, name, description,
  price_monthly_cents, price_yearly_cents, currency,
  billing_interval, trial_days,
  features, max_clients, max_sessions_per_month, max_resources, max_storage_mb,
  is_active, is_public, sort_order
) VALUES (
  'basic', 'Basic', 'Essential features for growing coaches',
  9900, 99000, 'ILS', -- ₹99/month or ₹990/year (20% discount)
  'monthly', 14,
  '{
    "session_management": true,
    "client_management": true,
    "basic_analytics": true,
    "resource_library": true,
    "advanced_analytics": false,
    "custom_branding": false,
    "priority_support": false,
    "api_access": false,
    "calendar_integration": true,
    "email_notifications": true
  }'::jsonb,
  50, 100, 50, 5000,
  TRUE, TRUE, 2
) ON CONFLICT (tier) DO NOTHING;

-- Professional Plan
INSERT INTO public.subscription_plans (
  tier, name, description,
  price_monthly_cents, price_yearly_cents, currency,
  billing_interval, trial_days,
  features, max_clients, max_sessions_per_month, max_resources, max_storage_mb,
  is_active, is_public, sort_order
) VALUES (
  'professional', 'Professional', 'Advanced features for serious coaches',
  29900, 299000, 'ILS', -- ₹299/month or ₹2990/year (17% discount)
  'monthly', 30,
  '{
    "session_management": true,
    "client_management": true,
    "basic_analytics": true,
    "resource_library": true,
    "advanced_analytics": true,
    "custom_branding": true,
    "priority_support": true,
    "api_access": false,
    "calendar_integration": true,
    "email_notifications": true,
    "sms_notifications": true,
    "custom_forms": true,
    "white_label": false,
    "team_collaboration": true
  }'::jsonb,
  NULL, NULL, NULL, 50000, -- Unlimited clients, sessions, resources
  TRUE, TRUE, 3
) ON CONFLICT (tier) DO NOTHING;

-- Enterprise Plan
INSERT INTO public.subscription_plans (
  tier, name, description,
  price_monthly_cents, price_yearly_cents, currency,
  billing_interval, trial_days,
  features, max_clients, max_sessions_per_month, max_resources, max_storage_mb,
  is_active, is_public, sort_order
) VALUES (
  'enterprise', 'Enterprise', 'Complete solution for organizations',
  99900, 999000, 'ILS', -- ₹999/month or ₹9990/year (17% discount)
  'monthly', 30,
  '{
    "session_management": true,
    "client_management": true,
    "basic_analytics": true,
    "resource_library": true,
    "advanced_analytics": true,
    "custom_branding": true,
    "priority_support": true,
    "api_access": true,
    "calendar_integration": true,
    "email_notifications": true,
    "sms_notifications": true,
    "custom_forms": true,
    "white_label": true,
    "team_collaboration": true,
    "dedicated_support": true,
    "sso": true,
    "custom_integrations": true
  }'::jsonb,
  NULL, NULL, NULL, NULL, -- Unlimited everything
  TRUE, TRUE, 4
) ON CONFLICT (tier) DO NOTHING;

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

/**
 * Get plan details by tier
 */
CREATE OR REPLACE FUNCTION get_plan_by_tier(p_tier subscription_tier)
RETURNS TABLE (
  id UUID,
  tier subscription_tier,
  name TEXT,
  description TEXT,
  price_monthly_cents INTEGER,
  price_yearly_cents INTEGER,
  currency TEXT,
  features JSONB,
  max_clients INTEGER,
  max_sessions_per_month INTEGER,
  max_resources INTEGER,
  max_storage_mb INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    id, tier, name, description,
    price_monthly_cents, price_yearly_cents, currency,
    features,
    max_clients, max_sessions_per_month, max_resources, max_storage_mb
  FROM subscription_plans
  WHERE subscription_plans.tier = p_tier
    AND is_active = TRUE;
$$;

/**
 * Get all public plans for pricing page
 */
CREATE OR REPLACE FUNCTION get_public_plans()
RETURNS TABLE (
  id UUID,
  tier subscription_tier,
  name TEXT,
  description TEXT,
  price_monthly_cents INTEGER,
  price_yearly_cents INTEGER,
  currency TEXT,
  features JSONB,
  max_clients INTEGER,
  max_sessions_per_month INTEGER,
  max_resources INTEGER,
  trial_days INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    id, tier, name, description,
    price_monthly_cents, price_yearly_cents, currency,
    features,
    max_clients, max_sessions_per_month, max_resources,
    trial_days
  FROM subscription_plans
  WHERE is_active = TRUE
    AND is_public = TRUE
  ORDER BY sort_order;
$$;

/**
 * Check if user has feature access
 */
CREATE OR REPLACE FUNCTION user_has_feature(
  user_uuid UUID,
  feature_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier subscription_tier;
  plan_features JSONB;
  has_access BOOLEAN;
BEGIN
  -- Get user's current tier
  SELECT get_user_subscription_tier(user_uuid) INTO user_tier;

  -- Get plan features
  SELECT features INTO plan_features
  FROM subscription_plans
  WHERE tier = user_tier
    AND is_active = TRUE;

  -- Check if feature exists and is enabled
  has_access := COALESCE((plan_features->>feature_name)::BOOLEAN, FALSE);

  RETURN has_access;
END;
$$;

/**
 * Check if user is within plan limits
 */
CREATE OR REPLACE FUNCTION check_plan_limit(
  user_uuid UUID,
  limit_type TEXT -- 'clients', 'sessions', 'resources', 'storage'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier subscription_tier;
  plan_limit INTEGER;
  current_usage INTEGER := 0;
  is_within_limit BOOLEAN;
BEGIN
  -- Get user's tier
  SELECT get_user_subscription_tier(user_uuid) INTO user_tier;

  -- Get plan limit
  IF limit_type = 'clients' THEN
    SELECT max_clients INTO plan_limit FROM subscription_plans WHERE tier = user_tier;
    SELECT COUNT(*) INTO current_usage FROM users WHERE coach_id = user_uuid;
  ELSIF limit_type = 'sessions' THEN
    SELECT max_sessions_per_month INTO plan_limit FROM subscription_plans WHERE tier = user_tier;
    SELECT COUNT(*) INTO current_usage FROM sessions
    WHERE coach_id = user_uuid
      AND created_at >= DATE_TRUNC('month', NOW());
  ELSIF limit_type = 'resources' THEN
    SELECT max_resources INTO plan_limit FROM subscription_plans WHERE tier = user_tier;
    SELECT COUNT(*) INTO current_usage FROM resources WHERE created_by = user_uuid;
  END IF;

  -- NULL limit means unlimited
  is_within_limit := (plan_limit IS NULL) OR (current_usage < plan_limit);

  RETURN jsonb_build_object(
    'limit', plan_limit,
    'current', current_usage,
    'is_within_limit', is_within_limit,
    'remaining', CASE WHEN plan_limit IS NULL THEN NULL ELSE (plan_limit - current_usage) END
  );
END;
$$;

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read active plans
DROP POLICY IF EXISTS subscription_plans_select_all ON public.subscription_plans;
CREATE POLICY subscription_plans_select_all
  ON public.subscription_plans FOR SELECT
  USING (is_active = TRUE);

-- Only admins can modify plans
DROP POLICY IF EXISTS subscription_plans_modify_admin ON public.subscription_plans;
CREATE POLICY subscription_plans_modify_admin
  ON public.subscription_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT EXECUTE ON FUNCTION get_plan_by_tier(subscription_tier) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_plans() TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_feature(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_plan_limit(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE subscription_plans IS 'Subscription pricing tiers and feature configurations';
COMMENT ON COLUMN subscription_plans.features IS 'JSON object with feature flags';
COMMENT ON COLUMN subscription_plans.max_clients IS 'Maximum number of clients (NULL = unlimited)';
COMMENT ON FUNCTION get_plan_by_tier(subscription_tier) IS 'Get plan details by tier';
COMMENT ON FUNCTION get_public_plans() IS 'Get all plans visible on pricing page';
COMMENT ON FUNCTION user_has_feature(UUID, TEXT) IS 'Check if user has access to a specific feature';
COMMENT ON FUNCTION check_plan_limit(UUID, TEXT) IS 'Check if user is within plan limits';
