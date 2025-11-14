-- ============================================================================
-- Payment Alerts Table
-- ============================================================================
-- This migration creates a table to track payment failure alerts
-- and notifications sent to users and admins.
-- ============================================================================

-- ============================================================================
-- 1. CREATE PAYMENT_ALERTS TABLE
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE payment_alert_type AS ENUM (
    'payment_failed',
    'payment_pending',
    'subscription_expiring',
    'payment_disputed',
    'high_value_failure',
    'recurring_failure'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.payment_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert Details
  type payment_alert_type NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,

  -- Payment Info
  amount_cents INTEGER,
  currency TEXT DEFAULT 'ILS',
  reason TEXT,

  -- Notification Status
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  sms_sent BOOLEAN DEFAULT FALSE,
  sms_sent_at TIMESTAMPTZ,
  admin_notified BOOLEAN DEFAULT FALSE,
  admin_notified_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS payment_alerts_user_idx ON public.payment_alerts(user_id);
CREATE INDEX IF NOT EXISTS payment_alerts_payment_idx ON public.payment_alerts(payment_id);
CREATE INDEX IF NOT EXISTS payment_alerts_type_idx ON public.payment_alerts(type);
CREATE INDEX IF NOT EXISTS payment_alerts_created_idx ON public.payment_alerts(created_at DESC);

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

ALTER TABLE public.payment_alerts ENABLE ROW LEVEL SECURITY;

-- Users can see their own alerts
DROP POLICY IF EXISTS payment_alerts_select_own ON public.payment_alerts;
CREATE POLICY payment_alerts_select_own
  ON public.payment_alerts FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can see all alerts
DROP POLICY IF EXISTS payment_alerts_select_admin ON public.payment_alerts;
CREATE POLICY payment_alerts_select_admin
  ON public.payment_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- Only service role can insert/update alerts
DROP POLICY IF EXISTS payment_alerts_modify_service ON public.payment_alerts;
CREATE POLICY payment_alerts_modify_service
  ON public.payment_alerts FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================

COMMENT ON TABLE payment_alerts IS 'Payment failure alerts and notification tracking';
COMMENT ON COLUMN payment_alerts.type IS 'Type of payment alert';
COMMENT ON COLUMN payment_alerts.email_sent IS 'Whether email notification was sent';
COMMENT ON COLUMN payment_alerts.sms_sent IS 'Whether SMS notification was sent';
COMMENT ON COLUMN payment_alerts.admin_notified IS 'Whether admins were notified';
