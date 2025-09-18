'use client';

import { usePermission, useAnyPermission, useAllPermissions, useHasRole, useHasAnyRole } from '@/lib/permissions/hooks';
import type { Permission } from '@/lib/permissions/permissions';
import type { UserRole } from '@/types';

interface ConditionalRenderProps {
  children: React.ReactNode;
  // Show if user has permission
  permission?: Permission;
  // Show if user has any of these permissions
  anyPermission?: Permission[];
  // Show if user has all of these permissions
  allPermissions?: Permission[];
  // Show if user has role
  role?: UserRole;
  // Show if user has any of these roles
  anyRole?: UserRole[];
  // Invert the condition (show if NOT matching)
  not?: boolean;
  // Fallback content when condition is not met
  fallback?: React.ReactNode;
}

export function ConditionalRender({
  children,
  permission,
  anyPermission,
  allPermissions,
  role,
  anyRole,
  not = false,
  fallback = null,
}: ConditionalRenderProps) {
  // Always call hooks to avoid conditional hook calls
  const hasPermission = usePermission(permission || '' as Permission);
  const hasAnyPermission = useAnyPermission(anyPermission || []);
  const hasAllPermissions = useAllPermissions(allPermissions || []);
  const hasRole = useHasRole(role || '' as UserRole);
  const hasAnyRole = useHasAnyRole(anyRole || []);

  // Calculate shouldShow based on provided conditions
  const conditions: boolean[] = [];
  if (permission) conditions.push(hasPermission);
  if (anyPermission && anyPermission.length > 0) conditions.push(hasAnyPermission);
  if (allPermissions && allPermissions.length > 0) conditions.push(hasAllPermissions);
  if (role) conditions.push(hasRole);
  if (anyRole && anyRole.length > 0) conditions.push(hasAnyRole);

  let shouldShow = conditions.length === 0 ? true : conditions.every(Boolean);

  // Authentication is implicitly handled by permission hooks
  // They return false when no user is present

  // Apply NOT condition
  if (not) {
    shouldShow = !shouldShow;
  }

  return shouldShow ? <>{children}</> : <>{fallback}</>;
}

// Convenience components
interface PermissionGateProps {
  children: React.ReactNode;
  permission: Permission;
  fallback?: React.ReactNode;
}

export function PermissionGate({ children, permission, fallback }: PermissionGateProps) {
  return (
    <ConditionalRender permission={permission} fallback={fallback}>
      {children}
    </ConditionalRender>
  );
}

interface RoleGateProps {
  children: React.ReactNode;
  role?: UserRole;
  anyRole?: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGate({ children, role, anyRole, fallback }: RoleGateProps) {
  return (
    <ConditionalRender role={role} anyRole={anyRole} fallback={fallback}>
      {children}
    </ConditionalRender>
  );
}

// Specific role gates
export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleGate role="admin" fallback={fallback}>
      {children}
    </RoleGate>
  );
}

export function CoachOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleGate role="coach" fallback={fallback}>
      {children}
    </RoleGate>
  );
}

export function ClientOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleGate role="client" fallback={fallback}>
      {children}
    </RoleGate>
  );
}

export function CoachOrAdmin({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleGate anyRole={['coach', 'admin']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

export function ClientOrAdmin({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleGate anyRole={['client', 'admin']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}
