import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createAuthService } from '@/lib/auth/auth';
import { applySecurityHeaders } from '@/lib/security/headers';
import { rateLimitAPI } from '@/lib/security/rate-limit';

export type RouteHandler = (req: NextRequest) => Promise<Response> | Response;

export function withAuth(handler: RouteHandler): RouteHandler {
  return async (req) => {
    const auth = createAuthService(true);
    const user = await auth.getCurrentUser();
    if (!user) {
      return applySecurityHeaders(req, new NextResponse('Unauthorized', { status: 401 }));
    }
    return handler(req);
  };
}

export function withRole(roles: string[]) {
  return (handler: RouteHandler): RouteHandler => async (req) => {
    const auth = createAuthService(true);
    const user = await auth.getCurrentUser();
    if (!user || !roles.includes(user.role)) {
      return applySecurityHeaders(req, new NextResponse('Forbidden', { status: 403 }));
    }
    return handler(req);
  };
}

export function withRateLimit() {
  return (handler: RouteHandler): RouteHandler => async (req) => {
    const result = rateLimitAPI(req);
    if (!result.allowed) {
      return new NextResponse(result.message || 'Too Many Requests', {
        status: 429,
        headers: result.headers as Record<string, string>,
      });
    }
    const res = await handler(req);
    // Propagate rate limit headers on success
    Object.entries(result.headers).forEach(([k, v]) => res.headers.set(k, v as string));
    return res;
  };
}

export function compose(handler: RouteHandler, ...wrappers: ((h: RouteHandler) => RouteHandler)[]): RouteHandler {
  return wrappers.reduceRight((acc, wrap) => wrap(acc), handler);
}

