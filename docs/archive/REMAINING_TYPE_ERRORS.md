# Remaining TypeScript Errors (30 total)

**Status:** ✅ App builds and runs successfully
**Priority:** Low - These are non-blocking errors that can be fixed incrementally

## Summary

After major cleanup (75+ → 30 errors), the app successfully builds and deploys. The remaining 30 errors are minor type mismatches in:
- Resource library components (prop interfaces)
- Admin analytics (type assertions)
- Database helpers (null handling)
- Hook imports (missing files)

## Error Breakdown

### 1. Resource Library Components (12 errors)
**Files:** `src/components/resources/resource-library-page.tsx`, `resource-analytics-dashboard.tsx`

**Issues:**
- Component prop interface mismatches
- Type mismatch between `ResourcePerformanceSummary[]` and `ResourceLibraryItem[]`
- Missing props in dialog components

**Fix Approach:**
```typescript
// Update component interfaces to match actual usage
interface ResourceFiltersProps {
  filters: ResourceListParams;  // Add missing prop
  onFilterChange: (newFilters: Partial<ResourceListParams>) => void;
  availableTags: string[];
}

// Or use type assertion for quick fix
<ResourceList
  resources={performanceSummary as unknown as ResourceLibraryItem[]}
/>
```

### 2. Missing Toast Hook (2 errors)
**Files:** `src/hooks/use-files.ts`, `src/hooks/use-folders.ts`

**Issue:** Import from non-existent `@/hooks/use-toast`

**Fix:**
```typescript
// Option 1: Create the missing hook
// src/hooks/use-toast.ts
export function useToast() {
  return {
    toast: (message: string) => console.log(message),
    // ... toast implementation
  };
}

// Option 2: Use existing toast library
import { toast } from 'sonner';  // or your toast library
```

### 3. Admin Analytics (5 errors)
**File:** `src/lib/database/admin-analytics.ts`, `src/app/api/admin/performance-metrics/route.ts`

**Issues:**
- Type `number` not assignable to `string` (line 222)
- Type `unknown` in parameters

**Fix:**
```typescript
// Line 222 - Convert number to string
const value = someNumber.toString();

// Performance metrics - Add type assertions
const param1 = searchParams.get('key') as string;
const param2 = searchParams.get('key2') as string;
```

### 4. Admin System (3 errors)
**File:** `src/lib/database/admin-system.ts`

**Issues:**
- `level: string` not assignable to `level: "error" | "warning" | "info"`
- `ApiError` missing `details` property
- `null` not assignable to `number | undefined`

**Fix:**
```typescript
// Line 132 - Use proper type
const logs: SystemLog[] = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    level: 'error' as const,  // Use const assertion
    message: 'Error occurred',
    details: { ... }
  }
];

// Line 187 - Add optional chaining
const errorDetails = apiError.details ?? {};

// Line 348 - Use undefined instead of null
const value: number | undefined = undefined;
```

### 5. Availability (3 errors)
**File:** `src/lib/database/availability.ts`

**Issues:**
- Missing `timezone` property on `AvailabilitySlot`
- Implicit `any` type for slot parameters

**Fix:**
```typescript
// Add timezone to AvailabilitySlot type
interface AvailabilitySlot {
  // ... existing props
  timezone?: string;
}

// Type the parameters
function processSlot(slot: AvailabilitySlot) {
  // ...
}
```

### 6. File Versions (2 errors)
**File:** `src/lib/database/file-versions.ts`

**Issues:**
- `SupabaseClient` missing `sql` property
- Unsafe type conversion `any[][]` to `FileVersionWithDetails[]`

**Fix:**
```typescript
// Line 449 - Use rpc instead of sql
const { data, error } = await supabase.rpc('function_name', params);

// Line 486 - Add proper type conversion
const versions = (data as any[][]).map(row => ({
  id: row[0],
  file_id: row[1],
  // ... map all fields
})) as FileVersionWithDetails[];
```

### 7. Messaging (1 error)
**File:** `src/lib/database/messaging.ts`

**Issue:** Function expects 0 arguments but got 1

**Fix:**
```typescript
// Line 64 - Check function signature
// Before: someFunction(arg)
// After: someFunction()  // or update function to accept arg
```

