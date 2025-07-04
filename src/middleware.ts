import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { locales, defaultLocale } from '@/i18n/config';

// Create the next-intl middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

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
];

// Admin-only routes
const adminRoutes = ['/admin'];

// Coach-only routes
const coachRoutes = ['/coach'];

// Client-only routes
const clientRoutes = ['/client'];

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

  // Handle internationalization first
  const pathnameIsMissingLocale = locales.every(
    locale => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    // Redirect to default locale if no locale is present
    return NextResponse.redirect(
      new URL(`/${defaultLocale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, request.url)
    );
  }

  // Apply intl middleware
  const response = intlMiddleware(request);
  
  try {
    // Create supabase client
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
      return response;
    }

    // Require authentication for protected routes
    if (isProtectedRoute && !user) {
      const redirectUrl = new URL(`/${locale}/auth/signin`, request.url);
      redirectUrl.searchParams.set('redirectTo', pathWithoutLocale);
      return NextResponse.redirect(redirectUrl);
    }

    // If user is authenticated, check role-based access
    if (user && isProtectedRoute) {
      // Get user profile to check role
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = userProfile?.role;

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

    return response;
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // If there's an error and it's a protected route, redirect to signin
    if (protectedRoutes.some(route => pathname.includes(route))) {
      const locale = pathname.split('/')[1];
      return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url));
    }
    
    return response;
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