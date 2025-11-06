# ESLint Audit Report - Sprint 7
##Issue #148: Fix ESLint warnings (any types and unused variables)

**Date:** November 6, 2025
**Priority:** P2 - Medium
**Status:** In Progress

## Executive Summary

Comprehensive audit of TypeScript `any` types and unused variables across the codebase.

### Key Findings

- **Total `any` occurrences:** 301 across 103 files
- **Production code `any` types:** ~150 (excluding test files)
- **Test files:** ~150 `any` types (lower priority)
- **Unused variables:** To be determined after ESLint run

## Breakdown by Category

### 1. Critical `any` Types to Fix (Priority 1)

#### A. Database/Supabase Client Types
**Files affected:** 5
**Impact:** High - affects all database operations

```typescript
// ❌ BAD
private supabase: any;

// ✅ GOOD
import { SupabaseClient } from '@supabase/supabase-js';
private supabase: SupabaseClient;
```

**Files to fix:**
- `src/lib/services/mfa-service.ts:157`
- `src/lib/services/email-notification-service.ts:44`
- `src/app/api/health/route.ts:311`
- `src/app/api/monitoring/business-metrics.ts` (multiple functions)
- `src/app/api/sessions/[id]/files/route.ts:26`

#### B. Error Handling Types
**Files affected:** 8
**Impact:** Medium - affects error handling and logging

```typescript
// ❌ BAD
function isDatabaseError(error: any, code: string): boolean

// ✅ GOOD
function isDatabaseError(error: unknown, code: string): error is DatabaseError
```

**Files to fix:**
- `src/lib/db/utils.ts:110`
- `src/lib/services/file-service.ts:45,335`
- `src/lib/auth/client-auth.ts:194`

#### C. Function Return Types
**Files affected:** 10
**Impact:** High - affects type safety of API responses

```typescript
// ❌ BAD
Promise<{ data: any; error: string | null }>

// ✅ GOOD
Promise<{ data: UserProfile | null; error: string | null }>
```

**Files to fix:**
- `src/lib/auth/auth.ts:579,1019`
- `src/app/api/sessions/[id]/files/route.ts:30`

#### D. Database Query Results
**Files affected:** 15+
**Impact:** High - affects data integrity

```typescript
// ❌ BAD
const transformedNotes = notes?.map((note: any) => ({ ... }))

// ✅ GOOD
interface NoteRow {
  id: string;
  coach_id: string;
  client_id: string;
  // ... other fields
}
const transformedNotes = notes?.map((note: NoteRow) => ({ ... }))
```

**Files to fix:**
- `src/app/api/notes/route.ts` (5 occurrences)
- `src/app/api/widgets/progress/route.ts` (4 occurrences)
- `src/app/api/widgets/feedback/route.ts` (3 occurrences)
- `src/app/api/widgets/sessions/route.ts` (3 occurrences)

### 2. Medium Priority `any` Types (Priority 2)

#### E. Cache and Performance Optimization
**Files affected:** 4
**Impact:** Medium - affects performance features

```typescript
// ❌ BAD
private queryCache = new Map<string, { data: any; timestamp: number }>();

// ✅ GOOD
private queryCache = new Map<string, { data: unknown; timestamp: number }>();
// or use generics
private queryCache = new Map<string, CacheEntry<unknown>>();
```

**Files to fix:**
- `src/lib/performance/database-optimization.ts` (4 occurrences)
- `src/lib/performance/cache.ts:103`
- `src/lib/performance/database-optimizer.ts:71`

#### F. Utility and Helper Functions
**Files affected:** 6
**Impact:** Low-Medium

```typescript
// ❌ BAD
function createFormatter(baseFormatter: (input: TInput, options?: any) => TOutput)

// ✅ GOOD
function createFormatter<TOptions = Record<string, unknown>>(
  baseFormatter: (input: TInput, options?: TOptions) => TOutput
)
```

