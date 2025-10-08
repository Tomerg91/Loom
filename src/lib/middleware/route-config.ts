export const PROTECTED_ROUTES = [
  '/dashboard',
  '/sessions',
  '/profile',
  '/settings',
  '/coach',
  '/client',
  '/admin',
] as const;

export const PUBLIC_ROUTES = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/callback',
  '/auth/mfa-verify',
  '/auth/mfa-setup',
] as const;

export const AUTH_ROUTE_PREFIX = '/auth/';
export const MFA_VERIFY_ROUTE = '/auth/mfa-verify';

export const AUTH_GATING_ENABLED = process.env.MIDDLEWARE_AUTH_ENABLED !== 'false';

export type RoutePath = typeof PROTECTED_ROUTES[number] | typeof PUBLIC_ROUTES[number];
