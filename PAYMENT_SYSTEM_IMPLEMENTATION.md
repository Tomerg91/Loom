# Payment & Monetization System Implementation

## Overview

This document describes the comprehensive payment and monetization system implemented for the Loom coaching platform. The system includes Tranzila payment integration, subscription management, invoicing, feature gating, and payment failure alerting.

## Components Implemented

### 1. Tranzila Payment Gateway Integration

#### HMAC Signature Verification
- **File**: `src/lib/payments/tranzila.ts`
- **Features**:
  - Configurable HMAC algorithms (SHA256, SHA1, MD5)
  - Configurable signature fields via environment variables
  - Timing-safe signature comparison to prevent timing attacks
  - Support for both hex and base64 encoded signatures
  - Multiple signature parameter locations (sign, signature, hash)

#### Configuration
```env
TRANZILA_SECRET=your-secret-key
TRANZILA_SIGN_ALGO=sha256
TRANZILA_SIGN_FIELDS=TranID,sum,ApprovalCode
TRANZILA_SUPPLIER=your-supplier-id
```

#### Tests
- **File**: `src/test/lib/payments/tranzila.test.ts`
- Comprehensive test coverage for all signature verification scenarios

### 2. Database Schema

#### Webhook Idempotency
- **Migration**: `supabase/migrations/20251114120000_add_webhook_idempotency.sql`
- **Features**:
  - Persistent webhook event tracking
  - Prevents duplicate processing across server restarts
  - Automatic cleanup of old events (90 days default)
  - Race condition protection for concurrent webhooks

#### Subscription Plans
- **Migration**: `supabase/migrations/20251114130000_add_subscription_plans.sql`
- **Tiers**: Free, Basic, Professional, Enterprise
- **Features**:
  - Flexible pricing (monthly/yearly)
  - Feature flags per tier
  - Usage limits (clients, sessions, resources, storage)
  - Trial periods
  - Helper functions for plan queries

#### Invoices
- **Migration**: `supabase/migrations/20251114140000_add_invoices.sql`
- **Features**:
  - Automatic invoice generation from payments
  - Invoice statuses: draft, pending, paid, void, refunded
  - Tax and discount support
  - PDF URL storage for receipts
  - Billing address and tax ID support

#### Payment Alerts
- **Migration**: `supabase/migrations/20251114150000_add_payment_alerts.sql`
- **Alert Types**:
  - Payment failed
  - Payment pending
  - Subscription expiring
  - Payment disputed
  - High-value failures

### 3. Services

#### Payment Service
- **File**: `src/lib/database/payments.ts`
- Create pending payments
- Update payments via provider transaction ID
- Idempotent payment processing

#### Webhook Service
- **File**: `src/lib/database/webhooks.ts`
- Database-based idempotency checking
- Event recording with race condition protection
- Automatic cleanup of old events

#### Subscription Service
- **File**: `src/lib/database/subscriptions.ts`
- **Features**:
  - Get available subscription plans
  - Check user subscription status
  - Update subscriptions (upgrade/downgrade/renew)
  - Process successful payments automatically
  - Cancel subscriptions (downgrade at period end)
  - Feature access checking
  - Plan limit enforcement
  - Subscription analytics (MRR, ARR, by tier)

#### Payment Alert Service
- **File**: `src/lib/alerts/payment-alerts.ts`
- **Features**:
  - Email notifications for payment events
  - SMS alerts for critical failures
  - Admin notifications for high-value failures
  - Alert logging for audit trail
  - Expiring subscription checks

### 4. API Endpoints

#### Subscription Management
- `GET /api/subscriptions/me` - Get current user's subscription
- `GET /api/subscriptions/plans` - Get all available plans
- `POST /api/subscriptions/cancel` - Cancel subscription

#### Invoicing
- `GET /api/invoices/me` - Get user's invoices

#### Payment Reconciliation (Admin Only)
- `GET /api/admin/reconciliation/payments` - Payment reports with CSV export
- `GET /api/admin/reconciliation/subscriptions` - Subscription analytics

#### Payment Processing
- `POST /api/payments/tranzila/session` - Create payment session
- `POST /api/payments/tranzila/notify` - Webhook handler

### 5. Feature Gating Middleware

**File**: `src/lib/api/feature-gate.ts`

#### Usage Examples

```typescript
// Require specific feature
export const GET = compose(
  handler,
  withFeatureGate({ feature: 'resource_library' }),
  withAuth
);

// Require minimum tier
export const POST = compose(
  handler,
  withFeatureGate({ minTier: 'professional' }),
  withAuth
);

// Check resource limits
export const POST = compose(
  handler,
  withFeatureGate({ limitType: 'clients' }),
  withAuth
);
```

### 6. Billing UI

#### Pricing Page
- **File**: `src/app/[locale]/billing/pricing/page.tsx`
- **Features**:
  - Display all subscription plans
  - Monthly/Yearly toggle with savings indicator
  - Feature comparison
  - Direct payment integration
  - FAQ section

#### Subscription Dashboard
- **File**: `src/app/[locale]/billing/subscription/page.tsx`
- **Features**:
  - Current subscription status
  - Days remaining indicator
  - Feature list for current plan
  - Plan upgrade/downgrade
  - Subscription cancellation
  - Expiration warnings

#### Invoices Page
- **File**: `src/app/[locale]/billing/invoices/page.tsx`
- **Features**:
  - Invoice list with filtering
  - Status badges
  - PDF download links
  - Invoice summary statistics

### 7. Testing

