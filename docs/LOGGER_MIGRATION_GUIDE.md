# Logger Migration Guide

## Overview

This guide helps you migrate from ad-hoc `console.*` logging to our centralized sanitized logger system.

## Why Migrate?

### Current Problems
1. **PII Exposure**: Direct console logging can leak sensitive data (emails, phone numbers, tokens)
2. **No Production Visibility**: Console logs are stripped completely in production
3. **Lack of Context**: Hard to trace logs back to their source
4. **No Error Tracking**: Errors don't automatically reach Sentry
5. **Inconsistent Formatting**: Each developer logs differently

### Benefits of Centralized Logger
✅ **Automatic PII Sanitization**: Emails, phones, tokens automatically masked
✅ **Sentry Integration**: Errors and warnings automatically sent to Sentry
✅ **Structured Logging**: Consistent format with timestamps and context
✅ **Production Safe**: Debug logs stripped, error/warn logs preserved
✅ **Searchable Metadata**: Rich context for debugging

---

## Quick Start

### 1. Import the Logger

```typescript
// At the top of your file
import { createLogger } from '@/modules/platform/logging/logger';

// Create a scoped logger for your module
const logger = createLogger({ context: 'MyComponent' });
```

### 2. Replace Console Statements

#### ❌ Before (Don't Do This)
```typescript
console.log('Processing payment:', paymentId);
console.error('Payment failed:', error);
console.log('User email:', user.email);
console.warn('Rate limit approaching');
```

#### ✅ After (Do This Instead)
```typescript
logger.info('Processing payment', { paymentId });
logger.error('Payment failed', { error, paymentId });
logger.info('User logged in', { email: user.email }); // Auto-sanitized!
logger.warn('Rate limit approaching', { currentRate: 95 });
```

---

## API Reference

### Log Levels

```typescript
logger.debug('Detailed debug info', metadata);   // Stripped in production
logger.info('General information', metadata);     // Stripped in production
logger.warn('Warning message', metadata);         // Kept in production
logger.error('Error occurred', metadata);         // Kept in production
```

### Metadata Structure

```typescript
type LogMetadata = {
  context?: string;        // Component/feature name
  feature?: string;        // Feature flag for filtering
  error?: unknown;         // Error object
  [key: string]: unknown;  // Any additional structured data
};
```

### Example Usage

```typescript
// Simple logging
logger.info('User signed in');

// With metadata
logger.info('User signed in', {
  userId: user.id,
  email: user.email,  // Auto-sanitized to: u***@domain.com
  method: 'oauth',
});

// Error logging
try {
  await processPayment();
} catch (error) {
  logger.error('Payment processing failed', {
    error,              // Full error object sent to Sentry
    userId: user.id,
    amount: payment.amount,
    feature: 'payments',
  });
}

// Debug logging (only in development)
logger.debug('Cache hit', {
  key: cacheKey,
  ttl: 3600,
});
```

---

## Migration Checklist

### For Each File:

- [ ] Import the logger: `import { createLogger } from '@/modules/platform/logging/logger'`
- [ ] Create scoped logger: `const logger = createLogger({ context: 'YourContext' })`
- [ ] Replace all `console.log` → `logger.info` or `logger.debug`
- [ ] Replace all `console.error` → `logger.error`
- [ ] Replace all `console.warn` → `logger.warn`
- [ ] Replace all `console.debug` → `logger.debug`
- [ ] Replace all `console.info` → `logger.info`
- [ ] Move contextual info from message string to metadata object
- [ ] Verify PII fields are in metadata (will be auto-sanitized)
- [ ] Test that logs appear correctly in development
- [ ] Remove any manual PII masking (logger handles it)

### Context Naming Conventions

Use clear, hierarchical context names:
- **Components**: `UserProfile`, `PaymentForm`, `BookingCalendar`
- **Services**: `AuthService`, `PaymentService`, `EmailService`
- **API Routes**: `API:Users`, `API:Bookings`, `API:Payments`
- **Middleware**: `Middleware:Auth`, `Middleware:CSRF`
- **Libraries**: `SupabaseClient`, `TwilioClient`

---

## Real-World Migration Examples

### Example 1: React Component