**Files to fix:**
- `src/lib/utils.ts` (3 occurrences)
- `src/lib/performance/optimization.ts` (6 occurrences)
- `src/lib/performance/api-optimization.ts:147`

#### G. Decorator and Middleware Functions
**Files affected:** 3
**Impact:** Low

```typescript
// ❌ BAD
function(target: any, propertyKey: string, descriptor: PropertyDescriptor)

// ✅ GOOD
function<T extends object>(target: T, propertyKey: string, descriptor: PropertyDescriptor)
```

**Files to fix:**
- `src/lib/performance/database-optimizer.ts:445`
- `src/lib/performance/cache.ts:103`

### 3. Low Priority (Can be addressed later)

#### H. Notification and Store Types
**Files:** 3
**Impact:** Low - internal types

- `src/lib/store/notification-store.ts` (2 occurrences)
- `src/lib/services/notification-scheduler.ts`
- `src/lib/services/push-notification-service.ts`

#### I. File Management
**Files:** 2
**Impact:** Low

- `src/lib/services/file-management-service.ts:702`
- `src/lib/database/file-versions.ts`

#### J. Validation Functions
**Files:** 1
**Impact:** Low

- `src/lib/validation/common.ts:197` (Zod issue handling)

## Unused Variables

To identify unused variables, run:

```bash
npm install  # Install dependencies first
npx eslint . --ext .ts,.tsx --format json > eslint-report.json
# Filter for unused-vars warnings
cat eslint-report.json | grep "no-unused-vars"
```

**Expected issues:**
- Unused imports
- Unused function parameters (prefix with `_` if intentionally unused)
- Unused variables in destructuring

## Action Plan

### Phase 1: Critical Fixes (2-3 hours)

1. **Fix Supabase Client Types** (30 min)
   - Add proper `SupabaseClient` type to all services
   - Update function signatures

2. **Fix Database Query Result Types** (60 min)
   - Create interface types for common query results
   - Update API route handlers
   - Add types to map/filter callbacks

3. **Fix Error Handling Types** (30 min)
   - Replace `any` with `unknown` for error parameters
   - Add proper type guards

4. **Fix Function Return Types** (30 min)
   - Add explicit return types to auth functions
   - Update API response types

### Phase 2: Medium Priority Fixes (1-2 hours)

5. **Fix Cache and Performance Types** (45 min)
   - Add generics to cache implementations
   - Update performance optimization types

6. **Fix Utility Function Types** (45 min)
   - Add generics where appropriate
   - Update decorator types

### Phase 3: Verification (30 min)

7. **Run ESLint and Fix Remaining Issues**
   ```bash
   npm run lint:fix
   npm run lint  # Verify no warnings remain
   ```

8. **Run Type Check**
   ```bash
   npm run type-check
   ```

## Implementation Examples

### Example 1: Fix Supabase Client Type

```typescript
// File: src/lib/services/mfa-service.ts

// BEFORE
export class MFAService {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }
}

// AFTER
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export class MFAService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }
}
```

### Example 2: Fix Database Query Results

```typescript
// File: src/app/api/notes/route.ts

// BEFORE
const transformedNotes = notes?.map((note: any) => ({
  id: note.id,
  title: note.title,
  // ...
}));

// AFTER
interface NoteRow {
  id: string;
  coach_id: string;
  client_id: string;
  title: string;
  content: string;
  privacy_level: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  session_id: string | null;
}

const transformedNotes = notes?.map((note: NoteRow) => ({
  id: note.id,
  title: note.title,
  // ...
}));
```

### Example 3: Fix Error Handling

```typescript
// File: src/lib/db/utils.ts

// BEFORE
export function isDatabaseError(error: any, code: string): boolean {
  return error?.code === code;
}

// AFTER
interface DatabaseError {
  code: string;
  message: string;
  details?: string;
}

export function isDatabaseError(error: unknown, code: string): error is DatabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as DatabaseError).code === code
  );
}
```

### Example 4: Fix Cache Types with Generics

