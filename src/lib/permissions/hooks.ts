'use client';

import { useUser } from '@/lib/auth/use-user';
import type { UserRole } from '@/types';

import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  canAccessUserResource,
  canAccessSessionResource,
  canManageCoachResource,
  canViewClientData,
  type Permission 
} from './permissions';

// Permission hooks
export function usePermission(permission: Permission): boolean {
  const user = useUser();
  
  if (!user) {
    return false;
  }
  
  return hasPermission(user.role, permission);
}

export function useAnyPermission(permissions: Permission[]): boolean {
  const user = useUser();
  
  if (!user) {
    return false;
  }
  
  return hasAnyPermission(user.role, permissions);
}

export function useAllPermissions(permissions: Permission[]): boolean {
  const user = useUser();
  
  if (!user) {
    return false;
  }
  
  return hasAllPermissions(user.role, permissions);
}

// Role checking hooks
export function useHasRole(role: UserRole): boolean {
  const user = useUser();
  return user?.role === role;
}

export function useHasAnyRole(roles: UserRole[]): boolean {
  const user = useUser();
  return user ? roles.includes(user.role) : false;
}

export function useIsAdmin(): boolean {
  return useHasRole('admin');
}

export function useIsCoach(): boolean {
  return useHasRole('coach');
}

export function useIsClient(): boolean {
  return useHasRole('client');
}

// Resource access hooks
export function useCanAccessUser(targetUserId: string): boolean {
  const user = useUser();
  
  if (!user) {
    return false;
  }
  
  return canAccessUserResource(user.role, user.id, targetUserId);
}

export function useCanAccessSession(session: { coachId: string; clientId: string }): boolean {
  const user = useUser();
  
  if (!user) {
    return false;
  }
  
  return canAccessSessionResource(user.role, user.id, session);
}

export function useCanManageCoach(targetCoachId: string): boolean {
  const user = useUser();
  
  if (!user) {
    return false;
  }
  
  return canManageCoachResource(user.role, user.id, targetCoachId);
}

export function useCanViewClientData(clientId: string, coachId?: string): boolean {
  const user = useUser();
  
  if (!user) {
    return false;
  }
  
  return canViewClientData(user.role, user.id, clientId, coachId);
}

// Convenience hooks for common permission patterns
export function useCanCreateSessions(): boolean {
  return usePermission('session:create');
}

export function useCanManageUsers(): boolean {
  return useAnyPermission(['user:update:any', 'user:delete:any', 'user:manage:roles']);
}

export function useCanViewAnalytics(): boolean {
  return usePermission('admin:view:analytics');
}

export function useCanSendNotifications(): boolean {
  return usePermission('notification:send:any');
}

export function useCanManageNotes(): boolean {
  return usePermission('coach:manage:notes');
}

export function useCanManageReflections(): boolean {
  return usePermission('client:manage:reflections');
}

export function useCanBookSessions(): boolean {
  return usePermission('client:book:sessions');
}

export function useCanManageAvailability(): boolean {
  return usePermission('coach:manage:availability');
}
