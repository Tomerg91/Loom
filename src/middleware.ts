import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { applySecurityHeaders } from './lib/security/headers';
import { validateUserAgent } from './lib/security/validation';
import createMiddleware from 'next-intl/middleware';

// Create next-intl middleware
const intlMiddleware = createMiddleware(routing);

// Simplified auth checking for middleware - avoid complex Supabase imports
function getSessionFromCookies(request: NextRequest) {
  try {
    // Get auth cookies that Supabase sets
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;
    
    // Check for the new cookie format used by newer Supabase versions
    const authCookie = request.cookies.get('sb-auth-token')?.value;
    // Also check any sb-* token cookie variants (project-scoped names)
    const anySbToken = request.cookies
      .getAll()
      .some(c => c.name.startsWith('sb-') && (c.name.includes('auth') || c.name.includes('access')) && !!c.value);
    
    // Simple validation - if we have tokens, assume user is authenticated
    // For more robust validation, this should be done in API routes
    return !!(accessToken || refreshToken || authCookie || anySbToken);
  } catch (error) {
    console.warn('Error checking auth cookies in middleware:', error);
    return false;
  }
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
    // Apply security headers to the intl response
    const res = applySecurityHeaders(request, intlResponse);
    if (logRequests) {
      res.headers.set('X-Request-ID', reqId);
      console.info('[RES]', { id: reqId, path: pathname, status: res.status, durMs: Date.now() - start, intl: true });
    }
    return res;
  }

  // If we get here, the locale is already validated by next-intl
  // Optionally handle authentication for locale-prefixed routes
  try {
    // Use simplified cookie-based auth checking
    const hasAuthSession = getSessionFromCookies(request);

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

    if (AUTH_GATING_ENABLED) {
      // Redirect authenticated users away from auth pages
      if (hasAuthSession && isAuthRoute) {
        const res = NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
        if (logRequests) {
          res.headers.set('X-Request-ID', reqId);
          console.info('[RES]', { id: reqId, path: pathname, status: 307, redirect: `/${locale}/dashboard`, reason: 'auth route, already authed', durMs: Date.now() - start });
        }
        return res;
      }

      // Allow access to public routes
      if (isPublicRoute) {
        const res = applySecurityHeaders(request, NextResponse.next());
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
        const res = NextResponse.redirect(redirectUrl);
        if (logRequests) {
          res.headers.set('X-Request-ID', reqId);
          console.info('[RES]', { id: reqId, path: pathname, status: 307, redirect: redirectUrl.toString(), reason: 'protected route not authed', durMs: Date.now() - start });
        }
        return res;
      }
    }

    // Either auth gating disabled or checks passed
    const res = applySecurityHeaders(request, NextResponse.next());
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
      const res = NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url));
      if (logRequests) {
        res.headers.set('X-Request-ID', reqId);
        console.warn('[RES]', { id: reqId, path: pathname, status: 307, redirect: `/${locale}/auth/signin`, reason: 'middleware error on protected route', durMs: Date.now() - start });
      }
      return res;
    }
    const res = applySecurityHeaders(request, NextResponse.next());
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
