# Loom Database Schema Review: Sessions, Payments, and Messaging

## Executive Summary

- The Supabase schema already ships with robust foundations for core coaching workflows, including session scheduling, structured messaging, and payment capture metadata.
- Key gaps remain around **billing workflows**, **group session support**, and **rich conversation context**, which are essential for an end-to-end production launch.
- This document inventories the existing schema, highlights gaps, and proposes a set of additive tables, enums, and relationships that complete the design for sessions, payments, and messaging without breaking backwards compatibility.

## Methodology

1. Reviewed Supabase migrations to understand the current domain models and constraints.
2. Catalogued existing enums, tables, and triggers for the three focus areas.
3. Identified functional gaps versus the product requirements (session lifecycle management, payments lifecycle, team chat).
4. Drafted SQL-ready DDL snippets for the missing entities, with an emphasis on reuse of existing primitives and maintainable RLS policies.

## Current State Assessment

### Sessions Domain

- **Sessions core table**: Stores coach/client pairing, scheduling metadata, and lifecycle status. 【F:supabase/migrations/20250704000001_initial_schema.sql†L27-L45】
- **Supportive artifacts**: Coach notes, client reflections, and availability calendars extend the session experience. 【F:supabase/migrations/20250704000001_initial_schema.sql†L47-L107】
- **Enhancements**: Additional status `no_show` and indexing improvements already exist. 【F:supabase/migrations/20250817000001_database_completeness_enhancement.sql†L5-L33】

**Identified Gaps**

- No structure for **group sessions or additional attendees** beyond the single client.
- Billing metadata (price, currency, billing status) is not stored on sessions, blocking reconciliation.
- No linkage between sessions and invoices/payments, limiting revenue analytics.

### Messaging Domain

- **Conversations & participants** capture direct and group threads with soft-deletion semantics. 【F:supabase/migrations/20250809000001_messaging_system.sql†L10-L37】
- **Messages, reactions, attachments, receipts**, and **typing indicators** deliver a feature-rich chat experience with supporting triggers. 【F:supabase/migrations/20250809000001_messaging_system.sql†L39-L196】

**Identified Gaps**

- Conversations lack **context linkage** (e.g., session/thread association) making it difficult to surface chat history in-session.
- Delivery state tracking across channels (in-app, email, push) is not persisted, complicating troubleshooting.
- No explicit representation of **user mentions** or message-level metadata for compliance (e.g., deletion audits).

### Payments Domain

- A base `payments` table tracks transaction metadata and idempotency for Tranzila and future providers. 【F:supabase/migrations/20250906120000_add_payments.sql†L1-L45】

**Identified Gaps**

- Status is modeled as free-form text; no enum safeguards exist for the payments lifecycle.
- Missing entities for **payment intents**, **payment methods**, and **refunds**, which are required by providers like Stripe or manual reconciliation.
- Lack of invoice or line-item structure prevents bundling multiple sessions or add-ons into a single charge.

## Proposed Schema Extensions

The following SQL snippets complete the data model. They are ordered to avoid dependency issues and designed to be applied in a single migration file.

> **Note:** Column defaults and constraints mirror existing conventions (UUID primary keys, `NOW()` timestamps, JSONB metadata). Where RLS policies are not yet authored, tables are locked down to service roles, preserving security until application-layer access patterns are finalized.

### 1. Shared Enums

```sql
-- Sessions
CREATE TYPE session_billing_status AS ENUM ('unbilled', 'awaiting_payment', 'paid', 'written_off');
CREATE TYPE session_attendee_role AS ENUM ('client', 'coach', 'guest');
CREATE TYPE session_attendee_status AS ENUM ('invited', 'confirmed', 'declined', 'checked_in');

-- Payments
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'canceled', 'refunded');
CREATE TYPE payment_intent_status AS ENUM ('requires_payment_method', 'requires_confirmation', 'processing', 'succeeded', 'canceled');
CREATE TYPE payment_method_type AS ENUM ('credit_card', 'bank_transfer', 'cash', 'voucher', 'other');
CREATE TYPE refund_status AS ENUM ('pending', 'processing', 'succeeded', 'failed');

-- Messaging
CREATE TYPE conversation_context_type AS ENUM ('general', 'session', 'program');
CREATE TYPE message_delivery_channel AS ENUM ('in_app', 'email', 'push');
CREATE TYPE message_delivery_status AS ENUM ('pending', 'sent', 'failed');
```

