// Export all permission utilities
export * from './permissions';
export * from './hooks';

// Export specific commonly used items
export { PERMISSIONS } from './permissions';
export { 
  usePermission,
  useHasRole,
  useIsAdmin,
  useIsCoach,
  useIsClient,
  useCanCreateSessions,
  useCanManageUsers
} from './hooks';