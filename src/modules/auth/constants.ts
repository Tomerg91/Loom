/**
 * @fileoverview Central constants describing auth-specific route patterns and
 * role behaviour used by middleware and shared utilities. Keeping these values
 * in a single module avoids duplicating literal strings across the codebase and
 * makes behavioural tests easier to maintain.
 */

import type { UserRole } from '@/types';

/** Name of the cookie set while a user is completing multi-factor auth. */
export const MFA_PENDING_COOKIE = 'mfa_pending';

/** Name of the cookie used to persist trusted-device verification state. */
export const MFA_TRUSTED_DEVICE_COOKIE = 'mfa_trusted_device';

/** Route segment used for the MFA verification page. */
export const MFA_VERIFY_ROUTE = '/auth/mfa-verify';

/** Route segment used for the MFA setup flow. */
export const MFA_SETUP_ROUTE = '/auth/mfa-setup';

/** Routes that should never require authentication. */
export const PUBLIC_ROUTES: readonly string[] = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/callback',
  MFA_VERIFY_ROUTE,
  MFA_SETUP_ROUTE,
  '/terms',
  '/privacy',
  '/files',
  '/messages',
];

/**
 * Routes that are specifically part of the authentication flow. We use this to
 * prevent authenticated users from visiting sign-in/up pages again.
 */
export const AUTH_ROUTES: readonly string[] = [
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/callback',
  MFA_VERIFY_ROUTE,
  MFA_SETUP_ROUTE,
];

/** High-level application areas that require an authenticated session. */
export const PROTECTED_ROUTES: readonly string[] = [
  '/dashboard',
  '/sessions',
  '/settings',
  '/coach',
  '/client',
  '/admin',
  '/onboarding',
];

/** Default landing page for each role once authenticated. */
export const ROLE_HOME_PATH: Record<UserRole, string> = {
  admin: '/admin',
  coach: '/coach',
  client: '/client',
};

/**
 * Guarded route prefixes and the roles that are allowed to access them. Admins
 * are granted access to every section that coaches or clients can view.
 */
export const ROLE_ROUTE_GUARDS: readonly {
  prefix: string;
  allowed: readonly UserRole[];
}[] = [
  { prefix: '/admin', allowed: ['admin'] },
  { prefix: '/coach', allowed: ['coach', 'admin'] },
  { prefix: '/client', allowed: ['client', 'admin'] },
];

/** Fallback redirect when we cannot determine a role-specific landing page. */
export const DEFAULT_DASHBOARD_ROUTE = '/dashboard';

/** Default path to send unauthenticated users to start the login journey. */
export const DEFAULT_LOGIN_ROUTE = '/auth/signin';
