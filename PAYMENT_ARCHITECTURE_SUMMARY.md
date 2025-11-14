# Payment and Billing Architecture Summary

## Quick Overview

The Loom platform has a **foundational but incomplete** payment system. Here's what you have:

### What's Working
- Tranzila payment gateway integration (webhooks + signature verification)
- Basic payment transaction tracking (database)
- Subscription tier system (free/basic/professional/enterprise)
- Resource library access gating by subscription
- Authentication with role-based access control

### What's Missing
- Subscription plans definition
- Invoice generation
- Refund processing
- Subscription management (upgrades, cancellations)
- Payment method storage
- Tax/VAT handling
- Billing history and analytics
- Comprehensive error handling
- User-facing billing UI

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Loom Payment System                       │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Frontend (React/Next.js)                                         │
├─────────────────────────────────────────────────────────────────┤
│  • Payment initiation form                                       │
│  • Payment return page (basic)                                   │
│  • [MISSING] Subscription management UI                          │
│  • [MISSING] Billing history UI                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ API Routes (Next.js)                                             │
├─────────────────────────────────────────────────────────────────┤
│  • POST /api/payments/tranzila/session (Create payment)          │
│  • POST /api/payments/tranzila/notify (Webhook handler)          │
│  • [MISSING] Subscription management endpoints                   │
│  • [MISSING] Invoice endpoints                                   │
│  • [MISSING] Refund endpoints                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Business Logic Layer (Service Classes)                           │
├─────────────────────────────────────────────────────────────────┤
│  ✓ PaymentService (CRUD operations)                              │
│  [MISSING] SubscriptionService                                   │
│  [MISSING] InvoiceService                                        │
│  [MISSING] RefundService                                         │
│  [MISSING] BillingService                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Payment Gateway (Tranzila)                                       │
├─────────────────────────────────────────────────────────────────┤
│  • Secure payment iframe: https://secure5.tranzila.com          │
│  • Webhook signature verification                                │
│  • IPN (Instant Payment Notification) callbacks                  │
│  • Support for multiple currencies (currently: ILS)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Database (Supabase PostgreSQL)                                   │
├─────────────────────────────────────────────────────────────────┤
│  ✓ users (with subscription fields)                              │
│    - subscription_tier (enum)                                    │
│    - subscription_expires_at                                     │
│    - subscription_started_at                                     │
│    - subscription_metadata (JSONB)                               │
│  ✓ payments (transaction records)                                │
│    - amount_cents, currency                                      │
│    - status, provider, provider_transaction_id                   │
│    - metadata, raw_payload                                       │
│  [MISSING] subscription_plans                                    │
│  [MISSING] invoices                                              │
│  [MISSING] invoice_line_items                                    │
│  [MISSING] refunds                                               │
│  [MISSING] payment_methods                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Payment Flow

```
User → Frontend
  ↓ (clicks Pay)
  ├─ POST /api/payments/tranzila/session
  ├─ { amount, description, locale }
  ↓
API Route
  ├─ Authenticate user
  ├─ Create pending payment record
  ├─ Build Tranzila secure URL
  ↓
Frontend
  ├─ Open Tranzila payment iframe
  ├─ User enters card details [EXTERNAL]
  ↓
Tranzila
  ├─ Processes payment
  ├─ Redirects to /payments/return?status=success
  ├─ Sends webhook to /api/payments/tranzila/notify
  ↓
Webhook Handler
  ├─ Verify signature
  ├─ Check idempotency
  ├─ Update payment status to 'paid'
  ├─ [MISSING] Update subscription_tier on user
  ├─ [MISSING] Create invoice
  ├─ [MISSING] Send confirmation email
  ↓
User
  └─ Sees confirmation page (currently minimal)
```

---

## Database Schema (Simplified)