### 2. Sessions Enhancements

```sql
CREATE TABLE session_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  default_duration_minutes INTEGER NOT NULL CHECK (default_duration_minutes > 0),
  default_price_cents INTEGER CHECK (default_price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'ILS',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sessions
  ADD COLUMN template_id UUID REFERENCES session_templates(id) ON DELETE SET NULL,
  ADD COLUMN location TEXT,
  ADD COLUMN price_cents INTEGER CHECK (price_cents >= 0),
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'ILS',
  ADD COLUMN billing_status session_billing_status NOT NULL DEFAULT 'unbilled',
  ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN cancellation_reason TEXT;

CREATE TABLE session_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  role session_attendee_role NOT NULL DEFAULT 'guest',
  status session_attendee_status NOT NULL DEFAULT 'invited',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, user_id, role)
);

ALTER TABLE session_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY session_attendees_service_only ON session_attendees FOR ALL USING (false) WITH CHECK (false);
```

### 3. Payments Enhancements

```sql
ALTER TABLE payments
  ALTER COLUMN status TYPE payment_status USING status::payment_status,
  ADD COLUMN session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'ILS',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type payment_method_type NOT NULL,
  provider TEXT NOT NULL,
  provider_method_id TEXT,
  last4 TEXT,
  exp_month INTEGER CHECK (exp_month BETWEEN 1 AND 12),
  exp_year INTEGER,
  brand TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider, provider_method_id)
);

CREATE TABLE payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'ILS',
  status payment_intent_status NOT NULL DEFAULT 'requires_payment_method',
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  client_secret TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payments
  ADD COLUMN intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
  ADD COLUMN method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL;

CREATE TABLE payment_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status refund_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  provider_refund_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;

-- Service-role only access until dedicated policies are authored
CREATE POLICY invoices_service_only ON invoices FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY invoice_line_items_service_only ON invoice_line_items FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY payment_methods_service_only ON payment_methods FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY payment_intents_service_only ON payment_intents FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY payment_line_items_service_only ON payment_line_items FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY payment_refunds_service_only ON payment_refunds FOR ALL USING (false) WITH CHECK (false);
```

### 4. Messaging Enhancements

```sql
CREATE TABLE conversation_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE UNIQUE,
  context_type conversation_context_type NOT NULL DEFAULT 'general',
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE message_delivery_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  channel message_delivery_channel NOT NULL,
  status message_delivery_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, channel)
);

CREATE TABLE message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, mentioned_user_id)
);

ALTER TABLE conversation_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_delivery_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_contexts_service_only ON conversation_contexts FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY message_delivery_states_service_only ON message_delivery_states FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY message_mentions_service_only ON message_mentions FOR ALL USING (false) WITH CHECK (false);
```

## Rollout Considerations

1. **Backfilling Data**: The migration should backfill `sessions.billing_status`, `sessions.currency`, and `payments.status` where legacy data exists before casting to enums.
2. **RLS Policies**: After functional testing, replace the placeholder service-role policies with fine-grained rules mirroring existing patterns.
3. **Application Updates**: API handlers must be updated to populate the new columns/tables, especially for booking flows, payment processing callbacks, and messaging notifications.
4. **Analytics**: The new tables unlock richer reporting (e.g., revenue per session template, delivery success rates). Create downstream materialized views as needed.

## Next Steps

- Implement the migration using the provided DDL and add automated tests covering booking with multiple attendees, invoice generation, and message delivery logging.
- Coordinate with the payments provider integration to map provider-specific statuses to the new enums.
- Update documentation and API schemas to surface the new relationships for frontend consumption.
