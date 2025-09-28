import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { applySecurityHeaders } from './lib/security/headers';
import { validateUserAgent } from './lib/security/validation';
import createMiddleware from 'next-intl/middleware';
import { createServerClientWithRequest } from '@/lib/supabase/server';

// Create next-intl middleware
const intlMiddleware = createMiddleware(routing);

// Simplified auth checking for middleware - avoid complex Supabase imports
async function getHasSession(request: NextRequest): Promise<boolean> {
  try {
    // Use a throwaway response for session check; we'll refresh on the final response later
    const tempRes = NextResponse.next();
    const supabase = createServerClientWithRequest(request, tempRes);
    const { data, error } = await supabase.auth.getSession();
    if (error) return false;
    return !!data.session?.user;
  } catch (error) {
    console.warn('Error checking auth session in middleware:', error);
    return false;
  }
}

async function refreshSessionOnResponse(request: NextRequest, response: NextResponse) {
  try {
    const supabase = createServerClientWithRequest(request, response);
    // This ensures rotating access tokens are re-cookies on every request
    await supabase.auth.getSession();
  } catch (error) {
    // Non-fatal; proceed without refresh
    console.warn('Failed to refresh Supabase session in middleware:', error);
  }
  return response;
}

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/sessions',
  '/profile',
  '/settings',
  '/coach',
  '/client',
  '/admin',
];

// Routes that are public (no auth required)
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/callback',
  '/auth/mfa-verify',
  '/auth/mfa-setup',
];

// Feature flag to control whether auth gating runs in middleware.
// Keep enabled by default to avoid behavior changes until routes are fully guarded.
const AUTH_GATING_ENABLED = process.env.MIDDLEWARE_AUTH_ENABLED !== 'false';

