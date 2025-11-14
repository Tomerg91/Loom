# Payment and Billing - File Manifest and Details

## Quick File Reference

### Payment Integration Files
| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `src/lib/payments/tranzila.ts` | HMAC signature verification | 46 | ✓ Implemented |
| `src/lib/database/payments.ts` | Payment CRUD service | 72 | ✓ Implemented |
| `src/app/api/payments/tranzila/session/route.ts` | Create payment session | 106 | ✓ Implemented |
| `src/app/api/payments/tranzila/notify/route.ts` | Webhook handler | 65 | ✓ Implemented |
| `src/app/[locale]/(authenticated)/payments/return/page.tsx` | Payment result page | 36 | ✓ Implemented |

### Database Migrations
| File | Purpose | Status |
|------|---------|--------|
| `supabase/migrations/20250906120000_add_payments.sql` | Payment table schema | ✓ Implemented |
| `supabase/migrations/20251114000002_add_subscription_support.sql` | Subscription fields & functions | ✓ Implemented (Nov 14, 2025) |
| `supabase/migrations/20251114000003_resource_subscription_access_gating.sql` | Resource library RLS policies | ✓ Implemented (Nov 14, 2025) |

### Authentication & Authorization
| File | Purpose | Status |
|------|---------|--------|
| `src/lib/auth/auth.ts` | Server-side auth service | ✓ Implemented |
| `src/lib/auth/client-auth.ts` | Client-side auth service | ✓ Implemented |
| `src/lib/auth/use-auth.ts` | Auth hooks (client) | ✓ Implemented |
| `src/lib/store/auth-store.ts` | Zustand auth state | ✓ Implemented |
| `src/components/auth/auth-provider.tsx` | React auth provider | ✓ Implemented |

### Resource Library (Uses Subscription Gating)
| File | Purpose | Status |
|------|---------|--------|
| `src/lib/services/resource-library-service.ts` | Resource library business logic | ✓ Implemented |
| `src/lib/database/resources/index.ts` | Resource CRUD operations | ✓ Implemented |
| `src/lib/database/resources/collections.ts` | Collection management | ✓ Implemented |
| `src/lib/database/resources/sharing.ts` | Resource sharing logic | ✓ Implemented |
| `src/lib/database/resources/analytics.ts` | Resource usage tracking | ✓ Implemented |

### Configuration & Constants
| File | Purpose | Status |
|------|---------|--------|
| `src/lib/config/api-endpoints.ts` | API route definitions | ✓ Implemented (but missing payment endpoints) |
| `src/lib/config/constants.ts` | App configuration constants | ✓ Implemented |
| `.env.example` | Environment variable template | ⚠️ Missing payment config |

### Testing
| File | Purpose | Status |
|------|---------|--------|
| `src/test/e2e/payments.spec.ts` | Payment E2E tests | ⚠️ Minimal (2 tests) |

---

## Detailed File Descriptions

### 1. `src/lib/payments/tranzila.ts`

**Purpose:** Tranzila webhook signature verification

**Key Export:**
- `verifyTranzilaSignature(payload, options)` - Verifies HMAC signatures

**Environment Variables Used:**
- `TRANZILA_SECRET` - Webhook secret
- `TRANZILA_SIGN_FIELDS` - Fields to include in signature (optional)
- `TRANZILA_SIGN_ALGO` - Algorithm (sha256|sha1|md5)

**Security Features:**
- Timing-safe comparison (`timingSafeEqual`)
- Supports hex and base64 encoding
- Safe field canonicalization

**Dependencies:**
- Built-in Node.js `crypto` module

---

### 2. `src/lib/database/payments.ts`

**Purpose:** Payment transaction service layer

**Class:** `PaymentService`

**Key Methods:**
```typescript
createPending(input: CreatePaymentInput)
  ↳ Creates pending payment record
  ↳ Amount stored in cents
  ↳ Supports metadata
  
upsertByProviderTxn(input: UpsertProviderPaymentInput)
  ↳ Updates/creates by provider transaction ID
  ↳ Used by webhook handler
  ↳ Stores raw payload
```

**Database Interaction:**
- Uses Supabase client for authenticated requests
- Uses admin client for webhook context

**Issues:**
- No business logic beyond CRUD
- No invoice creation
- No subscription updates
- No refund processing

---

### 3. `src/app/api/payments/tranzila/session/route.ts`

**HTTP Method:** `POST`

**Purpose:** Initiate payment session with Tranzila

**Authentication:** Required (Zustand auth guard)

**Request Validation:** Zod schema
```typescript
{
  amount: number (positive, max 100000),
  currency?: 'ILS',
  description?: string (max 200),
  successUrl?: string (URL),
  cancelUrl?: string (URL),
  locale?: 'he' | 'en',
  idempotencyKey?: string (8-100 chars)
}
```

