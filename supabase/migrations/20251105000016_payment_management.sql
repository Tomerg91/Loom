-- Payment Management for Clients
-- Sprint 03 - Task 2.3.3: Implement Payment Management (5 SP)
-- Client payment method management, history, and invoices

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    payment_type TEXT NOT NULL, -- 'card', 'bank_account'
    is_default BOOLEAN DEFAULT FALSE,
    card_brand TEXT, -- 'visa', 'mastercard', 'amex', etc.
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    billing_email TEXT,
    billing_name TEXT,
    billing_address JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT payment_methods_valid_type CHECK (payment_type IN ('card', 'bank_account')),
    CONSTRAINT payment_methods_valid_stripe_id CHECK (stripe_payment_method_id ~ '^pm_[a-zA-Z0-9]+$'),
    CONSTRAINT payment_methods_card_details CHECK (
        payment_type != 'card' OR (
            card_brand IS NOT NULL AND
            card_last4 IS NOT NULL AND
            card_exp_month IS NOT NULL AND
            card_exp_year IS NOT NULL
        )
    )
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES session_payments(id) ON DELETE SET NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'void'

    -- Line items
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,

    -- Payment details
    currency TEXT NOT NULL DEFAULT 'usd',
    paid_at TIMESTAMP WITH TIME ZONE,

    -- Additional info
    notes TEXT,
    pdf_url TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT invoices_valid_status CHECK (status IN ('draft', 'sent', 'paid', 'void')),
    CONSTRAINT invoices_valid_total CHECK (total_amount >= 0),
    CONSTRAINT invoices_due_after_invoice CHECK (due_date >= invoice_date)
);

