import type { UserRole } from '@/types';

// Define all available permissions in the system
export const PERMISSIONS = {
  // User management permissions
  USER_VIEW_ALL: 'user:view:all',
  USER_VIEW_OWN: 'user:view:own',
  USER_CREATE: 'user:create',
  USER_UPDATE_OWN: 'user:update:own',
  USER_UPDATE_ANY: 'user:update:any',
  USER_DELETE_ANY: 'user:delete:any',
  USER_MANAGE_ROLES: 'user:manage:roles',

  // Session management permissions
  SESSION_VIEW_OWN: 'session:view:own',
  SESSION_VIEW_ALL: 'session:view:all',
  SESSION_CREATE: 'session:create',
  SESSION_UPDATE_OWN: 'session:update:own',
  SESSION_UPDATE_ANY: 'session:update:any',
  SESSION_DELETE_OWN: 'session:delete:own',
  SESSION_DELETE_ANY: 'session:delete:any',
  SESSION_MANAGE_AVAILABILITY: 'session:manage:availability',

  // Coach-specific permissions
  COACH_VIEW_CLIENTS: 'coach:view:clients',
  COACH_MANAGE_NOTES: 'coach:manage:notes',
  COACH_VIEW_CLIENT_REFLECTIONS: 'coach:view:client_reflections',
  COACH_MANAGE_AVAILABILITY: 'coach:manage:availability',

  // Client-specific permissions
  CLIENT_VIEW_COACHES: 'client:view:coaches',
  CLIENT_BOOK_SESSIONS: 'client:book:sessions',
  CLIENT_MANAGE_REFLECTIONS: 'client:manage:reflections',
  CLIENT_VIEW_OWN_PROGRESS: 'client:view:own_progress',

  // Admin permissions
  ADMIN_VIEW_DASHBOARD: 'admin:view:dashboard',
  ADMIN_MANAGE_SYSTEM: 'admin:manage:system',
  ADMIN_VIEW_ANALYTICS: 'admin:view:analytics',
  ADMIN_MANAGE_NOTIFICATIONS: 'admin:manage:notifications',

  // Notification permissions
  NOTIFICATION_VIEW_OWN: 'notification:view:own',
  NOTIFICATION_MANAGE_OWN: 'notification:manage:own',
  NOTIFICATION_SEND_ANY: 'notification:send:any',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Admin has all permissions
    PERMISSIONS.USER_VIEW_ALL,
    PERMISSIONS.USER_VIEW_OWN,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE_OWN,
    PERMISSIONS.USER_UPDATE_ANY,
    PERMISSIONS.USER_DELETE_ANY,
    PERMISSIONS.USER_MANAGE_ROLES,
    PERMISSIONS.SESSION_VIEW_OWN,
    PERMISSIONS.SESSION_VIEW_ALL,
    PERMISSIONS.SESSION_CREATE,
    PERMISSIONS.SESSION_UPDATE_OWN,
    PERMISSIONS.SESSION_UPDATE_ANY,
    PERMISSIONS.SESSION_DELETE_OWN,
    PERMISSIONS.SESSION_DELETE_ANY,
    PERMISSIONS.SESSION_MANAGE_AVAILABILITY,
    PERMISSIONS.COACH_VIEW_CLIENTS,
    PERMISSIONS.COACH_MANAGE_NOTES,
    PERMISSIONS.COACH_VIEW_CLIENT_REFLECTIONS,
    PERMISSIONS.COACH_MANAGE_AVAILABILITY,
    PERMISSIONS.CLIENT_VIEW_COACHES,
    PERMISSIONS.CLIENT_BOOK_SESSIONS,
    PERMISSIONS.CLIENT_MANAGE_REFLECTIONS,
    PERMISSIONS.CLIENT_VIEW_OWN_PROGRESS,
    PERMISSIONS.ADMIN_VIEW_DASHBOARD,
    PERMISSIONS.ADMIN_MANAGE_SYSTEM,
    PERMISSIONS.ADMIN_VIEW_ANALYTICS,
    PERMISSIONS.ADMIN_MANAGE_NOTIFICATIONS,
    PERMISSIONS.NOTIFICATION_VIEW_OWN,
    PERMISSIONS.NOTIFICATION_MANAGE_OWN,
    PERMISSIONS.NOTIFICATION_SEND_ANY,
  ],
  coach: [
    // Coach permissions
    PERMISSIONS.USER_VIEW_OWN,
    PERMISSIONS.USER_UPDATE_OWN,
    PERMISSIONS.SESSION_VIEW_OWN,
    PERMISSIONS.SESSION_CREATE,
    PERMISSIONS.SESSION_UPDATE_OWN,
    PERMISSIONS.SESSION_DELETE_OWN,
    PERMISSIONS.SESSION_MANAGE_AVAILABILITY,
    PERMISSIONS.COACH_VIEW_CLIENTS,
    PERMISSIONS.COACH_MANAGE_NOTES,
    PERMISSIONS.COACH_VIEW_CLIENT_REFLECTIONS,
    PERMISSIONS.COACH_MANAGE_AVAILABILITY,
    PERMISSIONS.CLIENT_VIEW_COACHES, // Can view other coaches for referrals
    PERMISSIONS.NOTIFICATION_VIEW_OWN,
    PERMISSIONS.NOTIFICATION_MANAGE_OWN,
  ],
  client: [
    // Client permissions
    PERMISSIONS.USER_VIEW_OWN,
    PERMISSIONS.USER_UPDATE_OWN,
    PERMISSIONS.SESSION_VIEW_OWN,
    PERMISSIONS.CLIENT_VIEW_COACHES,
    PERMISSIONS.CLIENT_BOOK_SESSIONS,
    PERMISSIONS.CLIENT_MANAGE_REFLECTIONS,
    PERMISSIONS.CLIENT_VIEW_OWN_PROGRESS,
    PERMISSIONS.NOTIFICATION_VIEW_OWN,
    PERMISSIONS.NOTIFICATION_MANAGE_OWN,
  ],
};

