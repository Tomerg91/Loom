import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { routing } from './i18n/routing';
import { applySecurityHeaders } from './lib/security/headers';
import { validateUserAgent } from './lib/security/validation';
import { enforceAuth } from '@/lib/middleware/auth';
import { createRequestLogger } from '@/lib/middleware/logger';
import { enforceLocale } from '@/lib/middleware/locale';
import { AUTH_GATING_ENABLED, PROTECTED_ROUTES } from '@/lib/middleware/route-config';
import { refreshSessionOnResponse } from '@/lib/middleware/session';
import { bypassStaticAssets } from '@/lib/middleware/static-assets';

const intlMiddleware = createMiddleware(routing);

function isRedirect(response: NextResponse) {
  return response.headers.has('location');
}

export async function middleware(request: NextRequest) {
  const logger = createRequestLogger(request);

  const staticResult = bypassStaticAssets(request);
  if (staticResult) {
    return logger.finalize(staticResult.response, {
      static: staticResult.reason === 'static',
      reason: staticResult.reason === 'api' ? 'api bypass' : undefined,
      status: 200,
    });
  }

  if (process.env.NODE_ENV === 'production' && process.env.MIDDLEWARE_UA_CHECK !== 'false') {
    const userAgent = request.headers.get('user-agent') || '';
    if (!validateUserAgent(userAgent)) {
      const forbidden = new NextResponse('Forbidden', { status: 403 });
      return logger.finalize(forbidden, { reason: 'UA invalid', status: 403 });
    }
  }

  const localeResult = enforceLocale(request);
  if ('response' in localeResult) {
    const refreshed = await refreshSessionOnResponse(request, localeResult.response);
    return logger.finalize(refreshed, {
      reason: localeResult.reason,
      redirect: localeResult.redirect,
      status: refreshed.status,
    });
  }

  const intlResponse = intlMiddleware(request);
  if (intlResponse) {
    const secured = applySecurityHeaders(request, intlResponse);
    const refreshed = await refreshSessionOnResponse(request, secured);
    return logger.finalize(refreshed, { intl: true, status: refreshed.status });
  }

  try {
    const authResult = await enforceAuth({
      request,
      locale: localeResult.locale,
      pathWithoutLocale: localeResult.pathWithoutLocale,
    });

    if (authResult.response) {
      const responseWithHeaders = isRedirect(authResult.response)
        ? authResult.response
        : applySecurityHeaders(request, authResult.response);
      const refreshed = await refreshSessionOnResponse(request, responseWithHeaders);
      return logger.finalize(refreshed, {
        ...authResult.meta,
        status: authResult.meta?.status ?? refreshed.status,
      });
    }

    const baseline = applySecurityHeaders(request, NextResponse.next());
    const refreshed = await refreshSessionOnResponse(request, baseline);
    return logger.finalize(refreshed, { status: refreshed.status });
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (AUTH_GATING_ENABLED) {
      const isProtectedRoute = PROTECTED_ROUTES.some(route =>
        localeResult.pathWithoutLocale.startsWith(route)
      );
      if (isProtectedRoute) {
        const redirectUrl = new URL(`/${localeResult.locale}/auth/signin`, request.url);
        const redirectResponse = await refreshSessionOnResponse(
          request,
          NextResponse.redirect(redirectUrl)
        );
        return logger.finalize(redirectResponse, {
          reason: 'middleware error on protected route',
          redirect: redirectUrl.toString(),
          status: 307,
        });
      }
    }

    const fallback = applySecurityHeaders(request, NextResponse.next());
    const refreshed = await refreshSessionOnResponse(request, fallback);
    return logger.finalize(refreshed, {
      errorHandled: true,
      status: refreshed.status,
    });
  }
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|_next/webpack-hmr|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.).*)',
  ],
};