**Response:**
```typescript
Success: { success: true, url: string }
Error: { success: false, error: { flatten() } }
```

**Business Logic:**
1. Validates request with Zod
2. Gets current authenticated user
3. Creates pending payment record
4. Builds Tranzila secure URL
5. Returns iframe URL

**Rate Limiting:** 10/minute per user

**Tranzila URL Parameters:**
- `sum` - Amount (floats to 2 decimals)
- `currency` - Always 1 (NIS/ILS)
- `lang` - he or en
- `product` - Description
- `success_url` - Return on success
- `error_url` - Return on cancel

**Issues:**
- ⚠️ No error handling for payment service failures
- ⚠️ No validation that user exists
- ⚠️ Returns URL even if payment creation fails

---

### 4. `src/app/api/payments/tranzila/notify/route.ts`

**HTTP Method:** `POST`

**Purpose:** Handle Tranzila IPN webhook callbacks

**Authentication:** Webhook signature verification (no auth required)

**Input Formats:**
- JSON: `req.json()`
- Form-data: `req.formData()`

**Tranzila Parameters Handled:**
```
TranID or tran_id or index or orderid → Transaction ID
sum or Amount → Payment amount
ApprovalCode or approval → Presence = success
sign or signature or hash → HMAC signature
```

**Processing Steps:**
1. Parse request (JSON or form-data)
2. Extract transaction ID and amount
3. Check signature with `verifyTranzilaSignature()`
4. Check in-memory idempotency cache
5. Determine status ('paid' if approval code exists)
6. Upsert payment via PaymentService
7. Return 200 OK

**Rate Limiting:** 60/minute

**Critical Issues:**
- ⚠️ **In-memory idempotency**: `seen = new Set()` loses data on restart
  - Should use database for persistence
  - Each duplicate webhook resets the in-memory cache
- ⚠️ **No error recovery**: Failed DB operations return 500 to Tranzila
  - Tranzila may retry endlessly
  - No dead-letter queue or logging
- ⚠️ **No subscription update**: Payment doesn't update user subscription
- ⚠️ **No invoice creation**: Payment doesn't create invoice
- ⚠️ **Basic logging**: Only logs errors to console

---

### 5. `src/app/[locale]/(authenticated)/payments/return/page.tsx`

**Purpose:** Display payment result to user

**Route:** `/[locale]/payments/return?status={status}`

**Query Parameters:**
- `status=success` → "Your payment was successful."
- `status=cancel` → "Payment was canceled."
- `status=failed` → "Payment failed."
- Other → "Unknown payment status."

**Implementation:**
- Very basic status display
- Supports Hebrew and English
- No database verification
- No subscription updates
- No next steps or actions

**Issues:**
- ⚠️ Doesn't verify payment actually completed
- ⚠️ Doesn't trigger subscription activation
- ⚠️ Doesn't show invoice
- ⚠️ Doesn't provide next steps to user

---

### 6. Database Migrations

#### `20250906120000_add_payments.sql`

**Tables Created:**
- `payments` - Payment transaction records

**Indexes:**
- `payments_provider_txn_unique` - (provider, provider_transaction_id)
- `payments_idempotency_unique` - (idempotency_key)
- `payments_user_idx` - (user_id)
- `payments_status_idx` - (status)

**RLS Policies:**
- `payments_select_own` - Users see own payments
- `payments_modify_none` - Only service role can modify

**Issues:**
- Status is TEXT, not ENUM (no type safety)
- No foreign key to subscription plans
- No invoice relationship
- No refund table

#### `20251114000002_add_subscription_support.sql`

**Tables Modified:**
- `users` - Added subscription fields

**New Columns:**
```sql
subscription_tier ENUM ('free', 'basic', 'professional', 'enterprise')
subscription_expires_at TIMESTAMPTZ
subscription_started_at TIMESTAMPTZ
subscription_metadata JSONB
```

**New Functions:**
```sql
has_active_subscription(user_uuid UUID) → BOOLEAN
has_paid_subscription(user_uuid UUID) → BOOLEAN
get_user_subscription_tier(user_uuid UUID) → subscription_tier
can_access_resource_library(coach_uuid UUID) → BOOLEAN
```

**Indexes:**
- `idx_users_subscription_tier` - (subscription_tier)
- `idx_users_subscription_expires_at` - WHERE expires_at IS NOT NULL

**Implementation Notes:**
- Free tier always considered "active"
- Paid tiers require valid expiration_date
- Automatic downgrade to free on expiration
- Resource library access requires paid tier + coach role

#### `20251114000003_resource_subscription_access_gating.sql`

**Policies Updated:**
- `file_uploads` - Reading/updating/deleting library resources
- `resource_collections` - Creating collections
- `resource_library_settings` - Creating settings