// Helper functions for permission checking
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions.includes(permission);
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

export function getUserPermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole];
}

// Resource ownership checking helpers
export function canAccessUserResource(
  currentUserRole: UserRole, 
  currentUserId: string, 
  targetUserId: string
): boolean {
  // Admin can access any user
  if (currentUserRole === 'admin') {
    return true;
  }
  
  // Users can access their own resources
  if (currentUserId === targetUserId) {
    return true;
  }
  
  return false;
}

export function canAccessSessionResource(
  currentUserRole: UserRole,
  currentUserId: string,
  session: { coachId: string; clientId: string }
): boolean {
  // Admin can access any session
  if (currentUserRole === 'admin') {
    return true;
  }
  
  // Coach or client involved in the session can access it
  if (currentUserId === session.coachId || currentUserId === session.clientId) {
    return true;
  }
  
  return false;
}

export function canManageCoachResource(
  currentUserRole: UserRole,
  currentUserId: string,
  targetCoachId: string
): boolean {
  // Admin can manage any coach resource
  if (currentUserRole === 'admin') {
    return true;
  }
  
  // Coach can manage their own resources
  if (currentUserRole === 'coach' && currentUserId === targetCoachId) {
    return true;
  }
  
  return false;
}

export function canViewClientData(
  currentUserRole: UserRole,
  currentUserId: string,
  clientId: string,
  coachId?: string
): boolean {
  // Admin can view any client data
  if (currentUserRole === 'admin') {
    return true;
  }
  
  // Client can view their own data
  if (currentUserId === clientId) {
    return true;
  }
  
  // Coach can view their client's data
  if (currentUserRole === 'coach' && coachId && currentUserId === coachId) {
    return true;
  }
  
  return false;
}