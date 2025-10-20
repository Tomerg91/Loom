# RLS Error Handler Design

**Step 16: User-Friendly Error Messages for RLS Violations**

**Date:** 2025-10-20
**Status:** Design Approved
**Dependencies:** Step 15 (RLS policies implemented)

---

## Overview

Transform Row-Level Security (RLS) policy violations from raw PostgreSQL errors into actionable, user-friendly messages. All RLS violations will be logged to Sentry for admin review while presenting clear permission errors to users.

## Goals

1. **User Experience**: Replace raw SQL errors with clear, operation-specific messages
2. **Admin Visibility**: Log all RLS violations to Sentry with full context for investigation
3. **DRY Architecture**: Single automatic wrapper handles all RLS detection
4. **Integration**: Leverage existing DatabaseError system without duplication

## Requirements Summary

- **Message Specificity**: Operation-specific messages (e.g., "Can't add to collection" vs generic "Permission denied")
- **Logging Strategy**: Console + Sentry integration for admin review
- **Detection Pattern**: Automatic wrapper function catches and translates errors
- **Architecture**: Extend existing DatabaseError class (single source of truth)

---

## Architecture

### Core Components

```
src/lib/errors/database-errors.ts (EXTENDED)
├── New RLS error codes (DB_9008-DB_9012)
├── RLS operation message map
├── Enhanced fromSupabaseError() with RLS detection
├── wrapDatabaseOperation() wrapper function
└── Sentry integration for RLS logging

src/lib/services/resource-library-service.ts (UPDATED)
└── All mutation methods wrapped with DatabaseError.wrapDatabaseOperation()
```

### Design Decisions

**Why extend DatabaseError vs new module?**

- Single source of truth for all database errors
- Reuses existing error code system and Result pattern
- No duplication of Supabase error parsing logic
- Consistent error handling across entire application

**Why automatic wrapper vs manual checks?**

- DRY: Write once, use everywhere
- Impossible to forget RLS handling
- Consistent logging across all operations
- Easier to update message mappings centrally

---

## Error Detection Logic

### RLS Violation Indicators

PostgreSQL RLS violations are identified by:

1. **Error Code**: `42501` (insufficient_privilege)
2. **Error Messages**:
   - "row-level security policy"
   - "new row violates row-level security"
   - "permission denied for table"

### Enhanced fromSupabaseError()

```typescript
static fromSupabaseError(
  error: unknown,
  operation?: string,
  resourceType?: string
): DatabaseError {
  const supabaseError = error as SupabaseError;

  // Detect RLS violations
  if (isRLSViolation(supabaseError)) {
    logRLSViolation(supabaseError, operation, resourceType);
    return createRLSError(operation, resourceType);
  }

  // Existing error mapping logic...
}
```

---

## Error Codes

### New RLS Error Codes

Add to existing `DB_ERROR_CODES` object:

```typescript
// Row-Level Security (9xxx - Business Logic)
RLS_VIOLATION: 'DB_9008',
RLS_INSERT_DENIED: 'DB_9009',
RLS_UPDATE_DENIED: 'DB_9010',
RLS_DELETE_DENIED: 'DB_9011',
RLS_SELECT_DENIED: 'DB_9012',
```

### Default User Messages

```typescript
[DB_ERROR_CODES.RLS_VIOLATION]: 'You do not have permission to perform this action.',
[DB_ERROR_CODES.RLS_INSERT_DENIED]: 'You do not have permission to create this resource.',
[DB_ERROR_CODES.RLS_UPDATE_DENIED]: 'You do not have permission to modify this resource.',
[DB_ERROR_CODES.RLS_DELETE_DENIED]: 'You do not have permission to delete this resource.',
[DB_ERROR_CODES.RLS_SELECT_DENIED]: 'You do not have permission to access this resource.',
```

---

## Operation-Specific Messages

### Resource Library Operation Map

```typescript
const RLS_OPERATION_MESSAGES: Record<string, string> = {
  // Resource operations
  uploadResource: "You don't have permission to upload resources",
  updateResource: "You don't have permission to modify this resource",
  deleteResource: "You don't have permission to delete this resource",

  // Collection operations
  createCollection: "You don't have permission to create collections",
  updateCollection: "You don't have permission to modify this collection",
  deleteCollection: "You don't have permission to delete this collection",
  addToCollection:
    "You don't have permission to add resources to this collection",
  removeFromCollection:
    "You don't have permission to remove resources from this collection",

  // Sharing operations
  shareWithAllClients: "You don't have permission to share this resource",
  getResourceShares: "You don't have permission to view resource shares",

  // Settings
  updateSettings: "You don't have permission to update library settings",
};
```

### Message Selection Priority

1. **Operation-specific** (if operation provided): Use `RLS_OPERATION_MESSAGES[operation]`
2. **SQL operation type** (INSERT/UPDATE/DELETE/SELECT): Use specific RLS code message
3. **Fallback**: Generic `RLS_VIOLATION` message

---

## Wrapper Function Pattern

