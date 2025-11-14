-- ============================================================================
-- Invoices Table
-- ============================================================================
-- This migration creates an invoices table for tracking billing records,
-- generating receipts, and providing financial transparency.
--
-- Key Changes:
-- 1. Create invoices table
-- 2. Link invoices to payments and subscriptions
-- 3. Add invoice generation functions
-- 4. Add receipt generation and delivery
-- ============================================================================

-- ============================================================================
-- 1. CREATE INVOICE STATUS ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'void', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. CREATE INVOICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE, -- Human-readable invoice number (e.g., INV-2024-001234)

  -- Relations
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  subscription_tier subscription_tier,

  -- Invoice Details
  status invoice_status NOT NULL DEFAULT 'pending',
  description TEXT,
  notes TEXT, -- Internal notes

  -- Amounts
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'ILS',

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE + INTERVAL '30 days',
  paid_date TIMESTAMPTZ,
  voided_date TIMESTAMPTZ,

  -- Billing Info
  billing_name TEXT,
  billing_email TEXT,
  billing_address JSONB, -- {street, city, state, zip, country}
  tax_id TEXT, -- VAT/Tax ID if applicable

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  pdf_url TEXT, -- URL to generated PDF receipt
  sent_at TIMESTAMPTZ, -- When invoice was emailed to customer

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS invoices_user_idx ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_payment_idx ON public.invoices(payment_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(status);
CREATE INDEX IF NOT EXISTS invoices_invoice_number_idx ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS invoices_issue_date_idx ON public.invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS invoices_due_date_idx ON public.invoices(due_date) WHERE status = 'pending';

-- ============================================================================
-- 4. INVOICE NUMBER SEQUENCE
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1;

/**
 * Generate next invoice number in format: INV-YYYY-NNNNNN
 */
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year TEXT;
  seq_num TEXT;
BEGIN
  year := TO_CHAR(CURRENT_DATE, 'YYYY');
  seq_num := LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
  RETURN 'INV-' || year || '-' || seq_num;
END;
$$;

-- ============================================================================
-- 5. INVOICE GENERATION FUNCTIONS
-- ============================================================================

/**
 * Create invoice from payment
 */
CREATE OR REPLACE FUNCTION create_invoice_from_payment(
  p_payment_id UUID,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_user_id UUID;
  v_amount_cents INTEGER;
  v_currency TEXT;
  v_subscription_tier subscription_tier;
  v_invoice_number TEXT;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get payment details
  SELECT
    user_id,
    amount_cents,
    currency
  INTO
    v_user_id,
    v_amount_cents,
    v_currency
  FROM payments
  WHERE id = p_payment_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found or has no user';
  END IF;

  -- Get user details
  SELECT email, full_name, subscription_tier
  INTO v_user_email, v_user_name, v_subscription_tier
  FROM users
  WHERE id = v_user_id;

  -- Generate invoice number
  v_invoice_number := generate_invoice_number();

  -- Create invoice
  INSERT INTO invoices (
    invoice_number,
    user_id,
    payment_id,
    subscription_tier,
    status,
    description,
    subtotal_cents,
    tax_cents,
    discount_cents,
    total_cents,
    currency,
    billing_name,
    billing_email,
    issue_date,
    due_date,
    paid_date
  ) VALUES (
    v_invoice_number,
    v_user_id,
    p_payment_id,
    v_subscription_tier,
    'paid',
    COALESCE(p_description, 'Subscription payment'),
    v_amount_cents,
    0, -- Tax calculation can be added here
    0,
    v_amount_cents,
    v_currency,
    v_user_name,
    v_user_email,
    CURRENT_DATE,
    CURRENT_DATE,
    NOW()
  ) RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

/**
 * Mark invoice as paid
 */
CREATE OR REPLACE FUNCTION mark_invoice_paid(
  p_invoice_id UUID,
  p_payment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invoices
  SET
    status = 'paid',
    paid_date = NOW(),
    payment_id = COALESCE(p_payment_id, payment_id),
    updated_at = NOW()
  WHERE id = p_invoice_id
    AND status != 'paid';

  RETURN FOUND;
END;
$$;

/**
 * Void an invoice
 */
CREATE OR REPLACE FUNCTION void_invoice(
  p_invoice_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invoices
  SET
    status = 'void',
    voided_date = NOW(),
    notes = COALESCE(notes || E'\n\n', '') || 'Voided: ' || COALESCE(p_reason, 'No reason provided'),
    updated_at = NOW()
  WHERE id = p_invoice_id
    AND status NOT IN ('paid', 'void');

  RETURN FOUND;
END;
$$;

/**
 * Get user's invoices
 */
CREATE OR REPLACE FUNCTION get_user_invoices(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  description TEXT,
  total_cents INTEGER,
  currency TEXT,
  status invoice_status,
  issue_date DATE,
  due_date DATE,
  paid_date TIMESTAMPTZ,
  pdf_url TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    invoice_number,
    description,
    total_cents,
    currency,
    status,
    issue_date,
    due_date,
    paid_date,
    pdf_url
  FROM invoices
  WHERE user_id = p_user_id
  ORDER BY issue_date DESC, created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

/**
 * Get invoice details
 */
CREATE OR REPLACE FUNCTION get_invoice_details(p_invoice_id UUID)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  user_id UUID,
  payment_id UUID,
  subscription_tier subscription_tier,
  status invoice_status,
  description TEXT,
  notes TEXT,
  subtotal_cents INTEGER,
  tax_cents INTEGER,
  discount_cents INTEGER,
  total_cents INTEGER,
  currency TEXT,
  issue_date DATE,
  due_date DATE,
  paid_date TIMESTAMPTZ,
  billing_name TEXT,
  billing_email TEXT,
  billing_address JSONB,
  tax_id TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, invoice_number, user_id, payment_id, subscription_tier,
    status, description, notes,
    subtotal_cents, tax_cents, discount_cents, total_cents, currency,
    issue_date, due_date, paid_date,
    billing_name, billing_email, billing_address, tax_id,
    pdf_url, created_at
  FROM invoices
  WHERE id = p_invoice_id;
$$;

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Users can read their own invoices
DROP POLICY IF EXISTS invoices_select_own ON public.invoices;
CREATE POLICY invoices_select_own
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all invoices
DROP POLICY IF EXISTS invoices_select_admin ON public.invoices;
CREATE POLICY invoices_select_admin
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- Only service role can create/update invoices
DROP POLICY IF EXISTS invoices_modify_service ON public.invoices;
CREATE POLICY invoices_modify_service
  ON public.invoices FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.invoices TO authenticated;
GRANT EXECUTE ON FUNCTION create_invoice_from_payment(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION mark_invoice_paid(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION void_invoice(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_invoices(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoice_details(UUID) TO authenticated;

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE invoices IS 'Customer invoices and receipts for payments';
COMMENT ON COLUMN invoices.invoice_number IS 'Human-readable invoice number (e.g., INV-2024-001234)';
COMMENT ON COLUMN invoices.pdf_url IS 'URL to generated PDF receipt';
COMMENT ON FUNCTION create_invoice_from_payment(UUID, TEXT) IS 'Create invoice from payment record';
COMMENT ON FUNCTION mark_invoice_paid(UUID, UUID) IS 'Mark invoice as paid';
COMMENT ON FUNCTION void_invoice(UUID, TEXT) IS 'Void an invoice with optional reason';
COMMENT ON FUNCTION get_user_invoices(UUID, INTEGER, INTEGER) IS 'Get paginated list of user invoices';
COMMENT ON FUNCTION get_invoice_details(UUID) IS 'Get detailed invoice information';