### users table (relevant fields)
```sql
id UUID PRIMARY KEY
email TEXT
role ENUM ('client', 'coach', 'admin')
subscription_tier ENUM ('free', 'basic', 'professional', 'enterprise')
subscription_expires_at TIMESTAMPTZ
subscription_started_at TIMESTAMPTZ
subscription_metadata JSONB
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### payments table
```sql
id UUID PRIMARY KEY
user_id UUID → users(id)
amount_cents INTEGER (stored as cents)
currency TEXT ('ILS')
status TEXT ('pending', 'paid', 'failed', 'canceled')
provider TEXT ('tranzila')
provider_transaction_id TEXT UNIQUE
idempotency_key TEXT UNIQUE
metadata JSONB
raw_payload JSONB (full Tranzila response)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### [MISSING] subscription_plans table (needed)
```sql
id UUID PRIMARY KEY
name TEXT ('Basic', 'Professional', 'Enterprise')
tier ENUM ('basic', 'professional', 'enterprise')
price_cents INTEGER (monthly price)
currency TEXT ('ILS')
description TEXT
features JSONB (array of feature names)
max_clients INTEGER (null = unlimited)
max_sessions_per_month INTEGER (null = unlimited)
created_at TIMESTAMPTZ
```

### [MISSING] invoices table (needed)
```sql
id UUID PRIMARY KEY
user_id UUID → users(id)
payment_id UUID → payments(id)
status ENUM ('draft', 'sent', 'paid', 'failed')
amount_cents INTEGER
currency TEXT
due_date TIMESTAMPTZ
issued_at TIMESTAMPTZ
paid_at TIMESTAMPTZ
pdf_url TEXT (for stored PDFs)
created_at TIMESTAMPTZ
```

---

## Key Components and Their Locations

### Tranzila Integration
- **Signature Verification:** `/src/lib/payments/tranzila.ts`
- **Payment Session:** `/src/app/api/payments/tranzila/session/route.ts`
- **Webhook Handler:** `/src/app/api/payments/tranzila/notify/route.ts`
- **Service Layer:** `/src/lib/database/payments.ts`

### Authentication & Authorization
- **Server Auth:** `/src/lib/auth/auth.ts`
- **Client Auth:** `/src/lib/auth/client-auth.ts`
- **Auth Store:** `/src/lib/store/auth-store.ts`
- **Auth Provider:** `/src/components/auth/auth-provider.tsx`

### Subscription Enforcement
- **Database Functions:** `/supabase/migrations/20251114000002_add_subscription_support.sql`
- **RLS Policies:** `/supabase/migrations/20251114000003_resource_subscription_access_gating.sql`
- **Resource Library Service:** `/src/lib/services/resource-library-service.ts`

### Configuration
- **API Endpoints:** `/src/lib/config/api-endpoints.ts`
- **Constants:** `/src/lib/config/constants.ts`
- **Environment Template:** `/.env.example`

---

## Critical Issues to Fix

### 1. Webhook Idempotency (HIGH PRIORITY)
**Problem:** In-memory idempotency cache using `new Set()` loses data on restart
```javascript
// CURRENT (BAD)
const seen = new Set<string>(); // Resets on restart!

if (seen.has(idemKey)) {
  return success;
}
seen.add(idemKey);
```

**Solution:** Use database to track processed webhooks
```javascript
// SOLUTION (GOOD)
const exists = await db.webhooks.findOne({ 
  provider: 'tranzila', 
  transactionId: txId 
});
if (exists) return success;
```

### 2. Missing Subscription Update on Payment
**Problem:** When payment succeeds, subscription is never updated
```javascript
// In webhook handler
await paymentSvc.upsertByProviderTxn({...}); 
// User's subscription_tier is NEVER updated!
```

**Solution:** After successful payment, update user subscription
```javascript
if (status === 'paid') {
  await updateUserSubscription({
    userId,
    tier: 'basic',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });
}
```

### 3. No Invoice Generation
**Problem:** Paid users don't receive invoices
**Solution:** Generate PDF invoice after successful payment

### 4. Auth Doesn't Expose Subscription Data
**Problem:** Frontend can't check user's subscription status
**Solution:** Update auth hooks to fetch subscription fields

### 5. No Error Handling in Webhook
**Problem:** Failed database operations return 500 to Tranzila (will retry forever)
**Solution:** Implement robust error handling and logging

---

## Configuration Needed

### Environment Variables (.env.local)
```bash
# Tranzila Configuration
NEXT_PUBLIC_TRANZILA_SUPPLIER=your_supplier_code
TRANZILA_SECRET=your_webhook_secret
TRANZILA_SIGN_FIELDS=optional,field,list
TRANZILA_SIGN_ALGO=sha256

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# [NEEDED] Email Configuration
SENDGRID_API_KEY=... (for invoice emails)
SENDGRID_FROM_EMAIL=...

# [NEEDED] Tax Service (if applicable)
TAX_SERVICE_API_KEY=...
```