### wrapDatabaseOperation()

New static method in DatabaseError class:

```typescript
static async wrapDatabaseOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    const result = await fn();
    return Result.success(result);
  } catch (error) {
    const dbError = DatabaseError.fromSupabaseError(error, operation);
    return Result.error(dbError.toString());
  }
}
```

**Features:**

- Generic type support for any return type
- Automatic error detection and transformation
- Integrates seamlessly with Result pattern
- Operation context passed automatically

---

## Service Integration

### Before (Current Pattern)

```typescript
async uploadResource(...): Promise<Result<ResourceLibraryItem>> {
  try {
    const uploadResult = await fileService.uploadFile(file, userId, metadata);
    if (!uploadResult.success) {
      return Result.error(uploadResult.error || 'File upload failed');
    }

    const { error: updateError } = await supabase
      .from('file_uploads')
      .update({ is_library_resource: true })
      .eq('id', fileId);

    if (updateError) {
      return Result.error(`Failed to mark as library resource: ${updateError.message}`);
    }

    // ... more operations
  } catch (error) {
    return Result.error(
      error instanceof Error ? error.message : 'Resource upload failed'
    );
  }
}
```

### After (With Wrapper)

```typescript
async uploadResource(...): Promise<Result<ResourceLibraryItem>> {
  return DatabaseError.wrapDatabaseOperation('uploadResource', async () => {
    const uploadResult = await fileService.uploadFile(file, userId, metadata);
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'File upload failed');
    }

    const { error: updateError } = await supabase
      .from('file_uploads')
      .update({ is_library_resource: true })
      .eq('id', fileId);

    if (updateError) {
      throw DatabaseError.fromSupabaseError(updateError, 'uploadResource');
    }

    // ... more operations
    return resource; // Return data directly
  });
}
```

**Changes:**

- Outer try-catch removed (wrapper handles it)
- Errors thrown instead of early returns
- Return data directly (wrapper creates Result.success)
- RLS errors automatically caught and translated

### Methods to Update

All mutation methods in `ResourceLibraryService` (~15 methods):

**Resource Operations:**

- `uploadResource()`
- `updateResource()`
- `deleteResource()`

**Collection Operations:**

- `createCollection()`
- `updateCollection()`
- `deleteCollection()`
- `addToCollection()`
- `removeFromCollection()`

**Sharing Operations:**

- `shareWithAllClients()`

**Settings:**

- `updateSettings()`

---

## Logging and Monitoring

### Console Logging Format

```typescript
console.error('[RLS_VIOLATION]', {
  code: 'DB_9008',
  operation: 'addToCollection',
  userId: 'uuid-here',
  resourceId: 'resource-uuid',
  resourceType: 'resource_collection_items',
  timestamp: '2025-10-20T12:34:56.789Z',
  supabaseError: {
    code: '42501',
    message: 'new row violates row-level security policy',
    details: '...',
    hint: '...',
  },
});
```

### Sentry Integration

```typescript
import * as Sentry from '@sentry/nextjs';

function logRLSViolation(
  error: SupabaseError,
  operation?: string,
  resourceType?: string
): void {
  // Console log (structured)
  console.error('[RLS_VIOLATION]', {
    /* ... */
  });

  // Sentry capture
  Sentry.captureException(new Error(`RLS Violation: ${operation}`), {
    level: 'warning', // Expected security boundary, not a bug
    tags: {
      errorType: 'rls_violation',
      operation: operation || 'unknown',
      resourceType: resourceType || 'unknown',
    },
    extra: {
      supabaseErrorCode: error.code,
      supabaseMessage: error.message,
      supabaseDetails: error.details,
      supabaseHint: error.hint,
      timestamp: new Date().toISOString(),
    },
    contexts: {
      rls: {
        operation,
        resourceType,
        errorCode: 'DB_9008',
      },
    },
  });
}
```

**Why level: 'warning'?**

- RLS violations are expected security boundaries
- Not application bugs (like uncaught exceptions)
- Useful for monitoring access patterns
- Shouldn't trigger critical alerts

### Sentry Dashboard Queries

Admins can filter in Sentry:

- **Tag**: `errorType:rls_violation`
- **Tag**: `operation:addToCollection` (specific operation)
- **Level**: `warning`

---

## Security Considerations

### Information Disclosure Prevention

**Never expose to users:**

- SQL table names
- Column names
- RLS policy names
- Internal IDs or structure details
- PostgreSQL error codes

**Users see:**

```
"You don't have permission to add resources to this collection"
```

**Admins see (Sentry):**

```json
{
  "error": "new row violates row-level security policy for table \"resource_collection_items\"",
  "operation": "addToCollection",
  "userId": "uuid-here",
  "resourceType": "resource_collection_items",
  "supabaseCode": "42501"
}
```

### Audit Trail

All RLS violations create:

1. **Console log entry** (server logs, CloudWatch, etc.)
2. **Sentry event** (searchable, alertable)
3. **Timestamp** for correlation with user actions

This provides complete audit trail without database overhead.

