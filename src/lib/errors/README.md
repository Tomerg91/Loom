# Database Error Handling Guide

This guide explains how to use the standardized error handling system in the database layer.

## Overview

All database operations should return `Result<T>` and use `DatabaseError` for consistent, actionable error handling. This eliminates exceptions, provides structured error information, and enables proper client-side error handling.

## Quick Start

### 1. Import Required Types

```typescript
import { DatabaseError, DB_ERROR_CODES } from '@/lib/errors/database-errors';
import { Result, type Result as ResultType } from '@/lib/types/result';
```

### 2. Basic Pattern for Database Functions

```typescript
async function getUserById(userId: string): Promise<ResultType<User>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Use Result.fromSupabase for automatic error handling
    const result = Result.fromSupabase(data, error, 'fetch', 'User');
    if (!result.success) {
      return result;
    }

    // Transform data if needed
    const user = mapDatabaseUserToUser(result.data);
    return Result.success(user);
  } catch (error) {
    // Handle unexpected errors
    const dbError = DatabaseError.operationFailed('fetch user', 'User', {
      userId,
      originalError: error instanceof Error ? error.message : String(error),
    });
    return Result.fromDatabaseError(dbError);
  }
}
```

### 3. Creating Custom Errors

```typescript
// Not found error
if (!user) {
  return Result.fromDatabaseError(
    DatabaseError.notFound('User', userId)
  );
}

// Validation error
if (!isValidEmail(email)) {
  return Result.fromDatabaseError(
    DatabaseError.validation('Invalid email address', { email })
  );
}

// Forbidden error
if (user.role !== 'admin') {
  return Result.fromDatabaseError(
    DatabaseError.forbidden('User', 'delete account')
  );
}

// Custom error with specific code
const error = DatabaseError.create(
  DB_ERROR_CODES.SESSION_CONFLICT,
  'Cannot book session during existing session',
  'This time slot conflicts with an existing session',
  { existingSessionId, requestedTime }
);
return Result.fromDatabaseError(error);
```

## Migration Checklist

When refactoring existing database functions:

### ✅ Step 1: Add Imports
```typescript
import { DatabaseError } from '@/lib/errors/database-errors';
```

### ✅ Step 2: Replace console.error

**Before:**
```typescript
if (error) {
  console.error('Error fetching user:', error);
  return Result.error(`Failed to fetch user: ${error.message}`);
}
```

**After:**
```typescript
if (error) {
  const dbError = DatabaseError.fromSupabaseError(error, 'fetch', 'User');
  return Result.fromDatabaseError(dbError);
}
```

### ✅ Step 3: Use Result.fromSupabase

**Before:**
```typescript
const { data, error } = await supabase.from('users').select('*');

if (error) {
  console.error('Error:', error);
  return Result.error(error.message);
}

if (!data) {
  return Result.error('User not found');
}

return Result.success(data);
```

**After:**
```typescript
const { data, error } = await supabase.from('users').select('*');

return Result.fromSupabase(data, error, 'fetch', 'User');
```

### ✅ Step 4: Wrap in try-catch

**Before:**
```typescript
async function getUser(id: string) {
  const { data, error } = await supabase...
  // ...
}
```

**After:**
```typescript
async function getUser(id: string): Promise<ResultType<User>> {
  try {
    const { data, error } = await supabase...
    // ...
  } catch (error) {
    const dbError = DatabaseError.operationFailed('fetch user', 'User', {
      userId: id,
      originalError: error instanceof Error ? error.message : String(error),
    });
    return Result.fromDatabaseError(dbError);
  }
}
```

### ✅ Step 5: Update Return Type

Ensure all database functions return `Promise<ResultType<T>>`:

```typescript
// Before
async function updateUser(id: string, updates: Partial<User>): Promise<User | null>

// After
async function updateUser(id: string, updates: Partial<User>): Promise<ResultType<User>>
```

## Error Codes Reference

