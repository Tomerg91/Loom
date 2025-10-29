# API Authentication Migration Implementation Plan

## Overview
Migrate from cookie-based authentication (`getSession()`) to token-based authentication (Authorization headers) to fix 401 errors in Vercel Edge Runtime.

## Already Completed
- ✅ Created `src/lib/api/authenticated-request.ts` - Server-side token validation
- ✅ Created `src/lib/api/client-api-request.ts` - Client-side request wrapper
- ✅ Updated `src/app/api/coach/stats/route.ts` as example
- ✅ Created `docs/API_AUTH_MIGRATION.md` - Complete migration guide

## Tasks

### Task 1: Update Critical API Routes (Coach/Client/Admin)
**Objective:** Update the most important API routes that impact dashboard functionality

**Routes to update:**
1. `src/app/api/coach/activity/route.ts`
2. `src/app/api/coach/clients/route.ts`
3. `src/app/api/client/stats/route.ts`
4. `src/app/api/client/sessions/[id]/notes/route.ts`
5. `src/app/api/client/reflections/route.ts`
6. `src/app/api/admin/analytics/route.ts`

**Changes needed per route:**
- Replace: `import { authService } from '@/lib/services/auth-service';`
- Add: `import { getAuthenticatedUser } from '@/lib/api/authenticated-request';`
- Replace: `const session = await authService.getSession();`
- With: `const user = await getAuthenticatedUser(request);`
- Update all `session.user.*` to `user.*`
- Update handler signature: `GET(request: NextRequest)` (pass request parameter)
- Update role checks to use new structure

**Verification:**
- No TypeScript errors
- All changes follow the pattern from `src/app/api/coach/stats/route.ts`
- Commit changes with message: "fix: update API routes to use token-based auth (batch 1)"

### Task 2: Update Remaining API Routes (Admin/Support)
**Objective:** Update all remaining API routes that use `authService.getSession()`

**Routes to update:**
1. `src/app/api/admin/users/route.ts`
2. `src/app/api/admin/dashboard/route.ts`
3. `src/app/api/admin/system-health/route.ts`
4. `src/app/api/admin/audit/route.ts`
5. `src/app/api/admin/sessions/route.ts`
6. `src/app/api/auth/avatar/route.ts`
7. `src/app/api/users/[id]/profile/route.ts`
8. `src/app/api/users/[id]/last-seen/route.ts`
9. `src/app/api/practice-journal/[id]/route.ts`
10. `src/app/api/practice-journal/route.ts`

**Changes needed:** Same pattern as Task 1

**Verification:**
- No TypeScript errors
- Build passes: `npm run typecheck`
- Commit changes with message: "fix: update remaining API routes to use token-based auth (batch 2)"

### Task 3: Update Client-Side API Calls
**Objective:** Update TanStack Query hooks and client components to use `apiRequest` wrapper

**Routes to update:**
1. Review `src/lib/queries/sessions.ts` for any direct `fetch()` calls
2. Review `src/lib/queries/coach.ts` for any direct `fetch()` calls
3. Review `src/lib/queries/client.ts` for any direct `fetch()` calls
4. Replace direct `fetch('/api/...')` calls with `apiGet()`, `apiPost()`, etc.
5. Ensure all client components using API calls have `'use client'` directive

**Pattern change:**
```typescript
// Before
const response = await fetch(`/api/endpoint?param=${value}`);
if (!response.ok) throw new Error('Failed');
return response.json();

// After
import { apiGet } from '@/lib/api/client-api-request';
return apiGet(`/api/endpoint?param=${value}`);
```

**Verification:**
- No TypeScript errors
- Build passes: `npm run typecheck`
- No direct `fetch()` calls to internal API routes (external APIs OK)
- Commit changes with message: "fix: update client-side code to use token-based auth"

### Task 4: Test Authentication Flow
**Objective:** Verify the authentication changes work end-to-end

**Manual tests:**
1. Sign in to the application
2. Navigate to coach dashboard → verify API calls succeed (check Network tab for 200 response, Authorization header present)
3. Navigate to client dashboard → verify API calls succeed
4. Check browser DevTools:
   - Network tab → find API call to `/api/coach/stats` or similar
   - Verify request header: `Authorization: Bearer <token>`
   - Verify response status: 200 (not 401)
5. Sign out and try accessing API routes → verify 401 response

**Automated tests:**
- Run: `npm run test:run`
- Verify no new test failures
- If tests fail, investigate and fix

**Verification:**
- Manual tests all pass
- Automated tests all pass
- No errors in browser console
- Create test file: `src/test/api/auth-token.test.ts` with basic token validation tests

### Task 5: Verify Build and Deploy
**Objective:** Ensure changes build correctly and are ready for deployment

**Build verification:**
- Run: `npm run typecheck` → no errors
- Run: `npm run lint` → no errors
- Run: `npm run build:production` → succeeds
- Review git changes: `git diff main..HEAD` → all changes look correct

**Deployment:**
- Commit any remaining changes: "fix: clean up auth migration"
- Push to `debug/signin-hanging` branch
- Deploy to Vercel staging: `vercel deploy`
- Test on staging URL with real environment
- Monitor Vercel logs for any 401 errors

**Verification:**
- Build succeeds without errors
- No type errors or lint issues
- Deployment succeeds
- Staging environment works correctly
- Ready to merge to main

## Success Criteria
- ✅ All API routes updated to use token-based auth
- ✅ Client-side code uses `apiRequest` wrapper
- ✅ No TypeScript errors
- ✅ Tests pass
- ✅ Build succeeds
- ✅ Manual testing confirms 200 responses (not 401)
- ✅ Authorization header present in API requests
- ✅ Ready for production deployment

## Notes
- The `getAuthenticatedUser()` helper handles token validation and user info extraction
- The `apiRequest()` wrapper automatically adds Authorization header
- All existing logic after authentication check remains unchanged
- No database schema changes needed
- Backward compatible: can fall back to `authService.getSession()` if needed
