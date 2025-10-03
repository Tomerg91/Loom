# Server-Only Import Issues

## Fixed Issues

### 1. MFA Components ✅
**Files Fixed:**
- `src/components/auth/mfa-setup-form.tsx`
- `src/components/auth/mfa-verification-form.tsx`
- `src/app/api/auth/mfa/enable/route.ts`

**Solution:** Refactored to use API routes instead of directly importing `createMfaService`

### 2. Performance Index ✅
**File Fixed:**
- `src/lib/performance/index.ts`

**Solution:** Commented out `export * from './database-optimization'` to prevent server-only database utilities from being exported to client

### 3. Analytics Export Service ✅
**File Fixed:**
- `src/lib/services/analytics-export-service.ts`

**Solution:** Removed direct import of `adminAnalyticsService`, changed `exportData()` to accept data as parameter instead of fetching it

## Remaining Issues

### 1. Session Queries
**Import Chain:**
```
lazy-components.tsx
  → lazy-session-components.tsx
    → enhanced-session-list.tsx
      → lib/queries/sessions.ts
        → lib/database/index.ts
          → lib/database/users.ts
            → lib/supabase/server.ts (server-only)
```

**Root Cause:** `lib/queries/sessions.ts` imports `createSessionService` from `lib/database`, which includes server-only code.

**Recommended Solution:**
Refactor all React Query hooks in `lib/queries/sessions.ts` to use API routes via `fetch` instead of database services. This follows the same pattern as the MFA fix.

**Affected Components:**
- `enhanced-session-list.tsx`
- Other session management components using these hooks

### 2. Other Potential Query Files
Check if similar patterns exist in:
- `lib/queries/users.ts`
- `lib/queries/coaches.ts`
- `lib/queries/clients.ts`
- etc.

## Architecture Pattern

**Problem:** Client components importing database services that use server-only code

**Solution:** Client components should only use:
1. API routes via `fetch()`
2. Type-only imports (`import type { ... }`)
3. Client-safe utilities

**Never in Client Components:**
- Direct database service imports
- `createServerClient()` or server.ts imports
- Any module that imports 'server-only' or 'next/headers'

## Next Steps

1. Audit all files in `lib/queries/` for server-only imports
2. Create API routes for any missing endpoints
3. Refactor query hooks to use API routes
4. Update components to use refactored hooks
5. Run full build to verify all issues resolved