```typescript
// File: src/lib/performance/database-optimization.ts

// BEFORE
private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

private getFromCache(key: string): any {
  const cached = this.queryCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > cached.ttl) {
    this.queryCache.delete(key);
    return null;
  }

  return cached.data;
}

// AFTER
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

private queryCache = new Map<string, CacheEntry<unknown>>();

private getFromCache<T = unknown>(key: string): T | null {
  const cached = this.queryCache.get(key) as CacheEntry<T> | undefined;
  if (!cached) return null;

  if (Date.now() - cached.timestamp > cached.ttl) {
    this.queryCache.delete(key);
    return null;
  }

  return cached.data;
}

private setCache<T>(key: string, data: T, ttlSeconds: number): void {
  this.queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlSeconds * 1000,
  });
}
```

## Unused Variables - Common Patterns

### Pattern 1: Unused Function Parameters

```typescript
// ❌ BAD
function handleSubmit(event: FormEvent, data: FormData) {
  // event is unused
  console.log(data);
}

// ✅ GOOD - Prefix with underscore
function handleSubmit(_event: FormEvent, data: FormData) {
  console.log(data);
}
```

### Pattern 2: Unused Destructured Variables

```typescript
// ❌ BAD
const { id, name, email } = user;  // email is unused
console.log(id, name);

// ✅ GOOD - Remove unused variable
const { id, name } = user;
console.log(id, name);

// ✅ GOOD - Keep if needed for rest operator
const { email, ...userData } = user;
return userData;
```

### Pattern 3: Unused Imports

```typescript
// ❌ BAD
import { useState, useEffect, useCallback } from 'react';  // useCallback unused

function Component() {
  const [state, setState] = useState(0);
  useEffect(() => { /* ... */ }, []);
  return <div>{state}</div>;
}

// ✅ GOOD
import { useState, useEffect } from 'react';

function Component() {
  const [state, setState] = useState(0);
  useEffect(() => { /* ... */ }, []);
  return <div>{state}</div>;
}
```

## ESLint Configuration Recommendations

Add to `.eslintrc.json` or `next.config.js`:

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }
    ]
  }
}
```

## Success Criteria

- [ ] All critical `any` types fixed (Database clients, query results, error handling)
- [ ] Medium priority `any` types fixed (cache, utilities)
- [ ] No ESLint warnings for `@typescript-eslint/no-explicit-any`
- [ ] No unused variable warnings
- [ ] Type check passes: `npm run type-check`
- [ ] All tests pass
- [ ] No breaking changes to API

## Progress Tracking

### Completed
- [x] Audit completed
- [x] Action plan created
- [x] Implementation examples documented

### In Progress
- [ ] Phase 1: Critical fixes
- [ ] Phase 2: Medium priority fixes
- [ ] Phase 3: Verification

### Blocked
- Environment setup (node_modules not installed)
- Need database access for testing

## Next Steps

1. **Install dependencies:** `npm install`
2. **Run ESLint:** `npm run lint`
3. **Start with critical fixes** (Supabase client types)
4. **Test incrementally** after each category of fixes
5. **Run type check** regularly: `npm run type-check`
6. **Update this document** with progress

## Related Issues

- Issue #146: Database migrations (affects database query types)
- Issue #147: Smoke testing (will validate fixes)
- Issue #149: E2E testing (will catch regressions)

## Notes

- Test files are lower priority - focus on production code first
- Some `any` types may be intentional (e.g., for highly dynamic data)
- Use `unknown` instead of `any` when the type is truly unknown
- Use generics when the type can be parameterized
- Document any remaining `any` types with `// eslint-disable-next-line` and explanation

## Estimated Time

- **Phase 1 (Critical):** 2-3 hours
- **Phase 2 (Medium):** 1-2 hours
- **Phase 3 (Verification):** 30 minutes
- **Total:** 4-6 hours

## Owner

- Assigned to: Sprint 7 development team
- Reviewer: Code review required before merge
- Due: End of Sprint 7