### Authentication & Authorization (1xxx)
- `DB_1001` - UNAUTHORIZED: User not authenticated
- `DB_1002` - FORBIDDEN: Insufficient permissions
- `DB_1003` - INVALID_CREDENTIALS: Wrong email/password
- `DB_1004` - SESSION_EXPIRED: Session timeout
- `DB_1005` - MFA_REQUIRED: MFA verification needed

### Resource Not Found (2xxx)
- `DB_2001` - NOT_FOUND: Generic resource not found
- `DB_2002` - USER_NOT_FOUND: User doesn't exist
- `DB_2003` - SESSION_NOT_FOUND: Session doesn't exist
- `DB_2004` - FILE_NOT_FOUND: File doesn't exist
- `DB_2005` - MESSAGE_NOT_FOUND: Message doesn't exist
- `DB_2006` - NOTIFICATION_NOT_FOUND: Notification doesn't exist
- `DB_2007` - RESOURCE_NOT_FOUND: Resource doesn't exist

### Validation Errors (3xxx)
- `DB_3001` - VALIDATION_ERROR: Generic validation failure
- `DB_3002` - INVALID_INPUT: Invalid input data
- `DB_3003` - MISSING_REQUIRED_FIELD: Required field missing
- `DB_3004` - INVALID_EMAIL: Email format invalid
- `DB_3005` - INVALID_PHONE: Phone number invalid
- `DB_3006` - INVALID_TIMEZONE: Timezone invalid
- `DB_3007` - INVALID_LANGUAGE: Language code invalid
- `DB_3008` - INVALID_DATE_RANGE: Date range invalid
- `DB_3009` - INVALID_FILE_TYPE: File type not allowed
- `DB_3010` - FILE_TOO_LARGE: File exceeds size limit

### Conflict & Constraints (4xxx)
- `DB_4001` - CONFLICT: Generic conflict
- `DB_4002` - DUPLICATE_ENTRY: Duplicate value
- `DB_4003` - FOREIGN_KEY_VIOLATION: Referenced record not found
- `DB_4004` - UNIQUE_VIOLATION: Unique constraint violated
- `DB_4005` - CHECK_VIOLATION: Check constraint failed
- `DB_4006` - SESSION_CONFLICT: Session time conflict
- `DB_4007` - AVAILABILITY_CONFLICT: Availability conflict

### Operation Errors (5xxx)
- `DB_5001` - OPERATION_FAILED: Generic operation failure
- `DB_5002` - CREATE_FAILED: Create operation failed
- `DB_5003` - UPDATE_FAILED: Update operation failed
- `DB_5004` - DELETE_FAILED: Delete operation failed
- `DB_5005` - QUERY_FAILED: Query operation failed
- `DB_5006` - TRANSACTION_FAILED: Transaction failed
- `DB_5007` - RPC_FAILED: RPC call failed

### Connection & Network (6xxx)
- `DB_6001` - CONNECTION_ERROR: Database connection failed
- `DB_6002` - TIMEOUT: Operation timed out
- `DB_6003` - NETWORK_ERROR: Network error occurred
- `DB_6004` - SERVICE_UNAVAILABLE: Service unavailable

### Rate Limiting (7xxx)
- `DB_7001` - RATE_LIMIT_EXCEEDED: Too many requests
- `DB_7002` - QUOTA_EXCEEDED: Quota limit exceeded
- `DB_7003` - TOO_MANY_REQUESTS: Request throttled

### File & Storage (8xxx)
- `DB_8001` - STORAGE_ERROR: Storage operation failed
- `DB_8002` - UPLOAD_FAILED: File upload failed
- `DB_8003` - DOWNLOAD_FAILED: File download failed
- `DB_8004` - DELETE_FILE_FAILED: File deletion failed
- `DB_8005` - VIRUS_DETECTED: Malware detected
- `DB_8006` - FILE_QUARANTINED: File quarantined

