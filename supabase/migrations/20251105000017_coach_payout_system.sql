-- Coach Payout System with Stripe Connect
-- Sprint 03 - Task 2.3.4: Implement Coach Payout System (8 SP)
-- Stripe Connect integration for coach earnings and payouts

-- Create coach_stripe_accounts table for Stripe Connect
CREATE TABLE IF NOT EXISTS coach_stripe_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    stripe_account_id TEXT NOT NULL UNIQUE,
    account_type TEXT NOT NULL DEFAULT 'express', -- 'express', 'standard'
    account_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'rejected', 'restricted'
    onboarding_completed BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    country TEXT,
    currency TEXT DEFAULT 'usd',
    business_type TEXT, -- 'individual', 'company'
    business_name TEXT,
    support_email TEXT,
    support_phone TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT coach_stripe_accounts_valid_type CHECK (account_type IN ('express', 'standard')),
    CONSTRAINT coach_stripe_accounts_valid_status CHECK (account_status IN ('pending', 'active', 'rejected', 'restricted')),
    CONSTRAINT coach_stripe_accounts_valid_stripe_id CHECK (stripe_account_id ~ '^acct_[a-zA-Z0-9]+$')
);

-- Create coach_payouts table for tracking payouts
CREATE TABLE IF NOT EXISTS coach_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    stripe_payout_id TEXT NOT NULL UNIQUE,
    amount BIGINT NOT NULL, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'cancelled'
    arrival_date DATE,
    description TEXT,
    failure_message TEXT,
    payout_method TEXT DEFAULT 'standard', -- 'standard', 'instant'
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT coach_payouts_valid_amount CHECK (amount > 0),
    CONSTRAINT coach_payouts_valid_status CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    CONSTRAINT coach_payouts_valid_stripe_id CHECK (stripe_payout_id ~ '^po_[a-zA-Z0-9]+$')
);

