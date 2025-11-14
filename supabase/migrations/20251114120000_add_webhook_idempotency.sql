-- ============================================================================
-- Webhook Idempotency Tracking
-- ============================================================================
-- This migration adds persistent idempotency tracking for payment webhooks
-- to prevent duplicate processing after server restarts.
--
-- Key Changes:
-- 1. Create webhook_events table for idempotency tracking
-- 2. Add indexes for efficient lookups
-- 3. Add cleanup function for old events
-- ============================================================================

-- ============================================================================
-- 1. CREATE WEBHOOK_EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'tranzila', 'stripe', etc.
  idempotency_key TEXT NOT NULL, -- Unique key for this webhook event
  event_type TEXT, -- 'payment.success', 'payment.failed', etc.
  transaction_id TEXT, -- Provider's transaction ID
  payload JSONB, -- Full webhook payload for debugging
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint to prevent duplicate webhook processing
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_idempotency_unique
  ON public.webhook_events(provider, idempotency_key);

-- Index for transaction ID lookups
CREATE INDEX IF NOT EXISTS webhook_events_transaction_idx
  ON public.webhook_events(provider, transaction_id)
  WHERE transaction_id IS NOT NULL;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS webhook_events_created_at_idx
  ON public.webhook_events(created_at);

-- ============================================================================
-- 2. CLEANUP FUNCTION
-- ============================================================================

/**
 * Clean up webhook events older than specified days
 * Keeps the last 90 days by default
 */
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_events
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

/**
 * Check if a webhook event has already been processed
 */
CREATE OR REPLACE FUNCTION is_webhook_processed(
  p_provider TEXT,
  p_idempotency_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM webhook_events
    WHERE provider = p_provider
      AND idempotency_key = p_idempotency_key
  ) INTO event_exists;

  RETURN event_exists;
END;
$$;

/**
 * Record a webhook event for idempotency tracking
 * Returns TRUE if successfully recorded, FALSE if already exists
 */
CREATE OR REPLACE FUNCTION record_webhook_event(
  p_provider TEXT,
  p_idempotency_key TEXT,
  p_event_type TEXT DEFAULT NULL,
  p_transaction_id TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO webhook_events (
    provider,
    idempotency_key,
    event_type,
    transaction_id,
    payload
  ) VALUES (
    p_provider,
    p_idempotency_key,
    p_event_type,
    p_transaction_id,
    p_payload
  );

  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    RETURN FALSE; -- Already processed
END;
$$;

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write webhook events
DROP POLICY IF EXISTS webhook_events_service_only ON public.webhook_events;
CREATE POLICY webhook_events_service_only
  ON public.webhook_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION cleanup_old_webhook_events(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION is_webhook_processed(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION record_webhook_event(TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================

COMMENT ON TABLE webhook_events IS 'Persistent idempotency tracking for payment webhooks';
COMMENT ON COLUMN webhook_events.idempotency_key IS 'Unique key for deduplication (e.g., txn_id:amount:timestamp)';
COMMENT ON FUNCTION cleanup_old_webhook_events(INTEGER) IS 'Remove webhook events older than specified days';
COMMENT ON FUNCTION is_webhook_processed(TEXT, TEXT) IS 'Check if a webhook has already been processed';
COMMENT ON FUNCTION record_webhook_event(TEXT, TEXT, TEXT, TEXT, JSONB) IS 'Record webhook event with idempotency protection';