#### Before
```typescript
export function UserProfile({ userId }: Props) {
  useEffect(() => {
    console.log('Loading user:', userId);

    fetchUser(userId)
      .then(user => {
        console.log('User loaded:', user.email, user.name);
      })
      .catch(error => {
        console.error('Failed to load user:', error);
      });
  }, [userId]);
}
```

#### After
```typescript
import { createLogger } from '@/modules/platform/logging/logger';

const logger = createLogger({ context: 'UserProfile' });

export function UserProfile({ userId }: Props) {
  useEffect(() => {
    logger.debug('Loading user profile', { userId });

    fetchUser(userId)
      .then(user => {
        logger.info('User profile loaded', {
          userId,
          email: user.email,    // Auto-sanitized
          name: user.name,
        });
      })
      .catch(error => {
        logger.error('Failed to load user profile', {
          error,
          userId,
          feature: 'user-profile',
        });
      });
  }, [userId]);
}
```

### Example 2: API Route

#### Before
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Creating booking:', body);

    const booking = await createBooking(body);
    console.log('Booking created:', booking.id);

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Booking creation failed:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

#### After
```typescript
import { createLogger } from '@/modules/platform/logging/logger';

const logger = createLogger({ context: 'API:Bookings' });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    logger.info('Creating booking', {
      coachId: body.coachId,
      clientId: body.clientId,
      sessionType: body.sessionType,
    });

    const booking = await createBooking(body);
    logger.info('Booking created successfully', {
      bookingId: booking.id,
      coachId: booking.coachId,
    });

    return NextResponse.json(booking);
  } catch (error) {
    logger.error('Booking creation failed', {
      error,
      body,
      feature: 'bookings',
    });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Example 3: Service Class

#### Before
```typescript
class PaymentService {
  async processPayment(payment: Payment) {
    console.log('[PaymentService] Processing:', payment.id);

    try {
      const result = await this.gateway.charge(payment);
      console.log('[PaymentService] Success:', result);
      return result;
    } catch (error) {
      console.error('[PaymentService] Failed:', error);
      console.error('[PaymentService] Payment details:', payment);
      throw error;
    }
  }
}
```

#### After
```typescript
import { createLogger } from '@/modules/platform/logging/logger';

const logger = createLogger({ context: 'PaymentService' });

class PaymentService {
  async processPayment(payment: Payment) {
    logger.info('Processing payment', {
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    });

    try {
      const result = await this.gateway.charge(payment);
      logger.info('Payment processed successfully', {
        paymentId: payment.id,
        transactionId: result.transactionId,
      });
      return result;
    } catch (error) {
      logger.error('Payment processing failed', {
        error,
        paymentId: payment.id,
        amount: payment.amount,
        feature: 'payments',
      });
      throw error;
    }
  }
}
```

---

## PII Sanitization

### What Gets Sanitized?

The logger automatically detects and masks:

1. **Email Addresses**: `user@example.com` → `u***@example.com`
2. **Phone Numbers**: `+1234567890` → `***7890`
3. **Credit Cards**: `4532-1234-5678-9010` → `****-****-****-9010`
4. **API Keys/Tokens**: `sk_live_abcdef123456` → `sk_l***`
5. **Sensitive Keys**: Fields named `password`, `apiKey`, `secret`, etc. → `[REDACTED]`

### Example

```typescript
logger.info('User registered', {
  email: 'john.doe@example.com',      // → j***@example.com
  phone: '+1-555-123-4567',           // → ***4567
  apiKey: 'sk_live_abc123xyz',        // → sk_l***
  name: 'John Doe',                   // → John Doe (not PII)
  userId: 'usr_123',                  // → usr_123 (not PII)
});
```

### Manual Sanitization

If you need to sanitize data outside the logger:

```typescript
import { sanitize } from '@/modules/platform/logging/logger';

