'use client';

import { Loader2, AlertCircle } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { usePermission, useAnyPermission, useHasAnyRole } from '@/lib/permissions/hooks';
import type { Permission } from '@/lib/permissions/permissions';
import { useUser, useAuthLoading } from '@/lib/store/auth-store';
import { resolveRedirect } from '@/lib/utils/redirect';
import type { UserRole } from '@/types';

interface RouteGuardProps {
  children: React.ReactNode;
  // Require authentication
  requireAuth?: boolean;
  // Require specific permission
  requirePermission?: Permission;
  // Require any of these permissions
  requireAnyPermission?: Permission[];
  // Require specific role
  requireRole?: UserRole;
  // Require any of these roles
  requireAnyRole?: UserRole[];
  // Redirect path if unauthorized
  redirectTo?: string;
  // Custom unauthorized message
  unauthorizedMessage?: string;
  // Show loading spinner while checking auth
  showLoading?: boolean;
}

export function RouteGuard({
  children,
  requireAuth = true,
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireAnyRole,
  redirectTo,
  unauthorizedMessage,
  showLoading = true,
}: RouteGuardProps) {
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const user = useUser();
  const isLoading = useAuthLoading();
  const [mounted, setMounted] = useState(false);

  // Always call hooks to avoid conditional hook calls
  const hasRequiredPermission = usePermission(requirePermission || '' as Permission);
  const hasAnyRequiredPermission = useAnyPermission(requireAnyPermission || []);
  const hasRequiredRole = useHasAnyRole(requireAnyRole || (requireRole ? [requireRole] : []));
  
  // Apply permission logic
  const permissionSatisfied = !requirePermission || hasRequiredPermission;
  const anyPermissionSatisfied = !requireAnyPermission || hasAnyRequiredPermission;

  // Track when component has mounted (hydrated)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoading || !mounted) return; // Wait for auth to load and hydration to complete

    // Batch all redirect logic to reduce effect runs
    const checkAuthAndRedirect = () => {
      const buildLoginRedirect = () => {
        const baseLoginPath = resolveRedirect(locale, redirectTo || '/auth/signin', { allowAuthPaths: true });

        // Only attach the return destination when we're heading to an auth route
        if (typeof window === 'undefined' || !baseLoginPath.includes('/auth/')) {
          return baseLoginPath;
        }

        const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
        const attemptedPath = `${pathname || (typeof window !== 'undefined' ? window.location.pathname : '/') || '/'}${currentSearch}`;
        const safeReturnPath = resolveRedirect(locale, attemptedPath || '/dashboard');

        try {
          const loginUrl = new URL(baseLoginPath, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
          loginUrl.searchParams.set('redirectTo', safeReturnPath);
          return `${loginUrl.pathname}${loginUrl.search}`;
        } catch (error) {
          console.warn('Failed to construct login redirect URL:', error);
          return baseLoginPath;
        }
      };

      const redirectToPath = (path: string) => {
        router.push(path as '/auth/signin');
      };

      // Check if authentication is required
      if (requireAuth && !user) {
        redirectToPath(buildLoginRedirect());
        return;
      }

      // If no user and auth not required, allow access
      if (!user && !requireAuth) {
        return;
      }

      // Check role requirements
      if ((requireRole || requireAnyRole) && !hasRequiredRole) {
        const finalUnauthorizedPath = resolveRedirect(locale, redirectTo || '/dashboard');
        redirectToPath(finalUnauthorizedPath);
        return;
      }

      // Check permission requirements
      if (!permissionSatisfied || !anyPermissionSatisfied) {
        const finalUnauthorizedPath = resolveRedirect(locale, redirectTo || '/dashboard');
        redirectToPath(finalUnauthorizedPath);
        return;
      }
    };

    // Use requestIdleCallback to defer non-critical checks
    if ('requestIdleCallback' in window) {
      requestIdleCallback(checkAuthAndRedirect);
    } else {
      setTimeout(checkAuthAndRedirect, 0);
    }
  }, [
    isLoading,
    mounted,
    user,
    permissionSatisfied,
    anyPermissionSatisfied,
    hasRequiredRole,
    requireAuth,
    requirePermission,
    requireAnyPermission,
    requireRole,
    requireAnyRole,
    redirectTo,
    router,
    locale,
    pathname,
  ]);

  // Show loading state with skeleton to reduce LCP
  if (isLoading && showLoading) {
    return (
      <div
        className="min-h-screen bg-background flex flex-col"
        data-testid="route-guard-loading"
        role="region"
        aria-live="polite"
      >
        <span className="sr-only">Loading...</span>
        <div className="h-16 bg-card border-b flex items-center px-4">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="ml-auto flex items-center space-x-4">
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="h-8 w-64 bg-muted rounded animate-pulse mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-card border rounded-lg p-4">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
              <span className="text-lg font-medium">Loading...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated but missing role
  if (!isLoading && user && (requireRole || requireAnyRole) && !hasRequiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md" role="region" aria-live="assertive">
          <CardContent className="flex items-center justify-center p-8 text-center">
            <div>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                {unauthorizedMessage || 'You do not have permission to access this page.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated but missing permission
  if (!isLoading && user && (!permissionSatisfied || !anyPermissionSatisfied)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md" role="region" aria-live="assertive">
          <CardContent className="flex items-center justify-center p-8 text-center">
            <div>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                {unauthorizedMessage || 'You do not have the required permissions for this action.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All checks passed or still loading/waiting for redirect - render children
  // The redirect will happen in useEffect if needed
  return <>{children}</>;
}

// Convenience wrapper components
export function AdminRoute({ children, ...props }: Omit<RouteGuardProps, 'requireRole'>) {
  return (
    <RouteGuard {...props} requireRole="admin">
      {children}
    </RouteGuard>
  );
}

export function CoachRoute({ children, ...props }: Omit<RouteGuardProps, 'requireRole'>) {
  return (
    <RouteGuard {...props} requireRole="coach">
      {children}
    </RouteGuard>
  );
}

export function ClientRoute({ children, ...props }: Omit<RouteGuardProps, 'requireRole'>) {
  return (
    <RouteGuard {...props} requireRole="client">
      {children}
    </RouteGuard>
  );
}

export function CoachOrAdminRoute({ children, ...props }: Omit<RouteGuardProps, 'requireAnyRole'>) {
  return (
    <RouteGuard {...props} requireAnyRole={['coach', 'admin']}>
      {children}
    </RouteGuard>
  );
}

export function ClientOrAdminRoute({ children, ...props }: Omit<RouteGuardProps, 'requireAnyRole'>) {
  return (
    <RouteGuard {...props} requireAnyRole={['client', 'admin']}>
      {children}
    </RouteGuard>
  );
}