---

## Recommended Development Order

### Phase 1: Fix Critical Issues (1-2 weeks)
1. Move webhook idempotency to database
2. Add error handling to webhook
3. Implement subscription update on payment
4. Update auth to fetch subscription data
5. Create subscription plans table with pricing

### Phase 2: Core Billing (2-3 weeks)
1. Implement invoice generation
2. Create invoice delivery (email with PDF)
3. Build subscription management service
4. Add subscription lifecycle (create, update, cancel)
5. Add comprehensive tests

### Phase 3: User Experience (2-3 weeks)
1. Build subscription management UI
2. Create billing history UI
3. Build payment method management
4. Implement checkout flow
5. Add success/error pages

### Phase 4: Advanced Features (ongoing)
1. Refund support
2. Usage-based billing
3. Tax calculation
4. Multiple payment gateways
5. Analytics dashboard

---

## File Structure Summary

```
Payment-Related Files:
├── Frontend
│   ├── src/app/api/payments/
│   │   └── tranzila/
│   │       ├── session/route.ts (POST - create payment session)
│   │       └── notify/route.ts (POST - webhook handler)
│   └── src/app/[locale]/(authenticated)/payments/
│       └── return/page.tsx (GET - payment result page)
├── Backend Services
│   ├── src/lib/payments/
│   │   └── tranzila.ts (signature verification)
│   ├── src/lib/database/
│   │   └── payments.ts (PaymentService)
│   └── src/lib/services/
│       └── resource-library-service.ts (uses subscription gating)
├── Authentication
│   ├── src/lib/auth/
│   │   ├── auth.ts
│   │   └── client-auth.ts
│   ├── src/lib/store/
│   │   └── auth-store.ts
│   └── src/components/auth/
│       └── auth-provider.tsx
└── Database
    ├── supabase/migrations/
    │   ├── 20250906120000_add_payments.sql
    │   ├── 20251114000002_add_subscription_support.sql
    │   └── 20251114000003_resource_subscription_access_gating.sql
    └── docs/
        └── database_schema_sessions_payments_messaging_review.md
```

---

## Testing Status

- ✓ Payment return page renders in both languages
- ✓ Tranzila webhook accepts IPN payload
- ❌ Missing: Signature verification tests
- ❌ Missing: Idempotency tests
- ❌ Missing: Subscription update tests
- ❌ Missing: Access gating tests
- ❌ Missing: Error handling tests

---

## Useful Database Functions (Already Implemented)

```sql
-- Check if user has any active subscription (including free)
has_active_subscription(user_uuid UUID) → BOOLEAN

-- Check if user has a paid subscription
has_paid_subscription(user_uuid UUID) → BOOLEAN

-- Get user's current subscription tier (auto-downgrades on expiry)
get_user_subscription_tier(user_uuid UUID) → subscription_tier

-- Check if coach can access resource library
can_access_resource_library(coach_uuid UUID) → BOOLEAN
```

All these functions handle expiration automatically and are used in RLS policies.

---

## Next Immediate Actions

1. **Read the docs:**
   - `/PAYMENT_AND_BILLING_STRUCTURE.md` - Comprehensive overview
   - `/PAYMENT_FILES_MANIFEST.md` - Detailed file descriptions

2. **Review the code:**
   - `/src/lib/payments/tranzila.ts` - Signature verification
   - `/src/app/api/payments/tranzila/notify/route.ts` - Webhook handler
   - `/supabase/migrations/20251114000002_add_subscription_support.sql` - Database schema

3. **Identify priorities:**
   - Critical: Fix webhook idempotency
   - High: Implement subscription update on payment
   - High: Create subscription management service
   - Medium: Build invoicing system

---

## Questions to Answer Before Development

1. What are the subscription tiers and pricing? (currently just enum, no plans)
2. Should subscriptions auto-renew or require manual payment? 
3. How long should subscriptions last? (30 days, 1 year?)
4. Do you need trial periods?
5. Do you need tax/VAT support? (currently none)
6. Should you support multiple payment gateways besides Tranzila?
7. Do you need detailed billing analytics?
8. What should happen when subscription expires? (auto-downgrade, warning email?)

