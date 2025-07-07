'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuthLoading } from '@/lib/store/auth-store';
import { usePermission, useAnyPermission, useHasAnyRole } from '@/lib/permissions/hooks';
import type { Permission } from '@/lib/permissions/permissions';
import type { UserRole } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

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
  const user = useUser();
  const isLoading = useAuthLoading();
  
  // Always call hooks to avoid conditional hook calls
  const hasRequiredPermission = usePermission(requirePermission || '' as Permission);
  const hasAnyRequiredPermission = useAnyPermission(requireAnyPermission || []);
  const hasRequiredRole = useHasAnyRole(requireAnyRole || (requireRole ? [requireRole] : []));
  
  // Apply permission logic
  const permissionSatisfied = !requirePermission || hasRequiredPermission;
  const anyPermissionSatisfied = !requireAnyPermission || hasAnyRequiredPermission;

  useEffect(() => {
    if (isLoading) return; // Wait for auth to load

    // Check if authentication is required
    if (requireAuth && !user) {
      const loginPath = redirectTo || '/auth/signin';
      router.push(loginPath as '/auth/signin');
      return;
    }

    // If no user and auth not required, allow access
    if (!user && !requireAuth) {
      return;
    }

    // Check role requirements
    if ((requireRole || requireAnyRole) && !hasRequiredRole) {
      const unauthorizedPath = redirectTo || '/dashboard';
      router.push(unauthorizedPath as '/dashboard');
      return;
    }

    // Check permission requirements
    if (!permissionSatisfied || !anyPermissionSatisfied) {
      const unauthorizedPath = redirectTo || '/dashboard';
      router.push(unauthorizedPath as '/dashboard');
      return;
    }
  }, [
    isLoading,
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
  ]);

  // Show loading state
  if (isLoading && showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span className="text-lg">Loading...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check authorization after loading
  if (!isLoading) {
    // Not authenticated but auth required
    if (requireAuth && !user) {
      return null; // Will redirect in useEffect
    }

    // Authenticated but missing role
    if (user && (requireRole || requireAnyRole) && !hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
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
    if (user && (!permissionSatisfied || !anyPermissionSatisfied)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
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
  }

  // All checks passed, render children
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