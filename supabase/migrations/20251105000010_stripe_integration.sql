-- Stripe Payment Integration
-- Sprint 02 - Task 2.3.1: Set Up Stripe Integration (3 SP)
-- Database support for Stripe payment processing and webhooks

-- Create enum for Stripe webhook event types
CREATE TYPE stripe_webhook_event_type AS ENUM (
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'charge.refunded',
    'charge.dispute.created',
    'charge.dispute.closed',
    'customer.created',
    'customer.updated',
    'customer.deleted'
);

-- Create table to log Stripe webhook events
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type stripe_webhook_event_type NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT stripe_webhook_events_valid_event_id CHECK (LENGTH(stripe_event_id) > 0),
    CONSTRAINT stripe_webhook_events_max_retries CHECK (retry_count <= 5)
);

-- Create table for Stripe customer mappings
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    customer_email TEXT NOT NULL,
    default_payment_method_id TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT stripe_customers_valid_stripe_id CHECK (stripe_customer_id ~ '^cus_[a-zA-Z0-9]+$'),
    CONSTRAINT stripe_customers_valid_email CHECK (customer_email ~ '^[^@]+@[^@]+\.[^@]+$')
);

-- Add Stripe-specific columns to session_payments if not exists
DO $$
BEGIN
    -- Add stripe_checkout_session_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'session_payments' AND column_name = 'stripe_checkout_session_id'
    ) THEN
        ALTER TABLE session_payments
        ADD COLUMN stripe_checkout_session_id TEXT,
        ADD COLUMN stripe_payment_method_id TEXT,
        ADD COLUMN payment_metadata JSONB DEFAULT '{}'::JSONB;

        CREATE INDEX idx_session_payments_stripe_checkout
            ON session_payments(stripe_checkout_session_id)
            WHERE stripe_checkout_session_id IS NOT NULL;
    END IF;
END $$;

-- Create indexes for webhook processing
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed ON stripe_webhook_events(processed, created_at)
    WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_type ON stripe_webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