---

## Testing Strategy

### Unit Tests (database-errors.ts)

```typescript
describe('DatabaseError RLS handling', () => {
  it('detects RLS violation from error code 42501', () => {
    const error = { code: '42501', message: 'permission denied' };
    const result = DatabaseError.fromSupabaseError(error, 'uploadResource');
    expect(result.code).toBe('DB_9008');
    expect(result.userMessage).toBe(
      "You don't have permission to upload resources"
    );
  });

  it('detects RLS violation from message pattern', () => {
    const error = {
      code: '23000',
      message: 'new row violates row-level security',
    };
    const result = DatabaseError.fromSupabaseError(error, 'addToCollection');
    expect(result.code).toBe('DB_9008');
  });

  it('logs to Sentry when RLS violation detected', () => {
    // Mock Sentry.captureException
    // Verify it's called with correct parameters
  });
});
```

### Integration Tests (resource-library-service.test.ts)

```typescript
describe('ResourceLibraryService RLS error handling', () => {
  it('returns friendly message when RLS denies addToCollection', async () => {
    // Create collection owned by coach1
    // Try to add resource as coach2
    const result = await service.addToCollection(collection.id, coach2Id, [
      resourceId,
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("don't have permission to add resources");
    expect(result.error).not.toContain('42501'); // No raw error code
    expect(result.error).not.toContain('row-level security'); // No SQL message
  });
});
```

### Manual Testing Checklist

- [ ] Upload resource as wrong user → Friendly error
- [ ] Add to collection not owned → Friendly error
- [ ] Share resource not owned → Friendly error
- [ ] Delete resource not owned → Friendly error
- [ ] Create collection with RLS deny → Friendly error
- [ ] Check Sentry dashboard → RLS events logged
- [ ] Verify console logs → Structured RLS data

---

## Success Criteria

✅ **User Experience:**

- No raw SQL errors visible to users
- Operation-specific, actionable messages
- Consistent error format across all operations

✅ **Admin Visibility:**

- All RLS violations logged to Sentry
- Searchable by operation, user, resource
- Includes full context for investigation

✅ **Code Quality:**

- DRY: Single wrapper handles all detection
- No code duplication across service methods
- Type-safe Result pattern maintained

✅ **Testing:**

- Unit tests for RLS detection logic
- Integration tests for service methods
- Manual verification of user messages

---

## Implementation Phases

### Phase 1: Core Error Handling (database-errors.ts)

1. Add new RLS error codes to `DB_ERROR_CODES`
2. Add default user messages for RLS codes
3. Create `RLS_OPERATION_MESSAGES` map
4. Implement `isRLSViolation()` detection function
5. Implement `logRLSViolation()` with Sentry integration
6. Enhance `fromSupabaseError()` with RLS detection
7. Create `wrapDatabaseOperation()` wrapper function

### Phase 2: Service Integration (resource-library-service.ts)

1. Import `DatabaseError` wrapper
2. Update `uploadResource()` method
3. Update `updateResource()` method
4. Update `deleteResource()` method
5. Update `createCollection()` method
6. Update `updateCollection()` method
7. Update `deleteCollection()` method
8. Update `addToCollection()` method
9. Update `removeFromCollection()` method
10. Update `shareWithAllClients()` method
11. Update `updateSettings()` method

### Phase 3: Testing & Validation

1. Write unit tests for RLS detection
2. Write integration tests for service methods
3. Manual testing with real RLS policies
4. Verify Sentry logging
5. Check console log format
6. User acceptance testing

---

## Future Enhancements

**Potential improvements (out of scope for Step 16):**

1. **Contextual RLS Messages**: Parse error details to provide even more context
   - "Can't add - you don't own this collection"
   - "Can't share - resource belongs to another coach"

2. **RLS Analytics Dashboard**: Query Sentry data to show:
   - Most common RLS violations by operation
   - Users triggering most violations (potential bugs or attacks)
   - Trends over time

3. **Client-Side Preventive UI**: Use RLS error patterns to:
   - Disable buttons before RLS violation occurs
   - Show permission warnings proactively
   - Better UX than showing errors after attempt

4. **Automated RLS Testing**: Generate tests from RLS policies:
   - Parse policy definitions
   - Auto-create test cases for each policy
   - Verify expected denials happen

---

## References

- **Step Dependencies**: Step 15 (RLS policies implemented)
- **Related Files**:
  - `src/lib/errors/database-errors.ts` (existing error system)
  - `src/lib/services/resource-library-service.ts` (mutations to update)
  - `src/lib/types/result.ts` (Result pattern)
  - `supabase/migrations/20260109000001_resource_library_rls.sql` (RLS policies)

- **PostgreSQL Docs**:
  - [Error Codes Appendix](https://www.postgresql.org/docs/current/errcodes-appendix.html)
  - [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

- **Sentry Docs**:
  - [captureException API](https://docs.sentry.io/platforms/javascript/usage/)
  - [Tags and Context](https://docs.sentry.io/platforms/javascript/enriching-events/)
