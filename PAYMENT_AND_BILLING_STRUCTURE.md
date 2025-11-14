# Payment and Billing Structure Analysis - Loom Coaching Platform

## Executive Summary

The Loom platform has a **foundational payment and billing infrastructure** in place with Tranzila integration and basic subscription support. However, it is still in early stages and **lacks a complete, production-ready billing system**. Below is a comprehensive overview of what exists and what needs to be built.

---

## 1. CURRENT PAYMENT INFRASTRUCTURE

### 1.1 Payment Gateway - Tranzila Integration

**Status:** Implemented (Basic)

**Location:** `/home/user/Loom/src/lib/payments/tranzila.ts`

**Implementation Details:**
- HMAC signature verification for Tranzila webhook callbacks
- Supports SHA256, SHA1, and MD5 algorithms
- Handles both hex and base64 signature formats
- Safe timing-aware comparison to prevent timing attacks

**Key Functions:**
```typescript
- verifyTranzilaSignature(payload, options) // Verifies webhook signatures
```

**Configuration:**
- `TRANZILA_SUPPLIER` - Required for payment initiation
- `TRANZILA_SECRET` - Required for signature verification
- `TRANZILA_SIGN_FIELDS` - Optional field specification for signature calculation
- `TRANZILA_SIGN_ALGO` - Algorithm (default: sha256)

**Payment Gateway URLs:**
- Secure: `https://secure5.tranzila.com`
- Direct API: `https://direct.tranzila.com`

### 1.2 Payment Database Schema

**Status:** Implemented (Basic)

**Location:** `/home/user/Loom/supabase/migrations/20250906120000_add_payments.sql`

**Tables Created:**
- `payments` - Core payment transaction records

**Payments Table Schema:**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID (references users),
  amount_cents INTEGER NOT NULL (stored in cents),
  currency TEXT DEFAULT 'ILS',
  description TEXT,
  status TEXT DEFAULT 'pending' -- ENUM: pending | paid | failed | canceled
  provider TEXT DEFAULT 'tranzila',
  provider_transaction_id TEXT,
  idempotency_key TEXT,
  metadata JSONB,
  raw_payload JSONB (stores full Tranzila response),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Indexes:**
- `payments_provider_txn_unique` - Ensures idempotency for provider transactions
- `payments_idempotency_unique` - Ensures idempotency at application level
- `payments_user_idx` - User lookups
- `payments_status_idx` - Status filtering

**RLS Policies:**
- Users can only view their own payments
- Only service role can insert/update (webhook-driven)

### 1.3 Subscription Support

**Status:** Implemented (Recent - Nov 2025)

**Location:** `/home/user/Loom/supabase/migrations/20251114000002_add_subscription_support.sql`

**New Fields Added to Users Table:**
```sql
subscription_tier ENUM ('free', 'basic', 'professional', 'enterprise')
subscription_expires_at TIMESTAMPTZ
subscription_started_at TIMESTAMPTZ
subscription_metadata JSONB
```

**Helper Functions Implemented:**
```sql
- has_active_subscription(user_id) → BOOLEAN
  Returns TRUE if user has active subscription (including free tier)
  
- has_paid_subscription(user_id) → BOOLEAN
  Returns TRUE if user has paid subscription (not free tier)
  
- get_user_subscription_tier(user_id) → subscription_tier
  Returns user's tier, accounting for expiration (free if expired)
  
- can_access_resource_library(coach_id) → BOOLEAN
  Returns TRUE if coach can access resource library (requires paid tier)
```

**Usage:**
- Free tier coaches: Limited features (free tier always "active")
- Paid tiers (basic, professional, enterprise): Must have valid expiration_date
- All functions handle expiration logic automatically

---

## 2. PAYMENT API ROUTES

**Location:** `/home/user/Loom/src/app/api/payments/`

### 2.1 Create Payment Session - POST `/api/payments/tranzila/session`

**Purpose:** Initiate a payment session with Tranzila

**Authentication:** Required (authenticated users only)

**Request Schema:**
```typescript
{
  amount: number (positive, max 100,000),
  currency?: 'ILS' (default: ILS),
  description?: string (max 200 chars),
  successUrl?: string (must be valid URL),
  cancelUrl?: string (must be valid URL),
  locale?: 'he' | 'en' (default: he),
  idempotencyKey?: string (optional, 8-100 chars)
}
```

