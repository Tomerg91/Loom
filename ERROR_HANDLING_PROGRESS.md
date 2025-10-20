# Error Handling Standardization Progress

**Phase 6, Step 15: Standardize Error Handling Across Database Layer**

## Summary

Implemented comprehensive error handling infrastructure for the database layer using the Result pattern with DatabaseError for structured, actionable error reporting.

## ✅ Completed

### 1. Core Infrastructure
- **`src/lib/errors/database-errors.ts`** (545 lines)
  - 50+ standardized error codes (DB_1001 - DB_9999)
  - DatabaseError class with full context (code, message, userMessage, details, timestamp, resourceType, resourceId, operation, retryable)
  - Automatic PostgreSQL error code mapping
  - Factory methods for common scenarios
  - Type guards and parsing utilities

### 2. Enhanced Result Type
- **`src/lib/types/result.ts`** (enhanced)
  - Added `Result.fromDatabaseError()` helper
  - Enhanced `Result.fromSupabase()` with operation/resource context
  - Maintains backward compatibility

### 3. Documentation
- **`src/lib/errors/README.md`** (500+ lines)
  - Complete migration guide
  - Error code reference with categories
  - Client-side error handling examples
  - Testing patterns
  - Best practices checklist

### 4. Reference Implementation
- **`src/lib/database/users.ts`** (partially refactored)
  - `getUserProfile()` - Demonstrates Result.fromSupabase pattern
  - `updateUserProfile()` - Update operation handling
  - `updateLastSeen()` - Void return type example
  - `getUsersByRole()` - Array return type example

## 📊 Current State

### Error Code Categories
```typescript
1xxx - Authentication & Authorization (5 codes)
2xxx - Resource Not Found (7 codes)
3xxx - Validation Errors (10 codes)
4xxx - Conflict & Constraints (7 codes)
5xxx - Operation Errors (7 codes)
6xxx - Connection & Network (4 codes)
7xxx - Rate Limiting (3 codes)
8xxx - File & Storage (6 codes)
9xxx - Business Logic (7 codes)
9999 - Unknown Error
```

### Migration Status

**Files Analyzed:** 28 database files
**console.error Calls Found:** 166 across 12 files

| File | console.error Count | Status |
|------|---------------------|--------|
| `users.ts` | 30 | 🟡 Partial (4/30 methods) |
| `messaging.ts` | 21 | ⚪ Not Started |
| `admin-analytics.ts` | ~15 | ⚪ Not Started |
| `admin-system.ts` | ~10 | ⚪ Not Started |
| `availability.ts` | ~8 | ⚪ Not Started |
| `download-tracking.ts` | ~5 | ⚪ Not Started |
| `mfa-admin.ts` | ~7 | ⚪ Not Started |
| `notifications.ts` | ~12 | ⚪ Not Started |
| `resources/analytics.ts` | ~8 | ⚪ Not Started |
| `resources/collections.ts` | ~10 | ⚪ Not Started |
| `resources/queries.ts` | ~12 | ⚪ Not Started |
| `services/base-session.ts` | ~28 | ⚪ Not Started |

## 🎯 Success Criteria Progress

- [x] **Centralized error definitions created** - `database-errors.ts` with 50+ codes
- [x] **Error codes for client-side handling** - All codes have user messages
- [x] **Result pattern established** - Enhanced Result type with DatabaseError support
- [ ] **All database functions return Result<T, Error>** - 4/~300 methods migrated
- [ ] **No console.error in database layer** - 166 calls remain
- [x] **Client receives actionable error messages** - UserMessage field + error codes
- [x] **Error codes documented** - Comprehensive README with examples

## 📋 Next Steps

### Priority 1: Complete users.ts
**26 console.error calls remaining**

Methods to refactor:
- `getCoachClients()`
- `searchUsers()`
- `updateUserStatus()`
- `deleteUser()` (complex - 20+ console.error calls)
- `getUserStats()`
- `getUsers()`
- `getUsersCount()`

Estimated effort: 2-3 hours

### Priority 2: Refactor messaging.ts
**21 console.error calls**

Methods to refactor:
- `getUserConversations()`
- `getConversationMessages()`
- `sendMessage()`
- `markConversationAsRead()`
- `getUnreadMessageCount()`
- `canUserMessageUser()`
- `getOrCreateDirectConversation()`

Estimated effort: 1-2 hours