const masked = sanitize.email('user@example.com');     // → u***@example.com
const maskedPhone = sanitize.phone('+1234567890');     // → ***7890
const maskedToken = sanitize.token('sk_live_abc123');  // → sk_l***
const maskedAny = sanitize.value(userInput);           // → Auto-detect type
```

---

## Production Behavior

### Development
- All log levels appear in console
- Full messages and metadata visible
- PII is sanitized

### Production
- `debug` and `info` logs are **stripped** (not in bundle)
- `warn` and `error` logs are **preserved**
- Errors and warnings sent to Sentry
- PII is sanitized

### Build Configuration

The Next.js build is configured to:
```javascript
// next.config.js
compiler: {
  removeConsole: {
    exclude: ['error', 'warn'],  // Keep error/warn in production
  }
}
```

---

## Common Patterns

### Pattern 1: Timed Operations
```typescript
logger.debug('Starting expensive operation', { operationId });
const start = Date.now();

await expensiveOperation();

logger.debug('Operation completed', {
  operationId,
  durationMs: Date.now() - start,
});
```

### Pattern 2: Feature Flags
```typescript
logger.info('Feature accessed', {
  feature: 'new-booking-flow',
  userId,
  enabled: featureFlags.newBookingFlow,
});
```

### Pattern 3: Auth Events
```typescript
logger.warn('Failed login attempt', {
  email: loginAttempt.email,  // Auto-sanitized
  reason: 'invalid_password',
  ipAddress: request.ip,
  feature: 'authentication',
});
```

### Pattern 4: External API Calls
```typescript
logger.info('Calling external API', {
  service: 'Tranzila',
  endpoint: '/charge',
  method: 'POST',
});

try {
  const response = await fetch(url);
  logger.info('External API success', {
    service: 'Tranzila',
    status: response.status,
    durationMs,
  });
} catch (error) {
  logger.error('External API failed', {
    error,
    service: 'Tranzila',
    feature: 'payments',
  });
}
```

---

## Testing

### Unit Tests
```typescript
import { logger } from '@/modules/platform/logging/logger';

// Mock the logger in tests
jest.mock('@/modules/platform/logging/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));
```

### Verify Logs in Development
1. Run your code in development
2. Check console output has format: `[timestamp] [CONTEXT] [LEVEL] message`
3. Verify PII is masked
4. Check Sentry for error events (if configured)

---

## Migration Priority

### Phase 1: Critical (Security)
- ✅ Payment processing (`lib/alerts/payment-alerts.ts`)
- [ ] Authentication (`lib/auth/*.ts`)
- [ ] User management (`lib/users/*.ts`)
- [ ] API routes handling PII

### Phase 2: High-Volume
- [ ] Middleware (`src/middleware.ts`)
- [ ] Main services (`lib/services/*.ts`)
- [ ] Booking components
- [ ] Profile components

### Phase 3: Everything Else
- [ ] UI components
- [ ] Utility functions
- [ ] Scripts
- [ ] Tests

---

## FAQ

### Q: When should I use `logger.debug` vs `logger.info`?
**A:** Use `debug` for verbose diagnostic info you only need during development (stripped in production). Use `info` for important events you want to track in development only.

### Q: Should I still throw errors after logging them?
**A:** Yes! Logging doesn't replace error handling. Always throw/return errors as appropriate.

### Q: Can I log entire objects?
**A:** Yes, but be mindful. The logger will sanitize PII in objects, but very large objects can impact performance.

### Q: What if I need the raw unsanitized value?
**A:** Store it in a variable and use it in your code. Only pass it to the logger if you want it sanitized in logs.

### Q: How do I see logs in production?
**A:** Use Sentry for errors/warnings. For other logs, consider adding a production logging service like Datadog or LogRocket.

---

## Need Help?

- **Logger implementation**: `/src/modules/platform/logging/logger.ts`
- **Build config**: `/next.config.js` (line 43-50)
- **Example migration**: `/src/lib/alerts/payment-alerts.ts`
- **Report issues**: Create an issue in the repo

---

## Checklist for Code Reviewers

When reviewing PRs, verify:
- [ ] No `console.*` statements in new/modified code
- [ ] Logger imported from centralized location
- [ ] Context name follows conventions
- [ ] PII fields included in metadata (not in message string)
- [ ] Appropriate log level used (debug for verbose, error for errors, etc.)
- [ ] Error objects passed in metadata with `error` key
- [ ] Feature flags added where appropriate

---

*Last updated: 2025-11-14*
*Migration status: In Progress (Phase 1 - payment-alerts.ts completed)*
