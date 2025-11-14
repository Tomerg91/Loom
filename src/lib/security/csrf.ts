/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Implements double-submit cookie pattern for CSRF protection:
 * 1. Generate CSRF token on session creation
 * 2. Store token in httpOnly cookie (read by server)
 * 3. Send token in request header (set by client)
 * 4. Validate both match on state-changing requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from './headers';

export const CSRF_TOKEN_COOKIE = 'csrf-token';
export const CSRF_TOKEN_HEADER = 'x-csrf-token';
export const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate and set CSRF token in response cookie
 */
export function setCSRFToken(response: NextResponse): string {
  const token = generateCSRFToken();

  response.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CSRF_TOKEN_EXPIRY / 1000, // Convert to seconds
  });

  // Also send in header for client-side access
  response.headers.set(CSRF_TOKEN_HEADER, token);

  return token;
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);

  // Both must exist
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Both must match
  if (cookieToken !== headerToken) {
    return false;
  }

  // Token must be valid length (64 hex characters)
  if (cookieToken.length !== 64) {
    return false;
  }

  return true;
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCSRFProtection(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

/**
 * Check if route should be exempt from CSRF protection
 */
export function isCSRFExempt(pathname: string): boolean {
  const exemptRoutes = [
    '/api/auth/callback', // OAuth callbacks
    '/api/payments/tranzila/notify', // Payment webhooks (signature verified)
    '/api/webhooks/', // Other webhooks (should have signature verification)
  ];

  return exemptRoutes.some(route => pathname.startsWith(route));
}

/**
 * CSRF validation middleware for API routes
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Only validate state-changing methods
    if (!requiresCSRFProtection(request.method)) {
      return handler(request);
    }

    // Check if route is exempt
    if (isCSRFExempt(request.nextUrl.pathname)) {
      return handler(request);
    }

    // Validate CSRF token
    if (!validateCSRFToken(request)) {
      console.warn('[CSRF] Token validation failed', {
        path: request.nextUrl.pathname,
        method: request.method,
        hasCookie: !!request.cookies.get(CSRF_TOKEN_COOKIE),
        hasHeader: !!request.headers.get(CSRF_TOKEN_HEADER),
      });

      return NextResponse.json(
        {
          error: 'CSRF token validation failed',
          code: 'CSRF_VALIDATION_FAILED'
        },
        { status: 403 }
      );
    }

    return handler(request);
  };
}

/**
 * Get or create CSRF token for response
 */
export function ensureCSRFToken(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const existingToken = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;

  // If valid token exists, use it; otherwise create new one
  if (existingToken && existingToken.length === 64) {
    // Refresh the token in response
    response.headers.set(CSRF_TOKEN_HEADER, existingToken);
  } else {
    // Generate new token
    setCSRFToken(response);
  }

  return response;
}