### Priority 3: Refactor remaining files
**~115 console.error calls across 10 files**

Estimated effort: 4-6 hours

### Priority 4: Testing & Verification
- Create test cases for error scenarios
- Verify all functions return Result<T>
- Test client-side error parsing
- Performance testing

Estimated effort: 2-3 hours

**Total Estimated Remaining Effort: 9-14 hours**

## 🔧 Refactoring Pattern

### Before
```typescript
async getUserProfile(userId: string): Promise<ResultType<User>> {
  try {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return Result.error(`Failed to fetch user profile: ${error.message}`);
    }

    if (!data) {
      return Result.error('User not found');
    }

    const user = this.mapDatabaseUserToUser(data);
    return Result.success(user);
  } catch (error) {
    console.error('Unexpected error:', error);
    return Result.error('Unexpected error occurred');
  }
}
```

### After
```typescript
async getUserProfile(userId: string): Promise<ResultType<User>> {
  try {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const result = Result.fromSupabase(data, error, 'fetch', 'User');
    if (!result.success) {
      return result;
    }

    const user = this.mapDatabaseUserToUser(result.data);
    return Result.success(user);
  } catch (error) {
    const dbError = DatabaseError.operationFailed('fetch user profile', 'User', {
      userId,
      originalError: error instanceof Error ? error.message : String(error),
    });
    return Result.fromDatabaseError(dbError);
  }
}
```

**Key Changes:**
1. ✅ Removed `console.error` calls
2. ✅ Used `Result.fromSupabase()` for automatic error handling
3. ✅ Added operation and resource type context
4. ✅ Used `DatabaseError.operationFailed()` for unexpected errors
5. ✅ Included details object with context

## 🧪 Client-Side Usage Example

```typescript
// In React component
const result = await getUserProfile(userId);

if (!result.success) {
  const dbError = DatabaseError.fromResultError(result.error);

  if (dbError) {
    // Structured error handling by code
    switch (dbError.code) {
      case DB_ERROR_CODES.USER_NOT_FOUND:
        toast.error('User not found');
        router.push('/users');
        break;

      case DB_ERROR_CODES.FORBIDDEN:
        toast.error('Access denied');
        break;

      default:
        toast.error(dbError.userMessage);
        console.error('Database error:', dbError.toJSON());
    }
  }
  return null;
}

// Success case
const user = result.data;
return <UserProfile user={user} />;
```

## 📦 Files Created/Modified

### New Files
- `src/lib/errors/database-errors.ts` (545 lines)
- `src/lib/errors/README.md` (500+ lines)

### Modified Files
- `src/lib/types/result.ts` (+30 lines)
- `src/lib/database/users.ts` (4 methods refactored)

### Total New Code
- ~1,100 lines of error handling infrastructure
- ~70 lines of refactored database methods

## 🚀 Benefits

1. **Consistency**: All database errors follow the same pattern
2. **Actionable**: Error codes enable programmatic client-side handling
3. **User-Friendly**: UserMessage field provides clear feedback
4. **Debuggable**: Structured error details aid troubleshooting
5. **Type-Safe**: Full TypeScript support with Result pattern
6. **Testable**: Predictable error structure simplifies testing
7. **Retryable**: Built-in retryable flag for transient errors
8. **Traceable**: Timestamp, operation, and resource tracking

## ⚠️ Known Issues

1. **Pre-commit Hook Failures**: TypeScript errors in unrelated files (tasks module, API routes) are preventing git commits. These are pre-existing issues.

2. **Incomplete Migration**: Only 4 out of ~300 database methods have been refactored.

3. **Mixed Patterns**: Codebase currently has both old (console.error) and new (DatabaseError) patterns.

## 📝 Recommendations

1. **Fix TypeScript Errors**: Address pre-existing type errors in tasks module and API routes to enable commits

2. **Continue Migration**: Systematically refactor remaining database files following the established pattern

3. **Add Tests**: Create comprehensive test suite for error scenarios

4. **Update Callers**: Update API routes and components to use new error parsing

5. **Monitor Errors**: Add error tracking/logging to monitor error patterns in production

## 📚 References

- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Supabase Error Handling](https://supabase.com/docs/reference/javascript/error-handling)
- [Result Pattern Best Practices](https://khalilstemmler.com/articles/enterprise-typescript-nodejs/functional-error-handling/)
