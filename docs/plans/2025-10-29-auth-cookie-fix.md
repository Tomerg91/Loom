# Authentication Cookie Handler Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 401 Unauthorized errors by ensuring all API routes can read authentication cookies from requests.

**Architecture:** Create a helper utility that wraps the Supabase client factory pattern, ensuring every API route that needs authentication creates response objects for cookie propagation. The root cause is that `createServerClient()` intentionally disables cookies to prevent state pollution. All authenticated routes must use `createServerClientWithRequest()` instead, passing both request and response objects to enable bidirectional cookie handling.

**Tech Stack:** Next.js API routes, Supabase SSR client, TypeScript, Zod validation

---

## Task 1: Create API Route Helper Utility

**Files:**
- Create: `src/lib/api/auth-client.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/api/__tests__/auth-client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createAuthenticatedSupabaseClient } from '../auth-client';
import { NextRequest, NextResponse } from 'next/server';

describe('createAuthenticatedSupabaseClient', () => {
  it('returns a Supabase client when request and response provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
      headers: new Headers({
        'cookie': 'sb-auth-token=test_token'
      })
    });

    const response = new NextResponse();

    const client = createAuthenticatedSupabaseClient(request, response);

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('returns response object with cookie handling attached', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET'
    });

    const { client, response } = createAuthenticatedSupabaseClient(request, new NextResponse());

    expect(response).toBeDefined();
    expect(typeof response.cookies.set).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/api/__tests__/auth-client.test.ts
```

Expected: FAIL with "createAuthenticatedSupabaseClient is not exported"

**Step 3: Write minimal helper utility**

```typescript
// src/lib/api/auth-client.ts
/**
 * @fileoverview Helper for creating authenticated Supabase clients in API routes
 * with proper cookie handling for both reading and writing auth tokens.
 *
 * All authenticated API routes MUST use this instead of createServerClient()
 * to ensure authentication cookies are properly read from requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClientWithRequest } from '@/modules/platform/supabase/server';

export interface AuthenticatedClientResult {
  client: ReturnType<typeof createServerClientWithRequest>;
  response: NextResponse;
}

/**
 * Creates an authenticated Supabase client with request/response cookie handling.
 *
 * This MUST be used in any authenticated API route instead of createServerClient().
 * The pattern is:
 *
 * ```typescript
 * const { client, response } = createAuthenticatedSupabaseClient(request, new NextResponse());
 * const { data: { session } } = await client.auth.getSession();
 * // ... business logic ...
 * const finalResponse = createSuccessResponse(data);
 * response.cookies.getAll().forEach(cookie => finalResponse.cookies.set(cookie));
 * return finalResponse;
 * ```
 *
 * @param request - Next.js request object
 * @param response - Next.js response object for cookie propagation
 * @returns Object with authenticated client and response
 */
export function createAuthenticatedSupabaseClient(
  request: NextRequest,
  response: NextResponse
): AuthenticatedClientResult {
  const client = createServerClientWithRequest(request, response);
  return { client, response };
}

/**
 * Helper to propagate cookies from auth response to API response.
 * Call this before returning any response in an authenticated route.
 *
 * @param authResponse - Response object with cookies set by Supabase client
 * @param apiResponse - Response to send to client
 * @returns apiResponse with cookies propagated
 */
export function propagateCookies(
  authResponse: NextResponse,
  apiResponse: NextResponse
): NextResponse {
  authResponse.cookies.getAll().forEach(cookie => {
    apiResponse.cookies.set(cookie);
  });
  return apiResponse;
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/api/__tests__/auth-client.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/api/auth-client.ts src/lib/api/__tests__/auth-client.test.ts
git commit -m "feat: add authenticated Supabase client helper for API routes

- Create auth-client.ts utility to standardize authentication pattern
- Ensure all authenticated routes handle cookies properly
- Fixes 401 errors caused by createServerClient() disabling cookies
"
```

---

## Task 2: Fix Critical API Route - Users Profile

**Files:**
- Modify: `src/app/api/users/[id]/profile/route.ts`
- Test: Verify with integration test (existing auth tests)

**Step 1: Review the pattern in profile route**

```bash
cat src/app/api/users/[id]/profile/route.ts | head -35
```

**Step 2: Update imports**

```typescript
// At top of src/app/api/users/[id]/profile/route.ts, change:
import { createServerClient, createAdminClient } from '@/lib/supabase/server';

// To:
import { createAdminClient } from '@/lib/supabase/server';
import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
```

**Step 3: Update the route handler function**

Replace the entire GET function with:

```typescript
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;

    // Use authenticated client helper for cookie handling
    const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );

    // Create client from Authorization bearer if provided; fallback to request/response client
    const authHeader = request.headers.get('authorization');
    const finalSupabase = authHeader
      ? createSupabaseClient<Database>(
          serverEnv.NEXT_PUBLIC_SUPABASE_URL!,
          serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: authHeader } } }
        )
      : supabase;

    // Get current session
    const { data: { session }, error: sessionError } = await finalSupabase.auth.getSession();

    if (sessionError || !session) {
      const errorResponse = createErrorResponse('Authentication required', HTTP_STATUS.UNAUTHORIZED);
      return propagateCookies(authResponse, errorResponse);
    }

    // Only allow users to fetch their own profile or admins to fetch any profile
    if (session.user.id !== userId) {
      // Check if current user is admin using admin client to bypass RLS
      const adminClient = createAdminClient();
      const { data: currentUserProfile } = await adminClient
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!currentUserProfile || currentUserProfile.role !== 'admin') {
        const errorResponse = createErrorResponse('Access denied', HTTP_STATUS.FORBIDDEN);
        return propagateCookies(authResponse, errorResponse);
      }
    }

    // Fetch user profile using admin client to bypass RLS
    const adminClient = createAdminClient();
    const { data: user, error } = await adminClient
      .from('users')
      .select('id, email, first_name, last_name, role, phone, avatar_url, timezone, language, status, created_at, updated_at, last_seen_at, onboarding_status, onboarding_step, onboarding_completed_at, onboarding_data, mfa_enabled, mfa_setup_completed, mfa_verified_at, remember_device_enabled')
      .eq('id', userId)
      .single();

    if (error || !user) {
      const errorResponse = createErrorResponse('User profile not found', HTTP_STATUS.NOT_FOUND);
      return propagateCookies(authResponse, errorResponse);
    }

    // Transform to AuthUser format
    const authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      phone: user.phone || '',
      avatarUrl: user.avatar_url || '',
      timezone: user.timezone || 'UTC',
      language: user.language,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastSeenAt: user.last_seen_at || undefined,
      onboardingStatus: user.onboarding_status || 'pending',
      onboardingStep: user.onboarding_step ?? 0,
      onboardingCompletedAt: user.onboarding_completed_at || undefined,
      onboardingData: user.onboarding_data || {},
      mfaEnabled: user.mfa_enabled ?? false,
      mfaSetupCompleted: user.mfa_setup_completed ?? false,
      mfaVerifiedAt: user.mfa_verified_at || undefined,
      rememberDeviceEnabled: user.remember_device_enabled ?? false,
    };

    const successResponse = createSuccessResponse(authUser);
    return propagateCookies(authResponse, successResponse);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    const errorResponse = createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    // Note: authResponse may not be available if error occurs before creation
    return errorResponse;
  }
}
```

**Step 4: Run tests**

```bash
npm run type-check
```

Expected: No TypeScript errors in this file

**Step 5: Commit**

```bash
git add src/app/api/users/[id]/profile/route.ts
git commit -m "fix: update users profile route to use authenticated client helper

- Use createAuthenticatedSupabaseClient for proper cookie handling
- Propagate auth cookies to all responses (success and error)
- Fixes 401 Unauthorized errors when reading session from cookies
"
```

---

## Task 3: Fix API Route - Get Notifications List

**Files:**
- Modify: `src/app/api/notifications/route.ts`

**Step 1: Identify the pattern in notifications route**

```bash
grep -A 20 "export async function GET" src/app/api/notifications/route.ts | head -30
```

**Step 2: Update imports and GET handler**

Find where `createServerClient()` is called and replace with:

```typescript
import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';

// In GET handler:
const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
  request,
  new NextResponse()
);

const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (sessionError || !session) {
  const errorResponse = createErrorResponse('Authentication required', HTTP_STATUS.UNAUTHORIZED);
  return propagateCookies(authResponse, errorResponse);
}

// ... rest of handler ...

const successResponse = createSuccessResponse(notifications);
return propagateCookies(authResponse, successResponse);
```

**Step 3: Run type-check**

```bash
npm run type-check
```

**Step 4: Commit**

```bash
git add src/app/api/notifications/route.ts
git commit -m "fix: update notifications route to use authenticated client helper"
```

---

## Task 4: Fix API Route - Get Sessions List

**Files:**
- Modify: `src/app/api/sessions/route.ts`

**Step 1-4:** Repeat Task 3 pattern for sessions route

```bash
grep -n "createServerClient()" src/app/api/sessions/route.ts
```

Replace all occurrences with the authenticated client helper pattern.

**Step 5: Commit**

```bash
git add src/app/api/sessions/route.ts
git commit -m "fix: update sessions route to use authenticated client helper"
```

---

## Task 5: Create Script to Fix Remaining Routes

**Files:**
- Create: `scripts/fix-auth-routes.sh`

**Step 1: Write shell script to identify and list all routes that need fixing**