**RLS Logic:**
- Coaches view/upload/delete only if `can_access_resource_library()`
- Admins always have access
- Clients unaffected (can access shared resources)

**Index Added:**
- `idx_users_role_subscription` - (role, subscription_tier, subscription_expires_at)

---

### 7. Auth System (Not Updated for Subscriptions)

#### `src/lib/auth/auth.ts`

**Current Implementation:**
- Supabase auth service
- JWT tokens with role claims
- MFA support (SMS OTP)
- Password management
- Session validation

**Problem:** Doesn't fetch subscription fields
- Need to add subscription tier check
- Need to expose subscription status to UI

#### `src/lib/store/auth-store.ts`

**Current Implementation:**
- Zustand store for auth state
- Stores: user, isLoading, error
- Actions: setUser, setLoading, clearAuth

**Problem:** User type doesn't include subscription fields
- Need to update AuthUser interface
- Need to sync subscription status

#### `src/components/auth/auth-provider.tsx`

**Current Implementation:**
- React context provider
- Wraps app with auth state
- Provides `useUser()` hook

**Problem:** Doesn't load/provide subscription data
- UI can't check if user has paid subscription
- Resource library gating works at database level only

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Payment Flow                             │
└─────────────────────────────────────────────────────────────────┘

1. USER INITIATES PAYMENT
   ↓
   Frontend → POST /api/payments/tranzila/session
   ├─ Sends: { amount, description, locale, ... }
   └─ Validates: Zod schema

2. SESSION CREATION
   ↓
   API Route:
   ├─ Authenticates user
   ├─ Creates pending payment in DB
   └─ Returns Tranzila iframe URL

3. USER COMPLETES PAYMENT
   ↓
   User → Tranzila Payment Form
   └─ (external, secure)

4. WEBHOOK CALLBACK
   ↓
   Tranzila → POST /api/payments/tranzila/notify
   ├─ Verifies signature
   ├─ Checks idempotency
   └─ Updates payment status

5. RETURN TO APP
   ↓
   Tranzila → GET /payments/return?status=success
   └─ User sees confirmation page

6. [MISSING] SUBSCRIPTION ACTIVATION
   ❌ NOT IMPLEMENTED
   - Should update user.subscription_tier
   - Should set subscription_expires_at
   - Should create invoice
   - Should send confirmation email

7. [MISSING] ACCESS GATING
   ✓ Resource library: Implemented via RLS
   ❌ Other features: Not gated
```

---

## Current Limitations

### Tranzila Integration
1. ⚠️ No support for additional gateway (Stripe, PayPal, etc.)
2. ⚠️ No tokenization or saved payment methods
3. ⚠️ No 3D Secure / PCI compliance verification
4. ⚠️ No transaction history sync from Tranzila

### Subscription System
1. ❌ No subscription plans defined
2. ❌ No plan pricing
3. ❌ No recurring/auto-renewal
4. ❌ No upgrade/downgrade logic
5. ❌ No trial periods
6. ❌ No promotional codes/discounts

### Business Logic
1. ❌ No invoice generation
2. ❌ No refund processing
3. ❌ No tax calculation
4. ❌ No billing analytics
5. ❌ No dunning (retry) for failed payments
6. ❌ No payment confirmation email

### User Experience
1. ❌ No subscription management UI
2. ❌ No billing history UI
3. ❌ No invoice download
4. ❌ No payment method management
5. ❌ No upgrade prompts for free users
6. ❌ No subscription expiration warnings

---

## Integration Points

### With Resource Library
- ✓ `can_access_resource_library()` function gates uploads
- ✓ RLS policies enforce subscription requirements
- ❌ No UI feedback when features unavailable

### With Auth System
- ⚠️ Payment creation uses auth context
- ⚠️ Auth doesn't expose subscription status
- ⚠️ No subscription check on login
- ⚠️ No session invalidation on subscription expiry

### With Sessions/Coaching
- ❌ No payment requirement for session booking
- ❌ No invoicing for sessions
- ❌ No revenue split logic
- ❌ No payment status check before scheduling

---

## Next Steps Priority

### Critical (Fix Immediately)
1. Fix webhook idempotency (move to database)
2. Add error handling to webhook
3. Update auth to fetch subscription data
4. Create subscription plans table
5. Implement subscription update on payment

### High Priority
1. Implement subscription lifecycle (create, update, cancel)
2. Create invoice generation
3. Add billing history UI
4. Implement payment method management
5. Add subscription gating for other features

### Medium Priority
1. Add refund support
2. Implement invoice delivery (email, PDF)
3. Add promotional codes
4. Implement dunning/retries
5. Add tax calculation

### Nice to Have
1. Analytics dashboard
2. Usage-based billing
3. Support multiple payment gateways
4. Implement trial periods
5. Add subscription webhooks

