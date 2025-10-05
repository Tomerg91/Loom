import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from '@/types';
import { PROTECTED_ROUTES, PUBLIC_ROUTES } from '@/lib/middleware/route-config';

// Admin-only routes
const adminRoutes = [
  '/admin',
];

// Coach-only routes
const coachRoutes = [
  '/coach',
];

// Client-only routes
const clientRoutes = [
  '/client',
];

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // Create supabase client
  const supabase = createServerClient();
  
  try {
    // Get session
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    // Check if route is protected
    const isProtectedRoute = PROTECTED_ROUTES.some(route =>
      pathname.startsWith(route)
    );

    const isPublicRoute = PUBLIC_ROUTES.some(route =>
      pathname === route || pathname.startsWith(route)
    );

    // Redirect authenticated users away from auth pages
    if (user && pathname.startsWith('/auth/')) {
      const response = NextResponse.redirect(new URL('/dashboard', request.url));
      return response;
    }

    // Allow access to public routes
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // Require authentication for protected routes
    if (isProtectedRoute && !user) {
      const response = NextResponse.redirect(new URL('/auth/signin', request.url));
      return response;
    }

    // If user is authenticated, check role-based access
    if (user && isProtectedRoute) {
      // Get user profile to check role
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = userProfile?.role as UserRole;

      // Check admin routes
      if (adminRoutes.some(route => pathname.startsWith(route))) {
        if (userRole !== 'admin') {
          const response = NextResponse.redirect(new URL('/dashboard', request.url));
          return response;
        }
      }

      // Check coach routes
      if (coachRoutes.some(route => pathname.startsWith(route))) {
        if (userRole !== 'coach' && userRole !== 'admin') {
          const response = NextResponse.redirect(new URL('/dashboard', request.url));
          return response;
        }
      }

      // Check client routes
      if (clientRoutes.some(route => pathname.startsWith(route))) {
        if (userRole !== 'client' && userRole !== 'admin') {
          const response = NextResponse.redirect(new URL('/dashboard', request.url));
          return response;
        }
      }

      // Update last seen timestamp
      await supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // If there's an error and it's a protected route, redirect to signin
    if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
      const response = NextResponse.redirect(new URL('/auth/signin', request.url));
      return response;
    }
    
    return NextResponse.next();
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