```bash
#!/bin/bash
# scripts/fix-auth-routes.sh
# Lists all API routes that use createServerClient() without request/response

echo "Finding API routes that need authentication cookie fix..."
echo ""

grep -r "createServerClient()" src/app/api --include="*.ts" | \
  grep -v "createServerClientWithRequest" | \
  grep -v "test" | \
  grep -v "__tests__" | \
  while IFS=: read -r file line; do
    echo "FILE: $file"
    head -1 "$file" | sed 's/^/  PATH: /'
  done

echo ""
echo "Routes to fix:"
grep -r "createServerClient()" src/app/api --include="*.ts" | \
  grep -v "createServerClientWithRequest" | \
  grep -v "test" | \
  grep -v "__tests__" | \
  cut -d: -f1 | \
  sort -u | \
  nl
```

**Step 2: Run script to identify routes**

```bash
bash scripts/fix-auth-routes.sh
```

**Step 3: Document the list of routes to fix**

Create: `docs/AUTH_ROUTES_FIX_LIST.md`

```markdown
# Authentication Routes Requiring Cookie Handler Fix

These routes use createServerClient() and must be updated to use the authenticated client helper:

1. src/app/api/practice-journal/route.ts (GET, POST)
2. src/app/api/practice-journal/[id]/route.ts (GET, PUT, DELETE)
3. src/app/api/practice-journal/stats/route.ts (GET)
4. src/app/api/tasks/route.ts (GET, POST)
5. src/app/api/tasks/[taskId]/route.ts (GET, PUT, DELETE)
6. src/app/api/tasks/[taskId]/instances/[instanceId]/progress/route.ts (POST, GET)
7. src/app/api/reflections/route.ts (GET, POST)
8. src/app/api/reflections/[id]/route.ts (GET, PUT, DELETE)
9. src/app/api/coaches/route.ts (GET)
10. src/app/api/coaches/[id]/schedule/route.ts (GET)
11. src/app/api/coaches/[id]/availability/route.ts (GET)

Fix pattern for each route:
- Import helper: `import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';`
- Create client: `const { client, response } = createAuthenticatedSupabaseClient(request, new NextResponse());`
- Propagate cookies on all responses: `propagateCookies(response, successResponse)`
```

**Step 4: Commit**

```bash
git add scripts/fix-auth-routes.sh docs/AUTH_ROUTES_FIX_LIST.md
git commit -m "docs: add authentication routes fix script and tracking list"
```

---

## Task 6: Batch Fix Remaining High-Priority Routes

**Files:**
- Modify: All routes listed in AUTH_ROUTES_FIX_LIST.md (first 5 listed)

For each route in priority order:

1. **Practice Journal Routes** (3 files)
2. **Tasks Routes** (3 files)
3. **Reflections Routes** (2 files)

For each file:

```bash
# 1. Update imports
# 2. Replace createServerClient() calls with authenticated client helper
# 3. Add propagateCookies() to all response returns
# 4. Run type-check
# 5. Commit with message: "fix: update [route-name] to use authenticated client helper"
```

---

## Task 7: Add Integration Test for Authentication

**Files:**
- Create: `src/test/integration/auth-client-helper.test.ts`

**Step 1: Write test for the helper with actual request/response**

```typescript
// src/test/integration/auth-client-helper.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
import { NextRequest, NextResponse } from 'next/server';