#### Tranzila Signature Tests
- **File**: `src/test/lib/payments/tranzila.test.ts`
- Tests all signature verification scenarios

#### Payment Flow Tests
- **File**: `src/test/integration/payment-flows.test.ts`
- **Coverage**:
  - Complete subscription purchase flow
  - Failed payment handling
  - Webhook idempotency
  - Subscription upgrades/downgrades
  - Feature gating
  - Invoice generation
  - Payment reconciliation
  - Security tests
  - Edge cases

## Subscription Plans

### Free Tier
- **Price**: Free forever
- **Limits**:
  - 5 clients
  - 20 sessions/month
  - 100 MB storage
  - No resource library access
- **Features**: Basic session and client management

### Basic Tier
- **Price**: ₪99/month or ₪990/year
- **Limits**:
  - 50 clients
  - 100 sessions/month
  - 5 GB storage
- **Features**:
  - Resource library access
  - Calendar integration
  - Email notifications
  - 14-day free trial

### Professional Tier
- **Price**: ₪299/month or ₪2,990/year
- **Limits**: Unlimited clients, sessions, resources
- **Features**:
  - All Basic features
  - Advanced analytics
  - Custom branding
  - Priority support
  - SMS notifications
  - Team collaboration
  - 30-day free trial

### Enterprise Tier
- **Price**: ₪999/month or ₪9,990/year
- **Limits**: Unlimited everything
- **Features**:
  - All Professional features
  - API access
  - White label
  - Dedicated support
  - SSO integration
  - Custom integrations
  - 30-day free trial

## Payment Flow

### 1. User Initiates Payment
```
User selects plan → Frontend creates payment session → Redirects to Tranzila
```

### 2. Payment Processing
```
User enters payment info → Tranzila processes → Webhook notification
```

### 3. Webhook Handler
```
Verify signature → Check idempotency → Update payment → Update subscription → Generate invoice → Send confirmation
```

### 4. Failure Handling
```
Payment fails → Alert service → Email/SMS to user → Admin notification (if high-value)
```

## Feature Gating

### Checking Feature Access

```typescript
// In API route
const hasAccess = await requireFeature(userId, 'resource_library');
if (!hasAccess) {
  return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
}
```

### Checking Plan Limits

```typescript
// Before creating a resource
const limitCheck = await requireWithinLimit(userId, 'resources');
if (!limitCheck.allowed) {
  return NextResponse.json(
    { error: `Limit reached: ${limitCheck.current}/${limitCheck.limit}` },
    { status: 403 }
  );
}
```

## Security Features

1. **HMAC Signature Verification**: All Tranzila webhooks are verified using HMAC signatures
2. **Timing-Safe Comparison**: Prevents timing attacks on signature validation
3. **Database-Based Idempotency**: Prevents duplicate charges from webhook replays
4. **RLS Policies**: Row-Level Security ensures users only see their own data
5. **Rate Limiting**: All API endpoints are rate-limited
6. **Input Validation**: Zod schemas validate all API inputs
7. **SQL Injection Protection**: Parameterized queries via Supabase

## Reconciliation & Reporting

### For Finance Team

#### Payment Report
```bash
GET /api/admin/reconciliation/payments?startDate=2024-01-01&endDate=2024-12-31&format=csv
```

Exports:
- All payments with user details
- Transaction IDs for Tranzila reconciliation
- Amounts, currencies, statuses
- Timestamps

#### Subscription Analytics
```bash
GET /api/admin/reconciliation/subscriptions
```

Returns:
- Total active subscribers by tier
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Churn metrics

## Alerting

### Email Alerts
- Payment failures
- Subscription expiring (3 days before)
- Payment disputes

### SMS Alerts (Critical Only)
- Payment failures
- High-value transaction issues

### Admin Alerts
- High-value payment failures (>₪1,000)
- Recurring failures from same user
- Payment disputes

## Environment Variables Required

```env
# Tranzila Configuration
TRANZILA_SECRET=your-secret-key
TRANZILA_SUPPLIER=your-supplier-id
TRANZILA_SIGN_ALGO=sha256
TRANZILA_SIGN_FIELDS=TranID,sum,ApprovalCode

# Application
NEXT_PUBLIC_APP_URL=https://your-app.com

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Database Migrations

Run migrations in order:
```bash
1. 20250906120000_add_payments.sql
2. 20251114000002_add_subscription_support.sql
3. 20251114000003_resource_subscription_access_gating.sql
4. 20251114120000_add_webhook_idempotency.sql
5. 20251114130000_add_subscription_plans.sql
6. 20251114140000_add_invoices.sql
7. 20251114150000_add_payment_alerts.sql
```

## TODO: Future Enhancements

1. **PDF Invoice Generation**: Integrate with PDF generation service
2. **Email Service Integration**: Replace console.log with actual email service (SendGrid, AWS SES)
3. **SMS Service Integration**: Integrate Twilio or AWS SNS for SMS alerts
4. **Promotional Codes**: Add support for discount codes and promotions
5. **Refund System**: Implement refund processing workflow
6. **Payment Method Storage**: Store payment methods for recurring billing
7. **Auto-Renewal**: Implement automatic subscription renewals
8. **Dunning Management**: Handle failed recurring payments with retry logic
9. **Tax/VAT Handling**: Add tax calculation based on user location
10. **Multi-Currency Support**: Add support for multiple currencies beyond ILS

## Support

For issues or questions:
- Check webhook logs: `/api/admin/reconciliation/payments`
- Review alert logs: `payment_alerts` table
- Contact: support@loom.com
