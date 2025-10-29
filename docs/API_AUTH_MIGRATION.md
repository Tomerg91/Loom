# API Authentication Migration Guide

## Problem
API routes are currently using `authService.getSession()` which relies on Supabase cookies for authentication. In the Vercel Edge Runtime, cookies are not reliably propagated between client and server, causing 401 Unauthorized errors.

## Solution
Switch from cookie-based authentication (using `getSession()`) to token-based authentication (using Authorization headers).

## Key Components

### 1. Server-Side: Token Validation (`src/lib/api/authenticated-request.ts`)

```typescript
import { getAuthenticatedUser } from '@/lib/api/authenticated-request';

// Usage in API route:
const user = await getAuthenticatedUser(request);
if (!user) {
  return ApiResponseHelper.unauthorized('Authentication required');
}
if (user.role !== 'coach') {
  return ApiResponseHelper.forbidden('Coach access required');
}
```

**How it works:**
- Extracts access token from `Authorization: Bearer <token>` header
- Validates token using `supabase.auth.getUser(accessToken)`
- Extracts user info from auth metadata (includes role)
- Returns `SessionUser` object with id, email, role, etc.

### 2. Client-Side: Adding Authorization Header (`src/lib/api/client-api-request.ts`)

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client-api-request';

// All these automatically add the access token to the Authorization header
const stats = await apiGet<DashboardStats>('/api/coach/stats');
const result = await apiPost('/api/sessions', { /* data */ });
```

**How it works:**
- Gets the current session from Supabase browser client
- Extracts the access token
- Adds `Authorization: Bearer <token>` header to all requests
- Handles errors automatically

## Migration Steps

### Step 1: Update API Route Handler

**Before:**
```typescript
import { authService } from '@/lib/services/auth-service';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }
    const userId = session.user.id;
    // ... rest of handler
  } catch (error) {
    // error handling
  }
}
```

**After:**
```typescript
import { getAuthenticatedUser } from '@/lib/api/authenticated-request';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }
    const userId = user.id;
    // ... rest of handler (no changes needed)
  } catch (error) {
    // error handling
  }
}
```

### Step 2: Update Client-Side API Calls

**Before:**
```typescript
const response = await fetch('/api/coach/stats');
const stats = await response.json();
```

**After:**
```typescript
import { apiGet } from '@/lib/api/client-api-request';
const stats = await apiGet<DashboardStats>('/api/coach/stats');
```

## Complete Example

### API Route (server)

File: `src/app/api/coach/stats/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { ApiResponseHelper } from '@/lib/api/types';
import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Get authenticated user from Authorization header
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    if (user.role !== 'coach') {
      return ApiResponseHelper.forbidden('Coach access required');
    }

    const coachId = user.id;
    const supabase = createClient();

    // Rest of your handler logic remains the same
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('coach_id', coachId);

    return ApiResponseHelper.success({ sessions });
  } catch (error) {
    console.error('API error:', error);
    return ApiResponseHelper.internalError('Failed to fetch stats');
  }
}
```

### Client Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client-api-request';

interface CoachStats {
  sessions: unknown[];
}

export function CoachDashboard() {
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiGet<CoachStats>('/api/coach/stats');
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      }
    };

    fetchStats();
  }, []);

  if (error) return <div>Error: {error}</div>;
  if (!stats) return <div>Loading...</div>;
  return <div>{/* render stats */}</div>;
}
```

## Routes to Update

### High Priority (Dashboard/Core Functionality)
- `src/app/api/coach/stats/route.ts` ✅ DONE
- `src/app/api/coach/activity/route.ts`
- `src/app/api/coach/clients/route.ts`
- `src/app/api/client/stats/route.ts`
- `src/app/api/client/sessions/[id]/notes/route.ts`
- `src/app/api/client/reflections/route.ts`

### Medium Priority (Admin/Management)
- `src/app/api/admin/analytics/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/dashboard/route.ts`
- `src/app/api/admin/system-health/route.ts`

### Lower Priority (Utilities/Support)
- `src/app/api/auth/avatar/route.ts`
- `src/app/api/users/[id]/profile/route.ts`
- `src/app/api/users/[id]/last-seen/route.ts`
- `src/app/api/notifications/route.ts`

## Testing

1. **Manual Testing:**
   - Sign in to the app
   - Navigate to a page that uses protected API endpoints
   - Check browser DevTools → Network tab
   - Verify `Authorization: Bearer <token>` header is present
   - Verify 200 response (not 401)

2. **Automated Testing:**
   - Add tests for `getAuthenticatedUser()` with valid/invalid tokens
   - Add tests for API routes with missing/expired tokens

## Troubleshooting

### Error: "No Authorization header"
- Client is not using `apiRequest()` wrapper
- Check that client code is using `apiGet`, `apiPost`, etc. from `client-api-request.ts`

### Error: "Failed to validate token"
- Token has expired - verify token refresh is working in browser client
- Token is invalid - check that session exists in Supabase

### Error: "User has no role in metadata"
- User metadata not set up properly
- Verify user's `user_metadata.role` is set during signup
- Check RLS policies aren't blocking metadata access

## Rollback Plan

If token-based auth causes issues:
1. Keep old `authService.getSession()` approach as fallback
2. Create feature flag to switch between approaches
3. Gradually migrate routes instead of all at once

## References

- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Bearer Token Format: https://tools.ietf.org/html/rfc6750
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