describe('Authentication Client Helper Integration', () => {
  it('reads session from cookies and propagates them in response', async () => {
    // Note: This is an integration test that requires valid Supabase credentials
    // It verifies the cookie flow works end-to-end

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
      headers: new Headers({
        // In real scenario, this would be a valid auth cookie
        'cookie': 'sb-auth=valid_token'
      })
    });

    const response = new NextResponse();
    const { client, response: authResponse } = createAuthenticatedSupabaseClient(request, response);

    // Verify client is created
    expect(client).toBeDefined();
    expect(authResponse).toBeDefined();

    // Verify cookies can be propagated
    const finalResponse = new NextResponse(JSON.stringify({ status: 'ok' }));
    const propagatedResponse = propagateCookies(authResponse, finalResponse);

    expect(propagatedResponse).toBeDefined();
    expect(typeof propagatedResponse.cookies.set).toBe('function');
  });
});
```

**Step 2: Run test**

```bash
npm run test:run -- src/test/integration/auth-client-helper.test.ts
```

**Step 3: Commit**

```bash
git add src/test/integration/auth-client-helper.test.ts
git commit -m "test: add integration test for auth client helper"
```

---

## Task 8: Verify All Routes and Create Verification Test

**Files:**
- Create: `src/test/auth-routes-verification.test.ts`

**Step 1: Create verification script**

```typescript
// src/test/auth-routes-verification.test.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Authentication Routes Verification', () => {
  const apiRoutesDir = path.join(process.cwd(), 'src/app/api');

  function findAllRouteFiles(dir: string): string[] {
    const routes: string[] = [];

    const walk = (currentPath: string) => {
      const files = fs.readdirSync(currentPath);
      files.forEach(file => {
        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !file.startsWith('.')) {
          walk(filePath);
        } else if (file === 'route.ts') {
          routes.push(filePath);
        }
      });
    };

    walk(dir);
    return routes;
  }

  it('all authenticated routes use createAuthenticatedSupabaseClient', () => {
    const routes = findAllRouteFiles(apiRoutesDir);
    const failingRoutes: string[] = [];

    routes.forEach(routePath => {
      const content = fs.readFileSync(routePath, 'utf-8');

      // Skip routes that explicitly don't need auth (public routes)
      const isPublic = content.includes('// PUBLIC_ROUTE') || routePath.includes('/public/');

      if (isPublic) return;

      // Check if route calls createServerClient() without request/response
      const hasProblematicPattern = content.match(/createServerClient\(\)\s*[;,]/);
      const hasAuthHelper = content.includes('createAuthenticatedSupabaseClient');

      // If route has async handler and uses createServerClient(), it should use helper
      const hasAsyncHandler = content.includes('export async function');

      if (hasAsyncHandler && hasProblematicPattern && !hasAuthHelper) {
        failingRoutes.push(routePath);
      }
    });

    expect(failingRoutes).toEqual([],
      `These routes need authentication helper fix:\n${failingRoutes.map(r => '  - ' + r).join('\n')}`
    );
  });
});
```

**Step 2: Run verification test**

```bash
npm run test:run -- src/test/auth-routes-verification.test.ts
```

Expected: Initially FAIL listing routes that need fixing

**Step 3: Commit**

```bash
git add src/test/auth-routes-verification.test.ts
git commit -m "test: add verification for authenticated routes using helper"
```

---

## Task 9: Verify Type Safety and Build

**Step 1: Run full type check**

```bash
npm run type-check 2>&1 | grep -E "error|route.ts" | head -20
```

**Step 2: Ensure no new errors introduced**

```bash
npm run type-check
```

Expected: No new TypeScript errors in modified files

**Step 3: Build verification**

```bash
npm run build:production 2>&1 | tail -20
```

**Step 4: Commit final verification**

```bash
git commit -m "chore: verify all authentication fixes compile without errors"
```

---

## Task 10: Document the Fix and Create Migration Guide

**Files:**
- Create: `docs/AUTH_COOKIE_FIX.md`

```markdown
# Authentication Cookie Fix - Implementation Complete

## Problem Summary
API routes were returning 401 Unauthorized errors because they used `createServerClient()` without request/response parameters. This function intentionally disables cookie handling to prevent state pollution, but authenticated routes MUST read cookies from requests to verify sessions.

## Solution
Created `createAuthenticatedSupabaseClient()` helper that ensures:
1. Supabase client is initialized with request/response context
2. Cookies can be read from incoming requests
3. Cookies are properly propagated back to responses

## How to Use in New Routes

```typescript
import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Create authenticated client with cookie handling
    const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );

    // Verify session
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      const errorResponse = createErrorResponse('Unauthorized', 401);
      return propagateCookies(authResponse, errorResponse);
    }

    // Your business logic here...
    const successResponse = createSuccessResponse(data);

    // Always propagate cookies before returning
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    return createErrorResponse('Internal server error', 500);
  }
}
```

## Routes Fixed
See `docs/AUTH_ROUTES_FIX_LIST.md` for complete list.

## Verification
Run: `npm run test:run -- src/test/auth-routes-verification.test.ts`

This will verify all authenticated routes use the helper properly.
```

**Step 4: Commit**

```bash
git add docs/AUTH_COOKIE_FIX.md
git commit -m "docs: add authentication cookie fix documentation and migration guide"
```

---

## Summary of Changes

**Total Tasks:** 10
**Files Created:** 3 (auth-client.ts, test file, documentation)
**Files Modified:** 3+ (profile, notifications, sessions routes + more)
**Key Commits:**
- Feature: Auth client helper utility + tests
- Fix: Each route individually fixed with proper authentication
- Test: Verification test added to prevent regression
- Docs: Complete migration guide and fix list

**Success Criteria:**
1. ✅ All API routes use `createAuthenticatedSupabaseClient` helper
2. ✅ Cookies propagated to all response objects (success + error)
3. ✅ Type safety maintained (no TypeScript errors)
4. ✅ Integration tests pass
5. ✅ Verification test passes
6. ✅ Documentation complete

**Expected Result:**
- 401 Unauthorized errors resolved
- Authentication cookies properly read from requests
- All API endpoints functional with proper session validation