export async function middleware(request: NextRequest) {
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
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    });
  }
  
  // CRITICAL: Skip ALL middleware logic for Next.js static assets
  // This must be the FIRST check to prevent any middleware execution
  // This prevents CSS files from being processed as pages/routes
  if (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/_next/image/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/static/') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.js.map') ||
    pathname.endsWith('.css.map') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.eot') ||
    pathname.startsWith('/api/') ||
    // Additional protection for static assets with query parameters
    pathname.match(/\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)(\?.*)?$/)
  ) {
    // Return immediately without any processing
    // This ensures static assets are served directly by the web server
    const res = NextResponse.next();
    if (logRequests) {
      res.headers.set('X-Request-ID', reqId);
      console.info('[RES]', { id: reqId, path: pathname, status: 200, durMs: Date.now() - start, static: true });
    }
    return res;
  }

  // Apply basic UA validation in production only (can be disabled via env flag)
  const userAgent = request.headers.get('user-agent') || '';
  if (process.env.NODE_ENV === 'production' && process.env.MIDDLEWARE_UA_CHECK !== 'false') {
    if (!validateUserAgent(userAgent)) {
      const res = new NextResponse('Forbidden', { status: 403 });
      if (logRequests) {
        res.headers.set('X-Request-ID', reqId);
        console.warn('[RES]', { id: reqId, path: pathname, status: 403, reason: 'UA invalid', durMs: Date.now() - start });
      }
      return res;
    }
  }

  // Check for invalid locale patterns first
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  
  // If first segment looks like a locale (2 chars) but isn't valid, redirect to default locale
  if (firstSegment && firstSegment.length === 2 && !routing.locales.includes(firstSegment as 'en' | 'he')) {
    const pathWithoutInvalidLocale = '/' + segments.slice(1).join('/');
    const redirectUrl = new URL(`/${routing.defaultLocale}${pathWithoutInvalidLocale}`, request.url);
    const res = applySecurityHeaders(request, NextResponse.redirect(redirectUrl));
    if (logRequests) {
      res.headers.set('X-Request-ID', reqId);
      console.info('[RES]', { id: reqId, path: pathname, status: 307, redirect: redirectUrl.toString(), reason: 'invalid locale', durMs: Date.now() - start });
    }
    return res;
  }

  // Handle internationalization first - let next-intl handle ALL locale routing
  const intlResponse = intlMiddleware(request);
  if (intlResponse) {
    // Apply security headers and refresh Supabase session on the intl response
    let res = applySecurityHeaders(request, intlResponse);
    res = await refreshSessionOnResponse(request, res);
    if (logRequests) {
      res.headers.set('X-Request-ID', reqId);
      console.info('[RES]', { id: reqId, path: pathname, status: res.status, durMs: Date.now() - start, intl: true });
    }
    return res;
  }

  // If we get here, the locale is already validated by next-intl
  // Optionally handle authentication for locale-prefixed routes
  try {
    // Check session via Supabase (more reliable than cookie heuristics)
    const hasAuthSession = await getHasSession(request);
    const mfaPending = request.cookies.get('mfa_pending')?.value === 'true';

    // Extract locale and path without locale
    const locale = pathname.split('/')[1];
    const pathWithoutLocale = pathname.slice(locale.length + 1) || '/';

    // Check if route is protected
    const isProtectedRoute = protectedRoutes.some(route => 
      pathWithoutLocale.startsWith(route)
    );

    const isPublicRoute = publicRoutes.some(route => 
      pathWithoutLocale === route || pathWithoutLocale.startsWith(route)
    );

    const isAuthRoute = pathWithoutLocale.startsWith('/auth/');
    const isMfaVerifyRoute = pathWithoutLocale.startsWith('/auth/mfa-verify');

    if (AUTH_GATING_ENABLED) {
      // MFA gating: if authenticated and pending MFA, force to MFA verify page
      if (hasAuthSession && mfaPending && !isMfaVerifyRoute) {
        const redirectUrl = new URL(`/${locale}/auth/mfa-verify`, request.url);
        const origRedirect = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
        redirectUrl.searchParams.set('redirectTo', origRedirect);
        let res = NextResponse.redirect(redirectUrl);
        res = await refreshSessionOnResponse(request, res);
        if (logRequests) {
          res.headers.set('X-Request-ID', reqId);
          console.info('[RES]', { id: reqId, path: pathname, status: 307, redirect: redirectUrl.toString(), reason: 'mfa pending redirect', durMs: Date.now() - start });
        }
        return res;
      }

      // Redirect authenticated users away from other auth pages
      if (hasAuthSession && isAuthRoute && !mfaPending) {
        let res = NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
        res = await refreshSessionOnResponse(request, res);
        if (logRequests) {
          res.headers.set('X-Request-ID', reqId);
          console.info('[RES]', { id: reqId, path: pathname, status: 307, redirect: `/${locale}/dashboard`, reason: 'auth route, already authed', durMs: Date.now() - start });
        }
        return res;
      }

      // Allow access to public routes
      if (isPublicRoute) {
        let res = applySecurityHeaders(request, NextResponse.next());
        res = await refreshSessionOnResponse(request, res);
        if (logRequests) {
          res.headers.set('X-Request-ID', reqId);
          console.info('[RES]', { id: reqId, path: pathname, status: 200, reason: 'public route', durMs: Date.now() - start });
        }
        return res;
      }

      // Require authentication for protected routes
      if (isProtectedRoute && !hasAuthSession) {
        const redirectUrl = new URL(`/${locale}/auth/signin`, request.url);
        redirectUrl.searchParams.set('redirectTo', pathWithoutLocale);
        let res = NextResponse.redirect(redirectUrl);
        res = await refreshSessionOnResponse(request, res);
        if (logRequests) {
          res.headers.set('X-Request-ID', reqId);
          console.info('[RES]', { id: reqId, path: pathname, status: 307, redirect: redirectUrl.toString(), reason: 'protected route not authed', durMs: Date.now() - start });
        }
        return res;
      }
    }

    // Either auth gating disabled or checks passed
    let res = applySecurityHeaders(request, NextResponse.next());
    res = await refreshSessionOnResponse(request, res);
    if (logRequests) {
      res.headers.set('X-Request-ID', reqId);
      console.info('[RES]', { id: reqId, path: pathname, status: 200, durMs: Date.now() - start });
    }
    return res;
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // If there's an error and it's a protected route, redirect to signin
    const locale = pathname.split('/')[1];
    const pathWithoutLocale = pathname.slice(locale.length + 1) || '/';
    
    if (AUTH_GATING_ENABLED && protectedRoutes.some(route => pathWithoutLocale.startsWith(route))) {
      let res = NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url));
      res = await refreshSessionOnResponse(request, res);
      if (logRequests) {
        res.headers.set('X-Request-ID', reqId);
        console.warn('[RES]', { id: reqId, path: pathname, status: 307, redirect: `/${locale}/auth/signin`, reason: 'middleware error on protected route', durMs: Date.now() - start });
      }
      return res;
    }
    let res = applySecurityHeaders(request, NextResponse.next());
    res = await refreshSessionOnResponse(request, res);
    if (logRequests) {
      res.headers.set('X-Request-ID', reqId);
      console.info('[RES]', { id: reqId, path: pathname, status: 200, durMs: Date.now() - start, errorHandled: true });
    }
    return res;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - API routes
     * - Static files (_next/static, _next/image)
     * - Public files (favicon, robots.txt, etc.)
     * - File extensions (css, js, images, fonts, etc.)
     */
    '/((?!api/|_next/static|_next/image|_next/webpack-hmr|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.).*)',
  ],
};
