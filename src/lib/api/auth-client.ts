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
  // Diagnostic logging: Check what cookies are available at this point
  const requestCookies = request.cookies.getAll();
  console.log(
    '[AUTH-CLIENT] createAuthenticatedSupabaseClient called. Available request cookies:',
    requestCookies.map(c => c.name).join(', ') || '(none)'
  );

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

/**
 * Creates an authenticated Supabase client with Bearer token fallback.
 * Tries to authenticate using cookies first (standard approach),
 * then falls back to Bearer token from Authorization header if no session found.
 *
 * @param request - Next.js request object
 * @param response - Next.js response object for cookie propagation
 * @returns Object with authenticated client and response
 */
export function createAuthenticatedSupabaseClientWithTokenFallback(
  request: NextRequest,
  response: NextResponse
): AuthenticatedClientResult {
  const client = createServerClientWithRequest(request, response);

  // Try to set Bearer token as fallback if no session exists from cookies
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.slice(7);

    // Attempt to set session with Bearer token
    // This allows RLS policies to work correctly with token-based auth
    const session = {
      access_token: accessToken,
      refresh_token: '',
      user: null,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client.auth as any).setSession(session).catch((err: unknown) => {
      console.warn('[AUTH-CLIENT] Failed to set session from Bearer token:', err);
    });
  }

  return { client, response };
}