-- Function to get or create Stripe customer for user
CREATE OR REPLACE FUNCTION get_or_create_stripe_customer(
    p_user_id UUID,
    p_stripe_customer_id TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_stripe_customer_id TEXT;
    v_user_email TEXT;
BEGIN
    -- Try to get existing Stripe customer
    SELECT stripe_customer_id INTO v_stripe_customer_id
    FROM stripe_customers
    WHERE user_id = p_user_id;

    -- If found, return it
    IF v_stripe_customer_id IS NOT NULL THEN
        RETURN v_stripe_customer_id;
    END IF;

    -- If creating new, validate inputs
    IF p_stripe_customer_id IS NULL THEN
        RAISE EXCEPTION 'stripe_customer_id required for new customer';
    END IF;

    -- Get user email if not provided
    IF p_email IS NULL THEN
        SELECT email INTO v_user_email
        FROM users
        WHERE id = p_user_id;
    ELSE
        v_user_email := p_email;
    END IF;

    -- Create new Stripe customer record
    INSERT INTO stripe_customers (user_id, stripe_customer_id, customer_email)
    VALUES (p_user_id, p_stripe_customer_id, v_user_email)
    ON CONFLICT (user_id) DO UPDATE
    SET stripe_customer_id = p_stripe_customer_id,
        customer_email = v_user_email,
        updated_at = NOW()
    RETURNING stripe_customer_id INTO v_stripe_customer_id;

    RETURN v_stripe_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log Stripe webhook event
CREATE OR REPLACE FUNCTION log_stripe_webhook_event(
    p_stripe_event_id TEXT,
    p_event_type TEXT,
    p_event_data JSONB
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    -- Insert webhook event (ignore duplicates)
    INSERT INTO stripe_webhook_events (stripe_event_id, event_type, event_data)
    VALUES (p_stripe_event_id, p_event_type::stripe_webhook_event_type, p_event_data)
    ON CONFLICT (stripe_event_id) DO NOTHING
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process payment intent succeeded
CREATE OR REPLACE FUNCTION process_payment_intent_succeeded(
    p_stripe_payment_intent_id TEXT,
    p_amount_received BIGINT,
    p_payment_method_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Find the session payment
    SELECT session_id INTO v_session_id
    FROM session_payments
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id;

    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'Session payment not found for payment intent: %', p_stripe_payment_intent_id;
    END IF;

    -- Update payment status
    UPDATE session_payments
    SET
        status = 'succeeded',
        paid_at = NOW(),
        stripe_payment_method_id = COALESCE(p_payment_method_id, stripe_payment_method_id),
        updated_at = NOW()
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id;

    -- Update session status to scheduled if payment succeeded
    UPDATE sessions
    SET
        status = 'scheduled',
        updated_at = NOW()
    WHERE id = v_session_id
    AND status = 'pending_payment';

    -- Create notification for successful payment
    INSERT INTO notifications (
        user_id,
        title,
        message,
        notification_type,
        related_entity_type,
        related_entity_id
    )
    SELECT
        client_id,
        'Payment Successful',
        'Your payment for "' || title || '" has been processed successfully.',
        'payment_success',
        'session',
        id
    FROM sessions
    WHERE id = v_session_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process payment intent failed
CREATE OR REPLACE FUNCTION process_payment_intent_failed(
    p_stripe_payment_intent_id TEXT,
    p_failure_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Find the session payment
    SELECT session_id INTO v_session_id
    FROM session_payments
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id;

    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'Session payment not found for payment intent: %', p_stripe_payment_intent_id;
    END IF;

    -- Update payment status
    UPDATE session_payments
    SET
        status = 'failed',
        payment_metadata = payment_metadata || jsonb_build_object('failure_reason', p_failure_reason),
        updated_at = NOW()
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id;

    -- Create notification for failed payment
    INSERT INTO notifications (
        user_id,
        title,
        message,
        notification_type,
        related_entity_type,
        related_entity_id,
        priority
    )
    SELECT
        client_id,
        'Payment Failed',
        'Your payment for "' || title || '" could not be processed. Please update your payment method.',
        'payment_failed',
        'session',
        id,
        'high'
    FROM sessions
    WHERE id = v_session_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process refund
CREATE OR REPLACE FUNCTION process_stripe_refund(
    p_stripe_payment_intent_id TEXT,
    p_refund_amount BIGINT,
    p_refund_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_session_id UUID;
    v_client_id UUID;
BEGIN
    -- Find the session payment
    SELECT sp.session_id, s.client_id
    INTO v_session_id, v_client_id
    FROM session_payments sp
    JOIN sessions s ON s.id = sp.session_id
    WHERE sp.stripe_payment_intent_id = p_stripe_payment_intent_id;

    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'Session payment not found for payment intent: %', p_stripe_payment_intent_id;
    END IF;

    -- Update payment with refund information
    UPDATE session_payments
    SET
        status = 'refunded',
        refund_amount = p_refund_amount,
        refund_reason = p_refund_reason,
        refunded_at = NOW(),
        updated_at = NOW()
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id;

    -- Create notification for refund
    INSERT INTO notifications (
        user_id,
        title,
        message,
        notification_type,
        related_entity_type,
        related_entity_id
    )
    VALUES (
        v_client_id,
        'Refund Processed',
        'A refund of $' || (p_refund_amount::DECIMAL / 100)::TEXT || ' has been processed for your cancelled session.',
        'refund_processed',
        'session',
        v_session_id
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark webhook event as processed
CREATE OR REPLACE FUNCTION mark_webhook_event_processed(
    p_event_id UUID,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    IF p_success THEN
        UPDATE stripe_webhook_events
        SET
            processed = TRUE,
            processed_at = NOW()
        WHERE id = p_event_id;
    ELSE
        UPDATE stripe_webhook_events
        SET
            retry_count = retry_count + 1,
            processing_error = p_error_message
        WHERE id = p_event_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unprocessed webhook events
CREATE OR REPLACE FUNCTION get_unprocessed_webhook_events(
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    stripe_event_id TEXT,
    event_type stripe_webhook_event_type,
    event_data JSONB,
    retry_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.stripe_event_id,
        e.event_type,
        e.event_data,
        e.retry_count,
        e.created_at
    FROM stripe_webhook_events e
    WHERE e.processed = FALSE
    AND e.retry_count < 5
    ORDER BY e.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old webhook events
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events(
    p_days_old INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM stripe_webhook_events
    WHERE processed = TRUE
    AND processed_at < NOW() - (p_days_old || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update stripe_customers updated_at
CREATE OR REPLACE FUNCTION update_stripe_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stripe_customers_updated_at_trigger
    BEFORE UPDATE ON stripe_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_stripe_customers_updated_at();

-- RLS Policies for stripe_customers
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- Users can view their own Stripe customer data
CREATE POLICY stripe_customers_select_own ON stripe_customers
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only the system can insert/update Stripe customer data
CREATE POLICY stripe_customers_insert_system ON stripe_customers
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for stripe_webhook_events (admin only)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook events
CREATE POLICY stripe_webhook_events_admin_only ON stripe_webhook_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_stripe_customer(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_stripe_webhook_event(TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION process_payment_intent_succeeded(TEXT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION process_payment_intent_failed(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION process_stripe_refund(TEXT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION mark_webhook_event_processed(UUID, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_unprocessed_webhook_events(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_webhook_events(INTEGER) TO service_role;

-- Comments for documentation
COMMENT ON TABLE stripe_webhook_events IS 'Log of all Stripe webhook events for processing and audit';
COMMENT ON TABLE stripe_customers IS 'Mapping between users and Stripe customer IDs';

COMMENT ON FUNCTION get_or_create_stripe_customer(UUID, TEXT, TEXT) IS
    'Get existing or create new Stripe customer mapping for a user';

COMMENT ON FUNCTION log_stripe_webhook_event(TEXT, TEXT, JSONB) IS
    'Log a Stripe webhook event for processing';

COMMENT ON FUNCTION process_payment_intent_succeeded(TEXT, BIGINT, TEXT) IS
    'Process successful payment intent from Stripe webhook';

COMMENT ON FUNCTION process_payment_intent_failed(TEXT, TEXT) IS
    'Process failed payment intent from Stripe webhook';

COMMENT ON FUNCTION process_stripe_refund(TEXT, BIGINT, TEXT) IS
    'Process refund from Stripe webhook';

COMMENT ON FUNCTION mark_webhook_event_processed(UUID, BOOLEAN, TEXT) IS
    'Mark webhook event as processed or increment retry count on failure';

COMMENT ON FUNCTION get_unprocessed_webhook_events(INTEGER) IS
    'Get unprocessed webhook events for background processing';

COMMENT ON FUNCTION cleanup_old_webhook_events(INTEGER) IS
    'Clean up old processed webhook events';

-- Schedule cleanup of old webhook events (monthly)
SELECT cron.schedule(
    'cleanup-old-stripe-webhooks',
    '0 3 1 * *', -- 3 AM on the 1st of each month
    $$SELECT cleanup_old_webhook_events(90);$$
);

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Stripe integration installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Stripe customer mapping and management';
    RAISE NOTICE '  - Webhook event logging and processing';
    RAISE NOTICE '  - Payment intent success/failure handling';
    RAISE NOTICE '  - Refund processing and notifications';
    RAISE NOTICE '  - Automatic webhook event cleanup';
    RAISE NOTICE '  - RLS policies for data security';
END $$;
