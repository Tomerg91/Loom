import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { createMfaService, getClientIP } from '@/lib/services/mfa-service';
import { resolveRedirect } from '@/lib/utils/redirect';
import {
  AUTH_ROUTES,
  DEFAULT_DASHBOARD_ROUTE,
  MFA_PENDING_COOKIE,
  MFA_TRUSTED_DEVICE_COOKIE,
  MFA_VERIFY_ROUTE,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
} from '@/modules/auth/constants';
import { getSessionContext } from '@/modules/auth/server/session';
import {
  isRouteAllowedForRole,
  resolveLoginRedirect,
  resolveRoleLanding,
} from '@/modules/auth/utils/redirect';
import { createServerClientWithRequest } from '@/modules/platform/supabase/server';

import { routing } from './i18n/routing';
import { applySecurityHeaders } from './lib/security/headers';
import { validateUserAgent } from './lib/security/validation';

const intlMiddleware = createMiddleware(routing);
const AUTH_GATING_ENABLED = process.env.MIDDLEWARE_AUTH_ENABLED !== 'false';

function shouldBypass(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/_next/image/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/api/') ||
    /\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)(\?.*)?$/i.test(
      pathname
    )
  );
}

function stripLocale(pathname: string): { locale: string; path: string } {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  const isLocale = routing.locales.includes(
    first as (typeof routing.locales)[number]
  );
  const locale = isLocale ? (first as string) : routing.defaultLocale;
  const pathSegments = isLocale ? segments.slice(1) : segments;
  const path = `/${pathSegments.join('/')}`.replace(/\/+$/, '') || '/';
  return { locale, path: path === '' ? '/' : path }; // normalise root
}

function matchesRoute(path: string, candidates: readonly string[]): boolean {
  const normalised = path === '' ? '/' : path;
  return candidates.some(route => {
    if (route === '/') {
      return normalised === '/';
    }
    return normalised === route || normalised.startsWith(`${route}/`);
  });
}

function readCookie(request: NextRequest, name: string): string | null {
  const cookieStore = request.cookies as
    | { get?: (key: string) => { value?: string } | undefined }
    | undefined;

  const cookieValue = cookieStore?.get?.(name)?.value;
  if (cookieValue !== undefined) {
    return cookieValue ?? null;
  }

  const header = request.headers.get('cookie');
  if (!header) {
    return null;
  }

  for (const segment of header.split(';')) {
    const [key, ...rest] = segment.trim().split('=');
    if (key === name) {
      return rest.join('=') || '';
    }
  }

  return null;
}

async function refreshSessionOnResponse(
  request: NextRequest,
  response: NextResponse
) {
  try {
    const supabase = createServerClientWithRequest(request, response);
    await supabase.auth.getSession();
  } catch (error) {
    console.warn('Failed to refresh Supabase session in middleware:', error);
  }
  return response;
}

async function applyFinalisers(
  request: NextRequest,
  response: NextResponse,
  {
    logRequests,
    reqId,
    start,
    metadata = {},
  }: {
    logRequests: boolean;
    reqId: string;
    start: number;
    metadata?: Record<string, unknown>;
  }
): Promise<NextResponse> {
  let res = applySecurityHeaders(request, response);
  res = await refreshSessionOnResponse(request, res);
  if (logRequests) {
    res.headers.set('X-Request-ID', reqId);
    console.info('[RES]', {
      id: reqId,
      path: request.nextUrl.pathname,
      status: res.status,
      durMs: Date.now() - start,
      ...metadata,
    });
  }
  return res;
}

