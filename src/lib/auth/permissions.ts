// Permission system for role-based access control

export type Permission = 
  | 'sessions:read'
  | 'sessions:create'
  | 'sessions:update'
  | 'sessions:delete'
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'admin:read'
  | 'admin:write'
  | 'coach:read'
  | 'coach:write'
  | 'client:read'
  | 'client:write'
  | 'billing:read'
  | 'billing:write'
  | 'reports:read'
  | 'reports:write';

export type Role = 'admin' | 'coach' | 'client';

// Permission matrix defining what each role can do
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'sessions:read',
    'sessions:create',
    'sessions:update',
    'sessions:delete',
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'admin:read',
    'admin:write',
    'coach:read',
    'coach:write',
    'client:read',
    'client:write',
    'billing:read',
    'billing:write',
    'reports:read',
    'reports:write',
  ],
  coach: [
    'sessions:read',
    'sessions:create',
    'sessions:update',
    'users:read',
    'coach:read',
    'coach:write',
    'client:read',
    'reports:read',
  ],
  client: [
    'sessions:read',
    'sessions:create',
    'client:read',
    'client:write',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function checkPermission(role: Role, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: Role | undefined, permission: Permission): boolean {
  if (!userRole) return false;
  return checkPermission(userRole, permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role can access a resource
 */
export function canAccessResource(role: Role, resource: string, action: string): boolean {
  const permission = `${resource}:${action}` as Permission;
  return checkPermission(role, permission);
}

/**
 * Role hierarchy check - admin can access everything, coach can access client resources
 */
export function hasRoleAccess(userRole: Role, requiredRole: Role): boolean {
  if (userRole === 'admin') return true;
  if (userRole === 'coach' && requiredRole === 'client') return true;
  return userRole === requiredRole;
}

/**
 * Check if user can manage another user based on roles
 */
export function canManageUser(managerRole: Role, targetRole: Role): boolean {
  if (managerRole === 'admin') return true;
  if (managerRole === 'coach' && targetRole === 'client') return true;
  return false;
}

/**
 * Get accessible roles for a user role
 */
export function getAccessibleRoles(userRole: Role): Role[] {
  switch (userRole) {
    case 'admin':
      return ['admin', 'coach', 'client'];
    case 'coach':
      return ['client'];
    case 'client':
      return [];
    default:
      return [];
  }
}

/**
 * Permission guard for API routes
 */
export function requirePermission(userRole: Role | undefined, permission: Permission) {
  if (!hasPermission(userRole, permission)) {
    throw new Error(`Access denied. Required permission: ${permission}`);
  }
}

/**
 * Role guard for API routes
 */
export function requireRole(userRole: Role | undefined, requiredRole: Role) {
  if (!userRole || !hasRoleAccess(userRole, requiredRole)) {
    throw new Error(`Access denied. Required role: ${requiredRole}`);
  }
}

/**
 * Multiple permission check (user must have ALL permissions)
 */
export function hasAllPermissions(userRole: Role | undefined, permissions: Permission[]): boolean {
  if (!userRole) return false;
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Multiple permission check (user must have ANY of the permissions)
 */
export function hasAnyPermission(userRole: Role | undefined, permissions: Permission[]): boolean {
  if (!userRole) return false;
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Get permission level for a resource (read, write, admin)
 */
export function getPermissionLevel(role: Role, resource: string): 'none' | 'read' | 'write' | 'admin' {
  const permissions = getRolePermissions(role);
  const resourcePermissions = permissions.filter(p => p.startsWith(resource));
  
  if (resourcePermissions.includes(`${resource}:delete` as Permission)) return 'admin';
  if (resourcePermissions.includes(`${resource}:write` as Permission)) return 'write';
  if (resourcePermissions.includes(`${resource}:read` as Permission)) return 'read';
  
  return 'none';
}

/**
 * Check session ownership and permissions
 */
export function canAccessSession(
  userRole: Role,
  userId: string,
  sessionOwnerId: string,
  sessionCoachId?: string
): boolean {
  // Admin can access all sessions
  if (userRole === 'admin') return true;
  
  // Coach can access sessions they're coaching
  if (userRole === 'coach' && sessionCoachId === userId) return true;
  
  // Client can access their own sessions
  if (userRole === 'client' && sessionOwnerId === userId) return true;
  
  return false;
}