**Response:**
```typescript
{
  success: boolean,
  url: string (Tranzila iframe/redirect URL),
  error?: { flatten() } (Zod validation errors)
}
```

**Implementation Details:**
- Uses Tranzila secure payment iframe: `https://secure5.tranzila.com/{supplier}/iframenew.php`
- Currency code hardcoded to 1 (NIS/ILS)
- Creates pending payment record before returning URL
- Auto-generates return URLs with success/cancel status parameters
- Rate limited: 10 requests per 60 seconds per user

### 2.2 Webhook Callback - POST `/api/payments/tranzila/notify`

**Purpose:** Handle Tranzila IPN (Instant Payment Notification) callbacks

**Authentication:** None (webhook signature verification instead)

**Input Formats Supported:**
- JSON content-type
- Form-data content-type

**Key Parameters from Tranzila:**
```
TranID or tran_id (transaction ID)
sum or Amount (payment amount)
ApprovalCode (presence indicates success)
sign or signature or hash (HMAC signature)
```

**Processing:**
1. Verifies signature using `verifyTranzilaSignature()`
2. Applies in-memory idempotency check (prevents duplicate processing)
3. Determines status: 'paid' if ApprovalCode exists, else 'failed'
4. Upserts payment record by provider transaction ID
5. Returns 200 OK for both success and errors to Tranzila

**Rate Limiting:** 60 requests per 60 seconds

**Issues:**
- ⚠️ **In-memory idempotency is not persistent** - should use database
- ⚠️ **No error handling for failed database operations**
- ⚠️ **No webhook signing verification** - only accepts basic signature check

### 2.3 Payment Return Page - GET `/payments/return?status={status}`

**Location:** `/home/user/Loom/src/app/[locale]/(authenticated)/payments/return/page.tsx`

**Status Codes:**
- `status=success` - "Your payment was successful."
- `status=cancel` - "Payment was canceled."
- `status=failed` - "Payment failed."
- Other - "Unknown payment status."

**Implementation:** Simple status display page (no payment verification or subscription updates)

---

## 3. PAYMENT SERVICE LAYER

**Location:** `/home/user/Loom/src/lib/database/payments.ts`

**Class:** `PaymentService`

**Methods:**

#### `createPending(input: CreatePaymentInput)`
- Creates a payment record with status 'pending'
- Stores amount in cents
- Supports metadata storage
- Used before redirecting to Tranzila

**Input:**
```typescript
{
  userId: string | null,
  amount: number (major units, e.g., 100.50),
  currency?: 'ILS' | 'USD',
  description?: string,
  idempotencyKey?: string,
  metadata?: Record<string, unknown>
}
```

#### `upsertByProviderTxn(input: UpsertProviderPaymentInput)`
- Updates/creates payment by provider transaction ID
- Used by webhooks
- Stores raw provider payload

**Input:**
```typescript
{
  provider: 'tranzila',
  providerTransactionId: string,
  status: PaymentStatus,
  amount?: number,
  currency?: string,
  rawPayload?: unknown
}
```

---

## 4. SUBSCRIPTION AND ACCESS GATING

**Status:** Implemented (Nov 2025)

**Location:** `/home/user/Loom/supabase/migrations/20251114000003_resource_subscription_access_gating.sql`

**Resource Library Access Control:**

Coaches with different subscription tiers have different access levels:

| Action | Free Tier | Paid Tiers | Admin |
|--------|-----------|-----------|-------|
| View resources | ✓ | ✓ | ✓ |
| Upload resources | ✗ | ✓ | ✓ |
| Update resources | ✗ | ✓ | ✓ |
| Delete resources | ✗ | ✓ | ✓ |
| Create collections | ✗ | ✓ | ✓ |
| Share resources | N/A | (implied) | ✓ |

**RLS Policies Updated:**
- "Coaches can create library resources" - Requires `can_access_resource_library()`
- "Coaches can update their library resources" - Requires `can_access_resource_library()`
- "Coaches can delete their library resources" - Requires `can_access_resource_library()`
- "Coaches can create collections" - Requires `can_access_resource_library()`

**Clients:** Unaffected - can access shared resources regardless of coach's subscription tier

---