-- Create payment_refunds table for tracking refund details
CREATE TABLE IF NOT EXISTS payment_refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID REFERENCES session_payments(id) ON DELETE CASCADE NOT NULL,
    stripe_refund_id TEXT NOT NULL UNIQUE,
    amount BIGINT NOT NULL, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'usd',
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'cancelled'
    failure_reason TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT payment_refunds_valid_amount CHECK (amount > 0),
    CONSTRAINT payment_refunds_valid_status CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe ON payment_methods(stripe_payment_method_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_session ON invoices(session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment ON payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_stripe ON payment_refunds(stripe_refund_id);

-- Function to add payment method
CREATE OR REPLACE FUNCTION add_payment_method(
    p_user_id UUID,
    p_stripe_payment_method_id TEXT,
    p_payment_type TEXT,
    p_card_brand TEXT DEFAULT NULL,
    p_card_last4 TEXT DEFAULT NULL,
    p_card_exp_month INTEGER DEFAULT NULL,
    p_card_exp_year INTEGER DEFAULT NULL,
    p_billing_email TEXT DEFAULT NULL,
    p_billing_name TEXT DEFAULT NULL,
    p_billing_address JSONB DEFAULT NULL,
    p_set_as_default BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_payment_method_id UUID;
    v_has_existing BOOLEAN;
BEGIN
    -- Check if user has existing payment methods
    SELECT EXISTS (
        SELECT 1 FROM payment_methods
        WHERE user_id = p_user_id
    ) INTO v_has_existing;

    -- If no existing methods, this becomes default
    IF NOT v_has_existing THEN
        p_set_as_default := TRUE;
    END IF;

    -- If setting as default, unset current default
    IF p_set_as_default THEN
        UPDATE payment_methods
        SET is_default = FALSE
        WHERE user_id = p_user_id
        AND is_default = TRUE;
    END IF;

    -- Insert new payment method
    INSERT INTO payment_methods (
        user_id,
        stripe_payment_method_id,
        payment_type,
        is_default,
        card_brand,
        card_last4,
        card_exp_month,
        card_exp_year,
        billing_email,
        billing_name,
        billing_address
    )
    VALUES (
        p_user_id,
        p_stripe_payment_method_id,
        p_payment_type,
        p_set_as_default,
        p_card_brand,
        p_card_last4,
        p_card_exp_month,
        p_card_exp_year,
        p_billing_email,
        p_billing_name,
        p_billing_address
    )
    RETURNING id INTO v_payment_method_id;

    RETURN v_payment_method_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set default payment method
CREATE OR REPLACE FUNCTION set_default_payment_method(
    p_user_id UUID,
    p_payment_method_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verify payment method belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM payment_methods
        WHERE id = p_payment_method_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Payment method not found or does not belong to user';
    END IF;

    -- Unset current default
    UPDATE payment_methods
    SET is_default = FALSE
    WHERE user_id = p_user_id
    AND is_default = TRUE;

    -- Set new default
    UPDATE payment_methods
    SET is_default = TRUE
    WHERE id = p_payment_method_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove payment method
CREATE OR REPLACE FUNCTION remove_payment_method(
    p_user_id UUID,
    p_payment_method_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_was_default BOOLEAN;
    v_remaining_count INTEGER;
BEGIN
    -- Check if this was the default method
    SELECT is_default INTO v_was_default
    FROM payment_methods
    WHERE id = p_payment_method_id
    AND user_id = p_user_id;

    IF v_was_default IS NULL THEN
        RAISE EXCEPTION 'Payment method not found or does not belong to user';
    END IF;

    -- Delete the payment method
    DELETE FROM payment_methods
    WHERE id = p_payment_method_id
    AND user_id = p_user_id;

    -- If it was default, set another as default
    IF v_was_default THEN
        SELECT COUNT(*) INTO v_remaining_count
        FROM payment_methods
        WHERE user_id = p_user_id;

        IF v_remaining_count > 0 THEN
            UPDATE payment_methods
            SET is_default = TRUE
            WHERE user_id = p_user_id
            AND id = (
                SELECT id FROM payment_methods
                WHERE user_id = p_user_id
                ORDER BY created_at DESC
                LIMIT 1
            );
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's payment methods
CREATE OR REPLACE FUNCTION get_user_payment_methods(
    p_user_id UUID
)
RETURNS TABLE (
    payment_method_id UUID,
    stripe_payment_method_id TEXT,
    payment_type TEXT,
    is_default BOOLEAN,
    card_brand TEXT,
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    billing_email TEXT,
    billing_name TEXT,
    is_expired BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pm.id AS payment_method_id,
        pm.stripe_payment_method_id,
        pm.payment_type,
        pm.is_default,
        pm.card_brand,
        pm.card_last4,
        pm.card_exp_month,
        pm.card_exp_year,
        pm.billing_email,
        pm.billing_name,
        CASE
            WHEN pm.payment_type = 'card' THEN
                (pm.card_exp_year < EXTRACT(YEAR FROM CURRENT_DATE))
                OR (
                    pm.card_exp_year = EXTRACT(YEAR FROM CURRENT_DATE)
                    AND pm.card_exp_month < EXTRACT(MONTH FROM CURRENT_DATE)
                )
            ELSE FALSE
        END AS is_expired,
        pm.created_at
    FROM payment_methods pm
    WHERE pm.user_id = p_user_id
    ORDER BY pm.is_default DESC, pm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_month TEXT;
    v_sequence INTEGER;
    v_invoice_number TEXT;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_month := TO_CHAR(CURRENT_DATE, 'MM');

    -- Get next sequence for this month
    SELECT COALESCE(MAX(
        SUBSTRING(invoice_number FROM '[0-9]+$')::INTEGER
    ), 0) + 1 INTO v_sequence
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || v_year || v_month || '%';

    v_invoice_number := 'INV-' || v_year || v_month || LPAD(v_sequence::TEXT, 4, '0');

    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create invoice for session payment
CREATE OR REPLACE FUNCTION create_session_invoice(
    p_session_id UUID,
    p_payment_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_user_id UUID;
    v_total_amount DECIMAL(10, 2);
BEGIN
    -- Get session and payment details
    SELECT s.client_id, sp.amount / 100.0
    INTO v_user_id, v_total_amount
    FROM sessions s
    JOIN session_payments sp ON sp.session_id = s.id
    WHERE s.id = p_session_id
    AND sp.id = p_payment_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Session or payment not found';
    END IF;

    -- Generate invoice number
    v_invoice_number := generate_invoice_number();

    -- Create invoice
    INSERT INTO invoices (
        invoice_number,
        user_id,
        session_id,
        payment_id,
        invoice_date,
        due_date,
        status,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        currency
    )
    VALUES (
        v_invoice_number,
        v_user_id,
        p_session_id,
        p_payment_id,
        CURRENT_DATE,
        CURRENT_DATE, -- Due immediately for session payments
        'paid',
        v_total_amount,
        0,
        0,
        v_total_amount,
        'usd'
    )
    RETURNING id INTO v_invoice_id;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user invoices
CREATE OR REPLACE FUNCTION get_user_invoices(
    p_user_id UUID,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    invoice_id UUID,
    invoice_number TEXT,
    invoice_date DATE,
    due_date DATE,
    status TEXT,
    total_amount DECIMAL(10, 2),
    currency TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    session_title TEXT,
    coach_name TEXT,
    pdf_url TEXT,
    is_overdue BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id AS invoice_id,
        i.invoice_number,
        i.invoice_date,
        i.due_date,
        i.status,
        i.total_amount,
        i.currency,
        i.paid_at,
        s.title AS session_title,
        (u.first_name || ' ' || COALESCE(u.last_name, ''))::TEXT AS coach_name,
        i.pdf_url,
        (i.due_date < CURRENT_DATE AND i.status != 'paid') AS is_overdue
    FROM invoices i
    LEFT JOIN sessions s ON s.id = i.session_id
    LEFT JOIN users u ON u.id = s.coach_id
    WHERE i.user_id = p_user_id
    AND (p_status IS NULL OR i.status = p_status)
    ORDER BY i.invoice_date DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get invoice details
CREATE OR REPLACE FUNCTION get_invoice_detail(
    p_invoice_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    invoice_detail JSON;
BEGIN
    -- Verify invoice belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM invoices
        WHERE id = p_invoice_id
        AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Invoice not found or access denied';
    END IF;

    SELECT json_build_object(
        'invoice', json_build_object(
            'id', i.id,
            'invoice_number', i.invoice_number,
            'invoice_date', i.invoice_date,
            'due_date', i.due_date,
            'status', i.status,
            'subtotal', i.subtotal,
            'tax_amount', i.tax_amount,
            'discount_amount', i.discount_amount,
            'total_amount', i.total_amount,
            'currency', i.currency,
            'paid_at', i.paid_at,
            'notes', i.notes,
            'pdf_url', i.pdf_url
        ),
        'session', CASE WHEN s.id IS NOT NULL THEN
            json_build_object(
                'id', s.id,
                'title', s.title,
                'scheduled_start', s.scheduled_start,
                'duration_minutes', EXTRACT(EPOCH FROM (s.scheduled_end - s.scheduled_start))::INTEGER / 60
            )
        ELSE NULL END,
        'coach', CASE WHEN coach.id IS NOT NULL THEN
            json_build_object(
                'id', coach.id,
                'name', coach.first_name || ' ' || COALESCE(coach.last_name, ''),
                'email', coach.email
            )
        ELSE NULL END,
        'client', json_build_object(
            'id', client.id,
            'name', client.first_name || ' ' || COALESCE(client.last_name, ''),
            'email', client.email
        ),
        'payment', CASE WHEN sp.id IS NOT NULL THEN
            json_build_object(
                'id', sp.id,
                'stripe_payment_intent_id', sp.stripe_payment_intent_id,
                'payment_method', sp.payment_method,
                'paid_at', sp.paid_at
            )
        ELSE NULL END
    ) INTO invoice_detail
    FROM invoices i
    INNER JOIN users client ON client.id = i.user_id
    LEFT JOIN sessions s ON s.id = i.session_id
    LEFT JOIN users coach ON coach.id = s.coach_id
    LEFT JOIN session_payments sp ON sp.id = i.payment_id
    WHERE i.id = p_invoice_id;

    RETURN invoice_detail;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payment summary for user
CREATE OR REPLACE FUNCTION get_user_payment_summary(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    summary JSON;
BEGIN
    v_start_date := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
    v_end_date := COALESCE(p_end_date, CURRENT_DATE);

    SELECT json_build_object(
        'period_start', v_start_date,
        'period_end', v_end_date,
        'total_spent', COALESCE(SUM(sp.amount), 0) / 100.0,
        'total_sessions', COUNT(DISTINCT s.id),
        'completed_sessions', COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed'),
        'average_session_cost', COALESCE(AVG(sp.amount), 0) / 100.0,
        'payment_methods_count', (
            SELECT COUNT(*) FROM payment_methods WHERE user_id = p_user_id
        ),
        'pending_invoices_count', (
            SELECT COUNT(*) FROM invoices
            WHERE user_id = p_user_id
            AND status != 'paid'
            AND due_date >= CURRENT_DATE
        ),
        'overdue_invoices_count', (
            SELECT COUNT(*) FROM invoices
            WHERE user_id = p_user_id
            AND status != 'paid'
            AND due_date < CURRENT_DATE
        )
    ) INTO summary
    FROM sessions s
    LEFT JOIN session_payments sp ON sp.session_id = s.id AND sp.status = 'succeeded'
    WHERE s.client_id = p_user_id
    AND s.scheduled_start::DATE >= v_start_date
    AND s.scheduled_start::DATE <= v_end_date;

    RETURN summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update payment_methods updated_at
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_methods_updated_at_trigger
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_methods_updated_at();

-- Trigger to update invoices updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at_trigger
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();

-- RLS Policies for payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment methods
CREATE POLICY payment_methods_select_own ON payment_methods
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own payment methods
CREATE POLICY payment_methods_insert_own ON payment_methods
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own payment methods
CREATE POLICY payment_methods_update_own ON payment_methods
    FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own payment methods
CREATE POLICY payment_methods_delete_own ON payment_methods
    FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their own invoices
CREATE POLICY invoices_select_own ON invoices
    FOR SELECT
    USING (user_id = auth.uid());

-- RLS Policies for payment_refunds
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;

-- Users can view refunds for their payments
CREATE POLICY payment_refunds_select_own ON payment_refunds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM session_payments sp
            JOIN sessions s ON s.id = sp.session_id
            WHERE sp.id = payment_id
            AND s.client_id = auth.uid()
        )
    );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_payment_method(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION set_default_payment_method(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_payment_method(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_payment_methods(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION create_session_invoice(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_invoices(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoice_detail(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_payment_summary(UUID, DATE, DATE) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE payment_methods IS 'User payment methods stored in Stripe';
COMMENT ON TABLE invoices IS 'Invoices for session payments';
COMMENT ON TABLE payment_refunds IS 'Refund tracking for payments';

COMMENT ON FUNCTION add_payment_method(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, JSONB, BOOLEAN) IS
    'Add new payment method for user';

COMMENT ON FUNCTION set_default_payment_method(UUID, UUID) IS
    'Set default payment method for user';

COMMENT ON FUNCTION remove_payment_method(UUID, UUID) IS
    'Remove payment method and auto-set new default if needed';

COMMENT ON FUNCTION get_user_payment_methods(UUID) IS
    'Get all payment methods for user with expiration status';

COMMENT ON FUNCTION create_session_invoice(UUID, UUID) IS
    'Create invoice for completed session payment';

COMMENT ON FUNCTION get_user_invoices(UUID, TEXT, INTEGER, INTEGER) IS
    'Get user invoices with filtering and pagination';

COMMENT ON FUNCTION get_invoice_detail(UUID, UUID) IS
    'Get comprehensive invoice details';

COMMENT ON FUNCTION get_user_payment_summary(UUID, DATE, DATE) IS
    'Get payment summary and statistics for user';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Payment management installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Payment method management (add, remove, set default)';
    RAISE NOTICE '  - Automatic default payment method handling';
    RAISE NOTICE '  - Card expiration detection';
    RAISE NOTICE '  - Invoice generation with unique numbers';
    RAISE NOTICE '  - Invoice detail retrieval';
    RAISE NOTICE '  - Payment summary and statistics';
    RAISE NOTICE '  - Refund tracking';
    RAISE NOTICE '  - Comprehensive RLS policies';
END $$;