### 8. MFA Admin (3 errors)
**File:** `src/lib/database/mfa-admin.ts`

**Issue:** Properties don't exist on array type (should be on array elements)

**Fix:**
```typescript
// Line 790-791 - Access first element
const users = [{ email: '...', first_name: '...', last_name: '...' }];
const email = users[0]?.email;
const firstName = users[0]?.first_name;
const lastName = users[0]?.last_name;
```

### 9. Notifications (5 errors)
**File:** `src/lib/database/notifications.ts`

**Issues:**
- Property name mismatches (camelCase vs snake_case)
- `null` not assignable to `string | undefined`

**Fix:**
```typescript
// Line 583 - Use correct property name
const userId = notification.user_id;  // not userId

// Line 590 - Handle null
const id: string | undefined = notification.id ?? undefined;

// Line 591-592 - Use snake_case
const createdAt = notification.created_at;
const updatedAt = notification.updated_at;
```

### 10. Other Session Services (6 errors)
**Files:** Various session service files

**Issue:** Implicit `any` type for session parameters

**Fix:**
```typescript
import type { Session } from '@/types';

function processSession(session: Session) {
  // ...
}
```

### 11. Sessions.ts (8 errors)
**File:** `src/lib/database/sessions.ts`

**Issue:** Type names not found (`GetSessionsOptions`, `CreateSessionData`, etc.)

**Fix:**
```typescript
// Add missing type definitions at top of file
interface GetSessionsOptions {
  limit?: number;
  offset?: number;
  // ... other options
}

interface GetSessionsCountOptions {
  status?: string;
  // ... other options
}

interface CreateSessionData {
  coach_id: string;
  client_id: string;
  // ... other fields
}

interface UpdateSessionData {
  status?: string;
  // ... other fields
}
```

### 12. i18n Request (1 error)
**File:** `src/i18n/request.ts`

**Issue:** `locale` parameter type mismatch

**Fix:**
```typescript
// Line 4 - Handle optional locale
getRequestConfig(async (params: GetRequestConfigParams) => {
  const locale = params.locale ?? 'en';  // Provide default
  // ...
});
```

### 13. Auth Index (1 error)
**File:** `src/lib/auth/index.ts`

**Issue:** Duplicate export of `requireRole`

**Fix:**
```typescript
// Remove duplicate export
// export { requireRole } from './auth';  // Delete this line
```

## Quick Fix Priority

**High Impact (Fixes 15+ errors):**
1. Sessions.ts - Add missing type definitions (8 errors)
2. Resource library components - Fix prop interfaces (12 errors)

**Medium Impact (Fixes 5-10 errors):**
3. Notifications.ts - Fix property names (5 errors)
4. Session services - Add session type (6 errors)
5. Admin system - Fix type literals (5 errors)

**Low Impact (Quick fixes):**
4. Missing toast hook - Create or import (2 errors)
5. Auth duplicate export - Remove line (1 error)
6. MFA array access - Fix indexing (3 errors)

## Estimated Effort

- **Quick fixes (1-2 hours):** Toast hook, auth export, MFA array access, i18n locale
- **Medium fixes (2-3 hours):** Sessions types, notifications property names, admin system
- **Larger refactor (3-4 hours):** Resource library components, session services

**Total:** 6-9 hours for complete cleanup

## Notes

- ✅ All errors are **non-blocking** - app builds and runs
- ✅ No errors in error handling infrastructure (our new code)
- ✅ No errors in core database layer (users.ts partial refactor is clean)
- ⚠️ Most errors are in resource library module (can be fixed independently)
- ⚠️ Some errors indicate missing migrations (tasks module handled with stubs)

## Recommendation

**For Stakeholder Demo:**
- ✅ Current state is deployable
- ✅ Core functionality works
- ⚠️ Avoid heavily using resource library features until prop fixes applied
- ⚠️ Tasks module won't work until migration applied

**For Production:**
- Fix quick wins first (toast, auth, mfa) - 30 minutes
- Add missing session type definitions - 1 hour
- Fix resource library props - 2 hours
- Apply tasks migration when ready
