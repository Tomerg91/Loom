# Authentication Security Hardening Documentation

## Overview

This document describes the comprehensive authentication security hardening implemented in the Loom application, including retry/backoff mechanisms, circuit breaker patterns, MFA audit logging, and telemetry integration.

## Table of Contents

1. [Server-Side Retry & Backoff](#server-side-retry--backoff)
2. [Circuit Breaker Pattern](#circuit-breaker-pattern)
3. [Environment Validation](#environment-validation)
4. [Forced Sign-Out with Telemetry](#forced-sign-out-with-telemetry)
5. [MFA Audit Logging](#mfa-audit-logging)
6. [Telemetry Integration](#telemetry-integration)
7. [Security Testing](#security-testing)
8. [Configuration](#configuration)

---

## Server-Side Retry & Backoff

### Implementation

Location: `/src/modules/platform/supabase/server-auth-utils.ts`

The server implements exponential backoff retry logic for all authentication operations to handle transient network failures gracefully.

### Features

- **Configurable retry attempts**: Default 3 retries (via `MAX_AUTH_RETRIES` env var)
- **Exponential backoff**: Base delay 1000ms (via `AUTH_RETRY_DELAY_MS` env var)
- **Maximum delay cap**: 30 seconds to prevent excessive waiting
- **Smart retry conditions**: Only retries on network errors, not auth errors (401/403)
- **Comprehensive telemetry**: Tracks all retry attempts, successes, and failures

### Usage

```typescript
import { retryWithBackoff } from '@/modules/platform/supabase/server-auth-utils';

// Retry a session refresh operation
const result = await retryWithBackoff(
  async () => {
    const { data, error } = await client.auth.refreshSession();
    if (error) throw error;
    return data;
  },
  {
    operation: 'session_refresh',
    maxRetries: 3,
    useCircuitBreaker: true,
  }
);
```

### Retry Decision Logic

The system automatically determines whether to retry based on the error:

- ✅ **Retry**: Network errors, timeouts, 5xx server errors
- ❌ **No Retry**: Authentication errors (401, 403), validation errors (400)

---

## Circuit Breaker Pattern

### Purpose

Prevents cascading failures by temporarily blocking requests to failing services, allowing them time to recover.

### States

1. **Closed** (Normal): All requests pass through
2. **Open** (Failing): Requests are immediately rejected
3. **Half-Open** (Testing): Limited requests allowed to test recovery

### Configuration

```bash
# Environment variables
CIRCUIT_BREAKER_THRESHOLD=5          # Failures before opening circuit
CIRCUIT_BREAKER_TIMEOUT_MS=60000     # Time before attempting recovery (60s)
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2  # Successes needed to close circuit
```

### State Transitions

```
CLOSED --[5 failures]--> OPEN --[60s timeout]--> HALF-OPEN --[2 successes]--> CLOSED
                                                            --[1 failure]---> OPEN
```

### Usage

```typescript
import { getCircuitBreaker } from '@/modules/platform/supabase/server-auth-utils';

const breaker = getCircuitBreaker('auth_service');

const result = await breaker.execute(
  async () => {
    // Your auth operation
    return await performAuthOperation();
  },
  'operation_name'
);

// Check circuit state
const stats = breaker.getStats();
console.log(`Circuit state: ${stats.state}`);
```

---

## Environment Validation

### Comprehensive Checks

Location: `/src/modules/platform/supabase/server-auth-utils.ts`

The system validates all authentication-related environment variables at startup:

1. **Supabase URL**
   - Not missing or placeholder
   - Valid URL format
   - Contains 'supabase' domain (warning if not)

2. **Supabase Anon Key**
   - Not placeholder value
   - Valid prefix ('eyJ' or 'sb_')
   - Proper length

3. **Service Role Key** (optional)
   - Valid prefix if present
   - Warning if missing

4. **MFA Keys** (if MFA enabled)
   - `MFA_ENCRYPTION_KEY`: Min 32 characters
   - `MFA_SIGNING_KEY`: Min 32 characters

5. **Retry Configuration**
   - Valid numeric values
   - Reasonable ranges (0-10 retries)

### Usage

```typescript
import { ensureValidAuthEnvironment } from '@/modules/platform/supabase/server';

// Throws error if validation fails
ensureValidAuthEnvironment();

// Or get detailed validation results
import { validateAuthEnvironment } from '@/modules/platform/supabase/server-auth-utils';

const result = validateAuthEnvironment();
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
if (result.warnings.length > 0) {
  console.warn('Validation warnings:', result.warnings);
}
```

---

## Forced Sign-Out with Telemetry

### Server-Side Sign-Out

```typescript
import { signOutWithRetry } from '@/modules/platform/supabase/server';

await signOutWithRetry(supabaseClient, {
  reason: 'token_expired',
  userId: 'user-id',
  metadata: {
    attemptCount: 3,
    lastRefreshTime: new Date(),
  }
});
```

### Browser-Side Sign-Out

The browser client automatically handles invalid tokens:

- Retries token refresh up to 3 times with exponential backoff
- After exhausting retries, forces local sign-out
- Clears all auth storage (localStorage, sessionStorage)
- Redirects to `/signin?expired=true`
- Tracks all events with telemetry

### Telemetry Captured

- Sign-out reason
- User ID (if available)
- Retry attempt count
- Timestamp
- Custom metadata

---

## MFA Audit Logging

### Database Schema

Location: `/supabase/migrations/20251112000002_mfa_audit_logs_table.sql`

```sql
CREATE TABLE mfa_audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    device_id TEXT,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMPTZ
);
```

### Tracked Events

- `mfa_setup_started` / `mfa_setup_completed` / `mfa_setup_failed`
- `mfa_verification_started` / `mfa_verification_success` / `mfa_verification_failed`
- `mfa_verification_blocked` (rate limit, account lock)
- `mfa_backup_code_used`
- `mfa_device_trusted` / `mfa_device_untrusted`
- `mfa_disabled`
- `mfa_rate_limit_hit`

### Security Architecture

**IMPORTANT**: MFA audit logging uses `createAdminClient()` with service_role privileges:

- **Why**: The RLS policies on `mfa_audit_logs` only allow service_role to INSERT
- **Security**: Prevents unauthorized tampering with audit logs
- **Consistency**: Ensures audit logs are always written regardless of caller context
- **Read Access**: Users can read their own logs via RLS policies, but only service_role can write

```typescript
// Internal implementation (do not modify)
async function storeMfaAuditLog(log: MfaAuditLog): Promise<void> {
  // Uses admin client with service_role to bypass RLS
  const supabase = createAdminClient();

  await supabase.from('mfa_audit_logs').insert({...});
}
```

**RLS Policy Summary**:
- INSERT: Service role only (enforced)
- SELECT: Users can view their own logs OR admins can view all
- UPDATE/DELETE: Not allowed (audit trail integrity)

### Usage

```typescript
import {
  trackMfaSetupCompleted,
  trackMfaVerificationSuccess,
  trackMfaVerificationFailed,
  getRequestMetadata,
} from '@/lib/auth/mfa-telemetry';

// Track successful MFA setup
await trackMfaSetupCompleted({
  userId: user.id,
  method: 'totp',
  ...getRequestMetadata(request),
});

// Track verification attempt
await trackMfaVerificationFailed('Invalid code', {
  userId: user.id,
  method: 'totp',
  attemptCount: 3,
  ipAddress: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent'),
});

// Retrieve audit logs for a user
const logs = await getMfaAuditLogs('user-id', {
  limit: 50,
  eventTypes: ['mfa_verification_failed', 'mfa_verification_success'],
  startDate: new Date('2025-01-01'),
});
```

### Suspicious Activity Detection

```typescript
import { detectSuspiciousMfaActivity } from '@/lib/auth/mfa-telemetry';

// Analyzes recent activity for security threats
const alerts = await detectSuspiciousMfaActivity('user-id', {
  time_window_minutes: 60,
});

// Returns alerts like:
// - excessive_failed_verifications
// - multiple_ip_addresses
// - rate_limit_triggered
```

---

## Telemetry Integration

### Metrics Tracked

#### Browser Client

- `auth.token_refresh.success` - Successful token refresh
- `auth.token_refresh.failure` - Failed token refresh
- `auth.retry.attempt` - Each retry attempt
- `auth.retry.success` - Successful retry
- `auth.force_signout` - Forced sign-out event

#### Server-Side

- `auth.operation.duration` - Auth operation timing
- `auth.operation.failure` - Operation failures
- `auth.env_validation.duration` - Validation timing
- `auth.env_validation.warnings` - Validation warnings

#### Circuit Breaker

- `circuit_breaker.success` - Successful operations
- `circuit_breaker.failure` - Failed operations
- `circuit_breaker.state_change` - State transitions

#### MFA Events

- `mfa.setup.started` / `mfa.setup.completed` / `mfa.setup.failed`
- `mfa.verification.started` / `mfa.verification.success` / `mfa.verification.failed`
- `mfa.verification.blocked`
- `mfa.backup_code.used`
- `mfa.backup_code.low_warning`
- `mfa.rate_limit.hit`
- `mfa.device.trusted`
- `mfa.disabled`

### Sentry Integration

All errors are captured with rich context:

```typescript
captureError(error, {
  level: 'error',
  tags: {
    component: 'auth_client',
    operation: 'token_refresh',
    retry_exhausted: 'true',
  },
  extra: {
    attemptCount: 3,
    duration: 5000,
    userId: 'user-id',
  }
});
```

---

## Security Testing

### Penetration Test Suite

Location: `/src/test/security/auth-penetration-tests.test.ts`

Run the security test suite:

```bash
npm run test:security
```

### Test Coverage

1. **Session Refresh Security**
   - Retry with exponential backoff
   - No retry on auth errors
   - Maximum retry enforcement
   - Backoff delay validation

2. **Circuit Breaker**
   - Opens after threshold failures
   - Rejects requests when open
   - Transitions to half-open after timeout

3. **Forced Sign-Out**
   - Telemetry tracking
   - Retry on network failures
   - Graceful error handling

4. **Environment Validation**
   - URL format validation
   - Placeholder rejection
   - Key prefix validation

5. **Token Expiration**
   - Expired token handling
   - Invalid token clearance

6. **MFA Security**
   - Bypass attempt detection
   - Rate limiting
   - Device trust validation

### Manual Penetration Testing

```bash
# Test rate limiting
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' &
done

# Test MFA brute force protection
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/auth/signin-mfa \
    -H "Content-Type: application/json" \
    -d '{"code":"000000","sessionToken":"test"}' &
done

# Test circuit breaker
for i in {1..10}; do
  curl -X GET http://localhost:3000/api/auth/session &
done
```

---

## Configuration

### Environment Variables

```bash
# ===== Retry Configuration =====
MAX_AUTH_RETRIES=3                    # Maximum retry attempts (0-10)
AUTH_RETRY_DELAY_MS=1000              # Base delay for exponential backoff
CIRCUIT_BREAKER_THRESHOLD=5           # Failures before opening circuit
CIRCUIT_BREAKER_TIMEOUT_MS=60000      # Timeout before half-open (ms)
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2   # Successes to close circuit

# ===== Supabase Configuration =====
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ===== MFA Configuration =====
NEXT_PUBLIC_ENABLE_MFA=true
MFA_ENCRYPTION_KEY=your-32-char-encryption-key-here
MFA_SIGNING_KEY=your-32-char-signing-key-here

# ===== Monitoring =====
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=...
```

### Recommended Production Settings

```bash
# Production-optimized retry settings
MAX_AUTH_RETRIES=3
AUTH_RETRY_DELAY_MS=1000              # 1s, 2s, 4s backoff
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT_MS=60000      # 1 minute
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3   # More conservative

# Enable all security features
NEXT_PUBLIC_ENABLE_MFA=true
```

---

## Security Best Practices

### 1. Regular Security Audits

- Review MFA audit logs weekly
- Monitor circuit breaker state changes
- Analyze failed authentication patterns
- Check for suspicious IP patterns

### 2. Monitoring Alerts

Set up alerts for:
- Circuit breaker state changes to "open"
- Excessive failed authentication attempts
- MFA verification failures > threshold
- Rate limit violations

### 3. Key Rotation

- Rotate MFA encryption keys quarterly
- Rotate Supabase service role key annually
- Monitor for key exposure in logs

### 4. Incident Response

If suspicious activity detected:
1. Review MFA audit logs
2. Check circuit breaker stats
3. Analyze telemetry metrics
4. Force sign-out affected users
5. Notify users of suspicious activity

---

## Troubleshooting

### Issue: Circuit Breaker Stuck Open

**Solution:**
```typescript
import { getCircuitBreaker } from '@/modules/platform/supabase/server-auth-utils';

const breaker = getCircuitBreaker('auth_service');
breaker.reset(); // Manually reset circuit
```

### Issue: Too Many Retries

**Solution:**
Reduce `MAX_AUTH_RETRIES` environment variable or adjust retry conditions in `server-auth-utils.ts`.

### Issue: MFA Audit Logs Growing Too Large

**Solution:**
Run cleanup function:
```sql
SELECT cleanup_old_mfa_audit_logs(365); -- Keep 1 year
```

---

## API Reference

### Server Auth Utils

```typescript
// Retry with backoff
retryWithBackoff<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T>

// Environment validation
ensureValidAuthEnvironment(): void
validateAuthEnvironment(): AuthValidationResult

// Forced sign-out
trackForceSignOut(options: ForceSignOutOptions): void

// Circuit breaker
getCircuitBreaker(name: string): CircuitBreaker
```

### MFA Telemetry

```typescript
// Event tracking
trackMfaSetupStarted(metadata?: MfaEventMetadata): void
trackMfaSetupCompleted(metadata: MfaEventMetadata): Promise<void>
trackMfaVerificationSuccess(metadata: MfaEventMetadata): Promise<void>
trackMfaVerificationFailed(error: Error | string, metadata: MfaEventMetadata): Promise<void>

// Audit log retrieval
getMfaAuditLogs(userId: string, options?: QueryOptions): Promise<MfaAuditLog[]>

// Security analysis
detectSuspiciousMfaActivity(userId: string, timeWindowMinutes?: number): Promise<Alert[]>
```

---

## Changelog

### 2025-11-12 - Initial Implementation

- ✅ Server-side retry/backoff logic with exponential backoff
- ✅ Circuit breaker pattern for auth operations
- ✅ Enhanced environment validation
- ✅ Forced sign-out telemetry tracking
- ✅ MFA comprehensive audit logging
- ✅ Suspicious activity detection
- ✅ Browser client telemetry enhancement
- ✅ Penetration testing suite
- ✅ Security documentation

---

## Contributors

Authentication security hardening implemented as part of secure authentication requirements for the Loom coaching platform.

For questions or issues, please refer to the GitHub repository or contact the development team.
