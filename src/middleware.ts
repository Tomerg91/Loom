import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';
import { applySecurityHeaders } from '@/lib/security/headers';
import { validateUserAgent } from '@/lib/security/validation';
import createMiddleware from 'next-intl/middleware';
import { config as appConfig } from '@/lib/config';
// import { createMfaService } from '@/lib/services/mfa-service';

// Create next-intl middleware
const intlMiddleware = createMiddleware(routing);

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

// Routes that require MFA verification (in addition to basic auth)
const mfaRequiredRoutes = [
  '/admin',
  '/settings/security',
  '/settings/mfa',
];

// Admin-only routes
const adminRoutes = ['/admin'];

// Coach-only routes
const coachRoutes = ['/coach'];

// Client-only routes
const clientRoutes = ['/client'];

// Role cache to reduce database queries
interface CachedRole {
  role: string;
  timestamp: number;
}

const roleCache = new Map<string, CachedRole>();
const CACHE_TTL = appConfig.cache.ROLE_CACHE_TTL;

async function getUserRole(userId: string, supabase: ReturnType<typeof createServerClient>): Promise<string | null> {
  const now = Date.now();
  
  // Check cache first
  const cached = roleCache.get(userId);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.role;
  }
  
  // Query database if not cached or expired
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
    
  if (userProfile?.role) {
    // Cache the result
    roleCache.set(userId, {
      role: userProfile.role,
      timestamp: now
    });
    
    // Clean up old cache entries periodically (simple approach)
    if (roleCache.size > appConfig.cache.ROLE_CACHE_MAX_SIZE) {
      const entries = Array.from(roleCache.entries());
      for (const [key, value] of entries) {
        if ((now - value.timestamp) >= CACHE_TTL) {
          roleCache.delete(key);
        }
      }
    }
    
    return userProfile.role;
  }
  
  return null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // Apply security validation
  const userAgent = request.headers.get('user-agent') || '';
  if (process.env.NODE_ENV === 'production' && !validateUserAgent(userAgent)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Check for invalid locale patterns first
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  
  // If first segment looks like a locale (2 chars) but isn't valid, redirect to default locale
  if (firstSegment && firstSegment.length === 2 && !routing.locales.includes(firstSegment as 'en' | 'he')) {
    const pathWithoutInvalidLocale = '/' + segments.slice(1).join('/');
    const redirectUrl = new URL(`/${routing.defaultLocale}${pathWithoutInvalidLocale}`, request.url);
    return applySecurityHeaders(request, NextResponse.redirect(redirectUrl));
  }

  // Handle internationalization first - let next-intl handle ALL locale routing
  const intlResponse = intlMiddleware(request);
  if (intlResponse) {
    // Apply security headers to the intl response
    return applySecurityHeaders(request, intlResponse);
  }

  // If we get here, the locale is already validated by next-intl
  // Now handle authentication for locale-prefixed routes
  try {
    // Use singleton supabase client to prevent multiple GoTrueClient instances
    const supabase = createServerClient();
    
    // Get session
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

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

    // Redirect authenticated users away from auth pages
    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    // Allow access to public routes
    if (isPublicRoute) {
      return applySecurityHeaders(request, NextResponse.next());
    }

    // Require authentication for protected routes
    if (isProtectedRoute && !user) {
      const redirectUrl = new URL(`/${locale}/auth/signin`, request.url);
      redirectUrl.searchParams.set('redirectTo', pathWithoutLocale);
      return NextResponse.redirect(redirectUrl);
    }

    // If user is authenticated, check role-based access and MFA requirements
    if (user && isProtectedRoute) {
      // Get user role (cached for performance)
      const userRole = await getUserRole(user.id, supabase);

      // Check if MFA verification is required for this route
      const requiresMfa = mfaRequiredRoutes.some(route => 
        pathWithoutLocale.startsWith(route)
      );

      // Check if user has MFA enabled and route requires MFA
      // TODO: Re-enable MFA checks once Edge Runtime compatibility is resolved
      if (requiresMfa) {
        // Temporarily skip MFA checks to avoid Edge Runtime issues
        console.log('MFA checks temporarily disabled for Edge Runtime compatibility');
      }

      // Check admin routes
      if (adminRoutes.some(route => pathWithoutLocale.startsWith(route))) {
        if (userRole !== 'admin') {
          return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
        }
      }

      // Check coach routes
      if (coachRoutes.some(route => pathWithoutLocale.startsWith(route))) {
        if (userRole !== 'coach' && userRole !== 'admin') {
          return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
        }
      }

      // Check client routes
      if (clientRoutes.some(route => pathWithoutLocale.startsWith(route))) {
        if (userRole !== 'client' && userRole !== 'admin') {
          return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
        }
      }

      // Update last seen timestamp
      await supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    return applySecurityHeaders(request, NextResponse.next());
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // If there's an error and it's a protected route, redirect to signin
    const locale = pathname.split('/')[1];
    const pathWithoutLocale = pathname.slice(locale.length + 1) || '/';
    
    if (protectedRoutes.some(route => pathWithoutLocale.startsWith(route))) {
      return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url));
    }
    
    return applySecurityHeaders(request, NextResponse.next());
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};