export async function middleware(request: NextRequest) {
  // Handle OPTIONS requests (CORS preflight) immediately
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods':
          'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const pathname = request.nextUrl.pathname;
  const logRequests = process.env.LOG_REQUESTS === 'true';
  const reqId = crypto.randomUUID();
  const start = Date.now();

  if (logRequests) {
    console.info('[REQ]', {
      id: reqId,
      method: request.method,
      path: pathname,
      ua: request.headers.get('user-agent') || '',
      ip:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
    });
  }

  if (shouldBypass(pathname)) {
    const res = NextResponse.next();
    if (logRequests) {
      res.headers.set('X-Request-ID', reqId);
      console.info('[RES]', {
        id: reqId,
        path: pathname,
        status: 200,
        durMs: Date.now() - start,
        static: true,
      });
    }
    return res;
  }

  const userAgent = request.headers.get('user-agent') || '';
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.MIDDLEWARE_UA_CHECK !== 'false'
  ) {
    if (!validateUserAgent(userAgent)) {
      const res = new NextResponse('Forbidden', { status: 403 });
      if (logRequests) {
        res.headers.set('X-Request-ID', reqId);
        console.warn('[RES]', {
          id: reqId,
          path: pathname,
          status: 403,
          reason: 'UA invalid',
          durMs: Date.now() - start,
        });
      }
      return res;
    }
  }

  const { locale, path } = stripLocale(pathname);

  const intlResponse = intlMiddleware(request);
  const continueChain = intlResponse.headers.get('x-middleware-next') === '1';
  if (!continueChain) {
    return applyFinalisers(request, intlResponse, {
      logRequests,
      reqId,
      start,
      metadata: { intl: true },
    });
  }

  if (!AUTH_GATING_ENABLED) {
    return applyFinalisers(request, intlResponse, {
      logRequests,
      reqId,
      start,
    });
  }

  const sessionContext = await getSessionContext(request);
  const sessionUser = sessionContext.session?.user ?? null;
  const hasSession = Boolean(sessionUser);
  const mfaPendingCookie = readCookie(request, MFA_PENDING_COOKIE) === 'true';
  let trustedDeviceValid = false;

  if (hasSession) {
    const trustedCookie = readCookie(request, MFA_TRUSTED_DEVICE_COOKIE);
    if (trustedCookie) {
      const [deviceId, token] = trustedCookie.split('.');
      if (deviceId && token) {
        try {
          const mfaService = createMfaService(true);
          trustedDeviceValid = await mfaService.verifyTrustedDeviceToken(
            sessionUser!.id,
            deviceId,
            token,
            {
              ipAddress: getClientIP(request) ?? undefined,
              userAgent: userAgent || undefined,
            }
          );
        } catch (error) {
          console.warn('Failed to validate trusted device token:', error);
        }
      }
    }
  }
  const mfaPending =
    hasSession &&
    !trustedDeviceValid &&
    (mfaPendingCookie ||
      (sessionContext.mfaEnabled && !sessionContext.mfaVerified));

  const isProtected = matchesRoute(path, PROTECTED_ROUTES);
  const isPublic = matchesRoute(path, PUBLIC_ROUTES);
  const isAuth = matchesRoute(path, AUTH_ROUTES);

  const attemptedPath = path === '/' ? DEFAULT_DASHBOARD_ROUTE : path;
  const attemptedPathWithLocale = resolveRedirect(locale, attemptedPath);

  if (hasSession) {
    if (mfaPending && path !== MFA_VERIFY_ROUTE) {
      const redirectTarget = resolveRedirect(
        locale,
        `${MFA_VERIFY_ROUTE}?redirectTo=${encodeURIComponent(attemptedPathWithLocale)}`,
        { allowAuthPaths: true }
      );
      const res = NextResponse.redirect(new URL(redirectTarget, request.url));
      return applyFinalisers(request, res, {
        logRequests,
        reqId,
        start,
        metadata: { reason: 'mfa pending redirect', redirect: redirectTarget },
      });
    }

    if (isAuth && path !== MFA_VERIFY_ROUTE) {
      const target = resolveRoleLanding(locale, sessionContext.role);
      const res = NextResponse.redirect(new URL(target, request.url));
      return applyFinalisers(request, res, {
        logRequests,
        reqId,
        start,
        metadata: {
          reason: 'auth route already authenticated',
          redirect: target,
        },
      });
    }

    if (!isRouteAllowedForRole(path, sessionContext.role)) {
      const target = resolveRoleLanding(locale, sessionContext.role);
      const res = NextResponse.redirect(new URL(target, request.url));
      return applyFinalisers(request, res, {
        logRequests,
        reqId,
        start,
        metadata: { reason: 'role restricted route', redirect: target },
      });
    }

    if (path === DEFAULT_DASHBOARD_ROUTE) {
      const target = resolveRoleLanding(locale, sessionContext.role);
      if (target !== resolveRedirect(locale, DEFAULT_DASHBOARD_ROUTE)) {
        const res = NextResponse.redirect(new URL(target, request.url));
        return applyFinalisers(request, res, {
          logRequests,
          reqId,
          start,
          metadata: { reason: 'role dashboard redirect', redirect: target },
        });
      }
    }
  } else {
    if (isProtected && !isPublic) {
      const target = resolveLoginRedirect(locale, attemptedPath);
      const res = NextResponse.redirect(new URL(target, request.url));
      return applyFinalisers(request, res, {
        logRequests,
        reqId,
        start,
        metadata: {
          reason: 'protected route without session',
          redirect: target,
        },
      });
    }
  }

  return applyFinalisers(request, intlResponse, { logRequests, reqId, start });
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|_next/webpack-hmr|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.).*)',
  ],
};