## 5. AUTHENTICATION AND AUTHORIZATION

**Status:** Comprehensive, but payment/subscription integration incomplete

**Current Auth Architecture:**
- **Auth Provider:** Supabase (Postgres Auth)
- **JWT with Role Claims:** Custom tokens with user role
- **MFA Support:** SMS OTP via Twilio (implemented in migrations)
- **Session Management:** Supabase session with optional trusted devices

**User Roles:**
- `client` - Student/participant
- `coach` - Instructor/educator  
- `admin` - System administrator

**Key Auth Files:**
- `/home/user/Loom/src/lib/auth/auth.ts` - Server-side auth service
- `/home/user/Loom/src/lib/auth/client-auth.ts` - Client-side auth service
- `/home/user/Loom/src/components/auth/auth-provider.tsx` - React context provider
- `/home/user/Loom/src/lib/store/auth-store.ts` - Zustand store for user state

**Subscription Data NOT Currently Fetched:**
- Auth hooks don't load `subscription_tier`, `subscription_expires_at`, or `subscription_metadata`
- Need to update `getCurrentUser()` to include subscription fields
- Need hooks/stores to expose subscription status to UI

---

## 6. MISSING COMPONENTS - GAPS IN BILLING SYSTEM

### Major Gaps:

#### A. **NO INVOICE SYSTEM**
- ❌ No invoice table
- ❌ No invoice generation on payment
- ❌ No invoice delivery (PDF generation, email)
- ❌ No line-item support (multiple items per invoice)

#### B. **NO SUBSCRIPTION MANAGEMENT**
- ❌ No subscription plans table
- ❌ No recurring payment logic
- ❌ No subscription upgrade/downgrade workflows
- ❌ No subscription cancellation with prorating
- ❌ No trial periods
- ❌ No auto-renewal logic

#### C. **NO REFUND SYSTEM**
- ❌ No refund table
- ❌ No refund processing logic
- ❌ No partial refunds
- ❌ No refund history tracking

#### D. **NO PAYMENT METHOD STORAGE**
- ❌ No saved payment methods
- ❌ No card tokenization
- ❌ No payment method selection UI
- ❌ No default payment method handling

#### E. **NO BILLING HISTORY**
- ❌ No billing events tracking
- ❌ No usage-based billing
- ❌ No analytics/revenue reporting
- ❌ No dunning (retry) logic for failed payments

#### F. **NO TAX/VAT HANDLING**
- ❌ No tax calculation
- ❌ No VAT/GST support
- ❌ No tax ID validation
- ❌ No country-specific tax rules

#### G. **NO UI/PAGES**
- ❌ No payment method management page
- ❌ No billing history/invoices page
- ❌ No subscription management page
- ❌ No upgrade/downgrade flows
- ❌ No payment processing UI

#### H. **NO WEBHOOK ERROR HANDLING**
- ❌ Idempotency not persistent (in-memory only)
- ❌ No failed webhook retry logic
- ❌ No webhook event logging
- ❌ No dead-letter queue for failed webhooks

#### I. **SUBSCRIPTION ENFORCEMENT NOT COMPLETE**
- ✓ Resource library gating implemented
- ❌ Other feature gating (e.g., max clients, API rate limits)
- ❌ UI feedback when features unavailable due to subscription

---

## 7. ENVIRONMENT CONFIGURATION

**Current Payment Config Needed:**
```
NEXT_PUBLIC_TRANZILA_SUPPLIER=your_supplier_code
TRANZILA_SECRET=your_webhook_secret
TRANZILA_SIGN_FIELDS=optional_fields_to_include_in_signature
TRANZILA_SIGN_ALGO=sha256|sha1|md5 (default: sha256)
```

**Not Configured Yet:**
- Stripe API keys (if moving to Stripe)
- Tax calculation service keys
- Payment processor for other regions

---

## 8. TESTING

**Current Tests:** Minimal

**Location:** `/home/user/Loom/src/test/e2e/payments.spec.ts`

**Coverage:**
```typescript
✓ Payment return page renders in Hebrew and English
✓ Tranzila notify endpoint accepts IPN payload
✗ NO tests for:
  - Payment verification logic
  - Subscription checking
  - Access gating enforcement
  - Webhook signature verification
  - Idempotency
  - Error cases
```

---