-- Create coach_earnings table for detailed earnings tracking
CREATE TABLE IF NOT EXISTS coach_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES session_payments(id) ON DELETE SET NULL,
    earning_date DATE NOT NULL DEFAULT CURRENT_DATE,
    gross_amount BIGINT NOT NULL, -- Amount before platform fee (in cents)
    platform_fee BIGINT NOT NULL, -- Platform fee (in cents)
    net_amount BIGINT NOT NULL, -- Amount after platform fee (in cents)
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'available', 'paid'
    payout_id UUID REFERENCES coach_payouts(id) ON DELETE SET NULL,
    available_on DATE, -- When funds become available for payout
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT coach_earnings_valid_amounts CHECK (
        gross_amount > 0 AND
        platform_fee >= 0 AND
        net_amount > 0 AND
        gross_amount = platform_fee + net_amount
    ),
    CONSTRAINT coach_earnings_valid_status CHECK (status IN ('pending', 'available', 'paid'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coach_stripe_accounts_coach ON coach_stripe_accounts(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_stripe_accounts_stripe_id ON coach_stripe_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_coach_stripe_accounts_status ON coach_stripe_accounts(account_status);

CREATE INDEX IF NOT EXISTS idx_coach_payouts_coach ON coach_payouts(coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_payouts_stripe_id ON coach_payouts(stripe_payout_id);
CREATE INDEX IF NOT EXISTS idx_coach_payouts_status ON coach_payouts(status);

CREATE INDEX IF NOT EXISTS idx_coach_earnings_coach ON coach_earnings(coach_id, earning_date DESC);
CREATE INDEX IF NOT EXISTS idx_coach_earnings_session ON coach_earnings(session_id);
CREATE INDEX IF NOT EXISTS idx_coach_earnings_status ON coach_earnings(status);
CREATE INDEX IF NOT EXISTS idx_coach_earnings_available ON coach_earnings(available_on) WHERE status = 'available';

-- Function to create Stripe Connect account record
CREATE OR REPLACE FUNCTION create_coach_stripe_account(
    p_coach_id UUID,
    p_stripe_account_id TEXT,
    p_account_type TEXT DEFAULT 'express',
    p_country TEXT DEFAULT 'US',
    p_currency TEXT DEFAULT 'usd'
)
RETURNS UUID AS $$
DECLARE
    v_account_id UUID;
BEGIN
    -- Verify user is a coach
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE id = p_coach_id
        AND role = 'coach'
    ) THEN
        RAISE EXCEPTION 'User is not a coach';
    END IF;

    -- Create or update Stripe account record
    INSERT INTO coach_stripe_accounts (
        coach_id,
        stripe_account_id,
        account_type,
        country,
        currency
    )
    VALUES (
        p_coach_id,
        p_stripe_account_id,
        p_account_type,
        p_country,
        p_currency
    )
    ON CONFLICT (coach_id)
    DO UPDATE SET
        stripe_account_id = p_stripe_account_id,
        account_type = p_account_type,
        country = p_country,
        currency = p_currency,
        updated_at = NOW()
    RETURNING id INTO v_account_id;

    RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update Stripe Connect account status
CREATE OR REPLACE FUNCTION update_coach_stripe_account_status(
    p_stripe_account_id TEXT,
    p_account_status TEXT,
    p_onboarding_completed BOOLEAN DEFAULT NULL,
    p_charges_enabled BOOLEAN DEFAULT NULL,
    p_payouts_enabled BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE coach_stripe_accounts
    SET
        account_status = p_account_status,
        onboarding_completed = COALESCE(p_onboarding_completed, onboarding_completed),
        charges_enabled = COALESCE(p_charges_enabled, charges_enabled),
        payouts_enabled = COALESCE(p_payouts_enabled, payouts_enabled),
        updated_at = NOW()
    WHERE stripe_account_id = p_stripe_account_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record coach earnings from session payment
CREATE OR REPLACE FUNCTION record_coach_earning(
    p_session_id UUID,
    p_payment_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_earning_id UUID;
    v_coach_id UUID;
    v_gross_amount BIGINT;
    v_platform_fee_percent DECIMAL(5, 2) := 10.0; -- 10% platform fee
    v_platform_fee BIGINT;
    v_net_amount BIGINT;
    v_available_on DATE;
BEGIN
    -- Get session and payment details
    SELECT s.coach_id, sp.amount
    INTO v_coach_id, v_gross_amount
    FROM sessions s
    INNER JOIN session_payments sp ON sp.session_id = s.id
    WHERE s.id = p_session_id
    AND sp.id = p_payment_id
    AND sp.status = 'succeeded';

    IF v_coach_id IS NULL THEN
        RAISE EXCEPTION 'Session or payment not found or payment not successful';
    END IF;

    -- Calculate platform fee and net amount
    v_platform_fee := (v_gross_amount * v_platform_fee_percent / 100)::BIGINT;
    v_net_amount := v_gross_amount - v_platform_fee;

    -- Earnings available after 2 days (Stripe standard)
    v_available_on := CURRENT_DATE + INTERVAL '2 days';

    -- Create earning record
    INSERT INTO coach_earnings (
        coach_id,
        session_id,
        payment_id,
        earning_date,
        gross_amount,
        platform_fee,
        net_amount,
        status,
        available_on
    )
    VALUES (
        v_coach_id,
        p_session_id,
        p_payment_id,
        CURRENT_DATE,
        v_gross_amount,
        v_platform_fee,
        v_net_amount,
        'pending',
        v_available_on
    )
    RETURNING id INTO v_earning_id;

    RETURN v_earning_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark earnings as available for payout
CREATE OR REPLACE FUNCTION mark_earnings_available()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE coach_earnings
    SET status = 'available'
    WHERE status = 'pending'
    AND available_on <= CURRENT_DATE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get coach earnings dashboard
CREATE OR REPLACE FUNCTION get_coach_earnings_dashboard(
    p_coach_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    dashboard JSON;
BEGIN
    v_start_date := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
    v_end_date := COALESCE(p_end_date, CURRENT_DATE);

    SELECT json_build_object(
        'period_start', v_start_date,
        'period_end', v_end_date,

        -- Total earnings
        'total_gross_earnings', COALESCE(SUM(gross_amount), 0) / 100.0,
        'total_platform_fees', COALESCE(SUM(platform_fee), 0) / 100.0,
        'total_net_earnings', COALESCE(SUM(net_amount), 0) / 100.0,

        -- Available balance
        'available_balance', (
            SELECT COALESCE(SUM(net_amount), 0) / 100.0
            FROM coach_earnings
            WHERE coach_id = p_coach_id
            AND status = 'available'
        ),

        -- Pending earnings
        'pending_balance', (
            SELECT COALESCE(SUM(net_amount), 0) / 100.0
            FROM coach_earnings
            WHERE coach_id = p_coach_id
            AND status = 'pending'
        ),

        -- Session stats
        'total_sessions', COUNT(DISTINCT session_id),
        'average_session_earnings', COALESCE(AVG(net_amount), 0) / 100.0,

        -- Stripe account status
        'stripe_account', (
            SELECT json_build_object(
                'account_id', stripe_account_id,
                'account_status', account_status,
                'onboarding_completed', onboarding_completed,
                'payouts_enabled', payouts_enabled
            )
            FROM coach_stripe_accounts
            WHERE coach_id = p_coach_id
        ),

        -- Recent payouts
        'recent_payouts_count', (
            SELECT COUNT(*)
            FROM coach_payouts
            WHERE coach_id = p_coach_id
            AND status = 'paid'
            AND created_at >= v_start_date
        ),

        'total_paid_out', (
            SELECT COALESCE(SUM(amount), 0) / 100.0
            FROM coach_payouts
            WHERE coach_id = p_coach_id
            AND status = 'paid'
            AND created_at >= v_start_date
        )

    ) INTO dashboard
    FROM coach_earnings
    WHERE coach_id = p_coach_id
    AND earning_date >= v_start_date
    AND earning_date <= v_end_date;

    RETURN dashboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get coach earnings history
CREATE OR REPLACE FUNCTION get_coach_earnings_history(
    p_coach_id UUID,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    earning_id UUID,
    earning_date DATE,
    session_id UUID,
    session_title TEXT,
    client_name TEXT,
    gross_amount DECIMAL(10, 2),
    platform_fee DECIMAL(10, 2),
    net_amount DECIMAL(10, 2),
    status TEXT,
    available_on DATE,
    payout_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id AS earning_id,
        ce.earning_date,
        ce.session_id,
        s.title AS session_title,
        (u.first_name || ' ' || COALESCE(u.last_name, ''))::TEXT AS client_name,
        (ce.gross_amount / 100.0)::DECIMAL(10, 2) AS gross_amount,
        (ce.platform_fee / 100.0)::DECIMAL(10, 2) AS platform_fee,
        (ce.net_amount / 100.0)::DECIMAL(10, 2) AS net_amount,
        ce.status,
        ce.available_on,
        ce.payout_id
    FROM coach_earnings ce
    LEFT JOIN sessions s ON s.id = ce.session_id
    LEFT JOIN users u ON u.id = s.client_id
    WHERE ce.coach_id = p_coach_id
    AND (p_status IS NULL OR ce.status = p_status)
    ORDER BY ce.earning_date DESC, ce.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get coach payout history
CREATE OR REPLACE FUNCTION get_coach_payout_history(
    p_coach_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    payout_id UUID,
    stripe_payout_id TEXT,
    amount DECIMAL(10, 2),
    currency TEXT,
    status TEXT,
    arrival_date DATE,
    description TEXT,
    failure_message TEXT,
    earnings_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.id AS payout_id,
        cp.stripe_payout_id,
        (cp.amount / 100.0)::DECIMAL(10, 2) AS amount,
        cp.currency,
        cp.status,
        cp.arrival_date,
        cp.description,
        cp.failure_message,
        (
            SELECT COUNT(*)::INTEGER
            FROM coach_earnings ce
            WHERE ce.payout_id = cp.id
        ) AS earnings_count,
        cp.created_at
    FROM coach_payouts cp
    WHERE cp.coach_id = p_coach_id
    ORDER BY cp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payout details with included earnings
CREATE OR REPLACE FUNCTION get_payout_detail(
    p_payout_id UUID,
    p_coach_id UUID
)
RETURNS JSON AS $$
DECLARE
    payout_detail JSON;
BEGIN
    -- Verify payout belongs to coach
    IF NOT EXISTS (
        SELECT 1 FROM coach_payouts
        WHERE id = p_payout_id
        AND coach_id = p_coach_id
    ) THEN
        RAISE EXCEPTION 'Payout not found or access denied';
    END IF;

    SELECT json_build_object(
        'payout', json_build_object(
            'id', cp.id,
            'stripe_payout_id', cp.stripe_payout_id,
            'amount', cp.amount / 100.0,
            'currency', cp.currency,
            'status', cp.status,
            'arrival_date', cp.arrival_date,
            'description', cp.description,
            'failure_message', cp.failure_message,
            'created_at', cp.created_at
        ),
        'earnings', (
            SELECT COALESCE(json_agg(json_build_object(
                'earning_id', ce.id,
                'session_id', ce.session_id,
                'session_title', s.title,
                'earning_date', ce.earning_date,
                'net_amount', ce.net_amount / 100.0,
                'platform_fee', ce.platform_fee / 100.0
            ) ORDER BY ce.earning_date DESC), '[]'::json)
            FROM coach_earnings ce
            LEFT JOIN sessions s ON s.id = ce.session_id
            WHERE ce.payout_id = cp.id
        ),
        'earnings_count', (
            SELECT COUNT(*)
            FROM coach_earnings ce
            WHERE ce.payout_id = cp.id
        )
    ) INTO payout_detail
    FROM coach_payouts cp
    WHERE cp.id = p_payout_id;

    RETURN payout_detail;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get coach Stripe account onboarding status
CREATE OR REPLACE FUNCTION get_coach_stripe_onboarding_status(
    p_coach_id UUID
)
RETURNS JSON AS $$
DECLARE
    onboarding_status JSON;
BEGIN
    SELECT json_build_object(
        'has_account', EXISTS (
            SELECT 1 FROM coach_stripe_accounts
            WHERE coach_id = p_coach_id
        ),
        'account', (
            SELECT json_build_object(
                'stripe_account_id', stripe_account_id,
                'account_status', account_status,
                'onboarding_completed', onboarding_completed,
                'charges_enabled', charges_enabled,
                'payouts_enabled', payouts_enabled,
                'country', country,
                'currency', currency
            )
            FROM coach_stripe_accounts
            WHERE coach_id = p_coach_id
        ),
        'needs_onboarding', NOT EXISTS (
            SELECT 1 FROM coach_stripe_accounts
            WHERE coach_id = p_coach_id
            AND onboarding_completed = TRUE
        ),
        'can_receive_payouts', EXISTS (
            SELECT 1 FROM coach_stripe_accounts
            WHERE coach_id = p_coach_id
            AND payouts_enabled = TRUE
        )
    ) INTO onboarding_status;

    RETURN onboarding_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically create earnings when payment succeeds
CREATE OR REPLACE FUNCTION auto_create_coach_earning()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create earning when payment status changes to 'succeeded'
    IF NEW.status = 'succeeded' AND (OLD.status IS NULL OR OLD.status != 'succeeded') THEN
        PERFORM record_coach_earning(NEW.session_id, NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic earning creation
DROP TRIGGER IF EXISTS session_payments_create_earning_trigger ON session_payments;
CREATE TRIGGER session_payments_create_earning_trigger
    AFTER INSERT OR UPDATE ON session_payments
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_coach_earning();

-- Schedule daily job to mark earnings as available
SELECT cron.schedule(
    'mark-earnings-available',
    '0 1 * * *', -- 1 AM daily
    $$SELECT mark_earnings_available();$$
);

-- Trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_coach_stripe_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coach_stripe_accounts_updated_at_trigger
    BEFORE UPDATE ON coach_stripe_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_stripe_accounts_updated_at();

CREATE OR REPLACE FUNCTION update_coach_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coach_payouts_updated_at_trigger
    BEFORE UPDATE ON coach_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_payouts_updated_at();

-- RLS Policies for coach_stripe_accounts
ALTER TABLE coach_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own Stripe account
CREATE POLICY coach_stripe_accounts_select_own ON coach_stripe_accounts
    FOR SELECT
    USING (coach_id = auth.uid());

-- RLS Policies for coach_payouts
ALTER TABLE coach_payouts ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own payouts
CREATE POLICY coach_payouts_select_own ON coach_payouts
    FOR SELECT
    USING (coach_id = auth.uid());

-- RLS Policies for coach_earnings
ALTER TABLE coach_earnings ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own earnings
CREATE POLICY coach_earnings_select_own ON coach_earnings
    FOR SELECT
    USING (coach_id = auth.uid());

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_coach_stripe_account(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_coach_stripe_account_status(TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION record_coach_earning(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_earnings_available() TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_earnings_dashboard(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_earnings_history(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_payout_history(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payout_detail(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_stripe_onboarding_status(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE coach_stripe_accounts IS 'Stripe Connect accounts for coach payouts';
COMMENT ON TABLE coach_payouts IS 'Payout history for coaches';
COMMENT ON TABLE coach_earnings IS 'Detailed earnings tracking per session';

COMMENT ON FUNCTION create_coach_stripe_account(UUID, TEXT, TEXT, TEXT, TEXT) IS
    'Create or update Stripe Connect account for coach';

COMMENT ON FUNCTION update_coach_stripe_account_status(TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) IS
    'Update Stripe Connect account status from webhook';

COMMENT ON FUNCTION record_coach_earning(UUID, UUID) IS
    'Record coach earning from successful session payment';

COMMENT ON FUNCTION mark_earnings_available() IS
    'Mark pending earnings as available when hold period expires';

COMMENT ON FUNCTION get_coach_earnings_dashboard(UUID, DATE, DATE) IS
    'Get comprehensive earnings dashboard with statistics';

COMMENT ON FUNCTION get_coach_earnings_history(UUID, TEXT, INTEGER, INTEGER) IS
    'Get detailed earnings history with session information';

COMMENT ON FUNCTION get_coach_payout_history(UUID, INTEGER, INTEGER) IS
    'Get payout history for coach';

COMMENT ON FUNCTION get_payout_detail(UUID, UUID) IS
    'Get detailed payout information with included earnings';

COMMENT ON FUNCTION get_coach_stripe_onboarding_status(UUID) IS
    'Get Stripe Connect onboarding status for coach';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Coach payout system installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Stripe Connect account management';
    RAISE NOTICE '  - Automatic earning creation from payments';
    RAISE NOTICE '  - Platform fee calculation (10%)';
    RAISE NOTICE '  - Earnings availability tracking';
    RAISE NOTICE '  - Comprehensive earnings dashboard';
    RAISE NOTICE '  - Payout history and details';
    RAISE NOTICE '  - Onboarding status tracking';
    RAISE NOTICE '  - Daily job to mark earnings available';
    RAISE NOTICE '  - Automatic earning creation trigger';
    RAISE NOTICE '  - Full revenue cycle complete!';
END $$;