### Business Logic (9xxx)
- `DB_9001` - BUSINESS_RULE_VIOLATION: Business rule violated
- `DB_9002` - INSUFFICIENT_PERMISSIONS: Permission denied
- `DB_9003` - ACCOUNT_SUSPENDED: Account suspended
- `DB_9004` - ACCOUNT_DELETED: Account deleted
- `DB_9005` - SESSION_CANCELLED: Session cancelled
- `DB_9006` - SESSION_COMPLETED: Session already completed
- `DB_9007` - PAYMENT_REQUIRED: Payment required

### Unknown (9999)
- `DB_9999` - UNKNOWN_ERROR: Unexpected error

## Client-Side Error Handling

```typescript
// In React components or API handlers
const result = await getUserProfile(userId);

if (!result.success) {
  // Parse the DatabaseError from the result
  const dbError = DatabaseError.fromResultError(result.error);

  if (dbError) {
    // Structured error handling
    switch (dbError.code) {
      case DB_ERROR_CODES.USER_NOT_FOUND:
        return <NotFoundPage />;

      case DB_ERROR_CODES.FORBIDDEN:
        return <ForbiddenPage />;

      case DB_ERROR_CODES.UNAUTHORIZED:
        redirect('/login');
        return null;

      default:
        // Show user-friendly message
        toast.error(dbError.userMessage);

        // Log technical details for debugging
        console.error('Database error:', {
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          timestamp: dbError.timestamp,
        });
    }
  } else {
    // Fallback for non-DatabaseError strings
    toast.error(result.error);
  }

  return null;
}

// Success case
const user = result.data;
return <UserProfile user={user} />;
```

## Testing Error Handling

```typescript
import { DatabaseError, DB_ERROR_CODES } from '@/lib/errors/database-errors';

describe('getUserProfile', () => {
  it('returns DatabaseError when user not found', async () => {
    // Mock Supabase to return error
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    const result = await getUserProfile('user-123');

    expect(result.success).toBe(false);

    const error = DatabaseError.fromResultError(result.error!);
    expect(error).toBeDefined();
    expect(error!.code).toBe(DB_ERROR_CODES.NOT_FOUND);
    expect(error!.resourceType).toBe('User');
  });
});
```

## Best Practices

### ✅ DO

- Use `Result.fromSupabase()` for all Supabase queries
- Wrap operations in try-catch for unexpected errors
- Provide operation and resourceType for better error context
- Use specific error codes when possible
- Include relevant details in error objects
- Return `ResultType<T>` from all database functions
- Parse and handle `DatabaseError` on the client side

### ❌ DON'T

- Use `console.error()` instead of returning errors
- Throw exceptions from database functions
- Return `null` or `undefined` for errors
- Use generic error messages without codes
- Swallow errors silently
- Mix error handling patterns (choose Result pattern consistently)
- Expose raw database errors to end users

## Migration Progress

Track migration progress for each database file:

- [x] `src/lib/errors/database-errors.ts` - Created
- [x] `src/lib/types/result.ts` - Enhanced
- [ ] `src/lib/database/users.ts` - In Progress (4/30 methods migrated)
- [ ] `src/lib/database/messaging.ts` - 21 console.error calls
- [ ] `src/lib/database/admin-analytics.ts`
- [ ] `src/lib/database/admin-system.ts`
- [ ] `src/lib/database/availability.ts`
- [ ] `src/lib/database/download-tracking.ts`
- [ ] `src/lib/database/mfa-admin.ts`
- [ ] `src/lib/database/notifications.ts`
- [ ] `src/lib/database/resources/analytics.ts`
- [ ] `src/lib/database/resources/collections.ts`
- [ ] `src/lib/database/resources/queries.ts`
- [ ] `src/lib/database/services/base-session.ts`

## Getting Help

If you encounter issues during migration:

1. Check this documentation first
2. Look at refactored examples in `users.ts`
3. Refer to `database-errors.ts` for available error types
4. Review test cases for pattern examples