## 9. RESOURCE LIBRARY INTEGRATION

**Status:** Implemented with subscription gating

**Service Layer:** `/home/user/Loom/src/lib/services/resource-library-service.ts`

**Features:**
- ✓ Upload resources
- ✓ Organize into collections
- ✓ Share with clients
- ✓ Track analytics
- ✓ Bulk sharing operations
- ✓ Subscription-based access control (coaches with paid plans)

**Database Layer:** `/home/user/Loom/src/lib/database/resources/`
- `index.ts` - Main resource operations
- `collections.ts` - Collection management
- `sharing.ts` - Sharing logic
- `analytics.ts` - Usage tracking

---

## 10. SUMMARY OF WHAT EXISTS VS. WHAT'S NEEDED

### ✅ IMPLEMENTED
1. Tranzila payment gateway integration (webhook + signature verification)
2. Basic payment transaction tracking (payments table)
3. Subscription tier system (free, basic, professional, enterprise)
4. Subscription helper functions for checking access
5. Resource library subscription gating (RLS policies)
6. Basic auth/authorization system
7. Payment return page (basic status display)

### ⚠️ PARTIALLY IMPLEMENTED
1. API routes (session creation, webhook handling) - need error handling
2. Payment service layer - only basic CRUD, no business logic
3. Access gating - only resource library, need broader enforcement

### ❌ NOT IMPLEMENTED
1. Invoice generation and storage
2. Subscription management (plans, upgrades, cancellations)
3. Refund system
4. Payment method storage and tokenization
5. Recurring/subscription billing
6. Tax and VAT handling
7. Billing history and analytics
8. UI pages for payment management, invoices, subscriptions
9. Comprehensive webhook error handling and retries
10. Subscription enforcement for feature limits
11. Trial periods and promotional codes
12. Dunning/retry logic for failed payments
13. Comprehensive payment testing

---

## 11. RECOMMENDED NEXT STEPS

### Phase 1: Foundation (Critical)
1. Fix webhook idempotency (persistent in database)
2. Add proper error handling to webhook endpoint
3. Update auth hooks to fetch subscription data
4. Create billing/subscription management service layer
5. Add invoice table and basic generation logic

### Phase 2: Core Billing Features
1. Implement subscription plans (basic, professional, enterprise)
2. Create subscription CRUD operations
3. Add subscription lifecycle management (create, update, cancel)
4. Implement invoice generation and delivery
5. Add refund support

### Phase 3: UI and User Experience
1. Build payment method management page
2. Create subscription management page
3. Build invoice/billing history page
4. Implement checkout flow
5. Add subscription management in coach settings

### Phase 4: Advanced Features
1. Implement recurring billing/subscription auto-renewal
2. Add tax calculation
3. Implement dunning/retry logic
4. Add usage-based billing (if needed)
5. Build admin billing analytics dashboard

---

## 12. KEY TECHNICAL DECISIONS NEEDED

1. **Stripe vs Tranzila**: Currently only Tranzila integrated. Consider Stripe for broader features.
2. **Subscription Model**: Flat-rate vs usage-based? Currently no plans exist.
3. **Invoice Generation**: PDF library choice? Email service?
4. **Tax Handling**: Which tax service integration (e.g., TaxJar)?
5. **Currency Support**: Only ILS supported currently. Add more?
6. **Webhook Persistence**: Where to store webhook events? Database? Message queue?

---

## File Structure Reference

```
src/
├── app/api/payments/
│   └── tranzila/
│       ├── session/route.ts       (Create payment session)
│       └── notify/route.ts        (Webhook handler)
├── lib/
│   ├── payments/
│   │   └── tranzila.ts           (Signature verification)
│   ├── database/
│   │   └── payments.ts           (Payment service)
│   ├── services/
│   │   └── resource-library-service.ts (Uses subscription gating)
│   └── auth/
│       ├── auth.ts
│       ├── client-auth.ts
│       └── use-auth.ts
├── components/
│   └── auth/
│       └── auth-provider.tsx
└── [locale]/
    └── (authenticated)/payments/
        └── return/page.tsx         (Payment result page)

supabase/migrations/
├── 20250906120000_add_payments.sql
├── 20251114000002_add_subscription_support.sql
└── 20251114000003_resource_subscription_access_gating.sql
```

