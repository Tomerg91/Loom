/**
 * @fileoverview Helpers for resolving locale-aware redirect destinations that
 * respect user roles and keep middleware logic declarative.
 */

import { resolveAuthPath, resolveRedirect } from '@/lib/utils/redirect';
import {
  DEFAULT_DASHBOARD_ROUTE,
  DEFAULT_LOGIN_ROUTE,
  ROLE_HOME_PATH,
  ROLE_ROUTE_GUARDS,
} from '@/modules/auth/constants';
import type { UserRole } from '@/types';

function normalisePath(path: string): string {
  if (!path) return '/';
  if (!path.startsWith('/')) return `/${path}`;
  if (path.length === 1) return path;
  return path.replace(/\/+$/, '') || '/';
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'coach' || value === 'client';
}

/** Returns the un-prefixed dashboard landing path for the supplied role. */
export function getRoleHomePath(role: UserRole | null | undefined): string {
  if (role && isUserRole(role)) {
    return ROLE_HOME_PATH[role];
  }
  return DEFAULT_DASHBOARD_ROUTE;
}

/**
 * Resolve the locale-aware landing page for a given role. Falls back to the
 * shared dashboard route when the role is unknown.
 */
export function resolveRoleLanding(
  locale: string,
  role: UserRole | null | undefined
): string {
  return resolveRedirect(locale, getRoleHomePath(role));
}

/**
 * Resolve the sign-in URL for unauthenticated visitors while persisting the
 * destination they attempted to load.
 */
export function resolveLoginRedirect(
  locale: string,
  attemptedPath: string
): string {
  const loginPath = resolveAuthPath(locale, DEFAULT_LOGIN_ROUTE);
  const safeAttempted = resolveRedirect(
    locale,
    attemptedPath || DEFAULT_DASHBOARD_ROUTE
  );
  const url = new URL(loginPath, 'http://middleware.internal');
  url.searchParams.set('redirectTo', safeAttempted);
  return `${url.pathname}${url.search}`;
}

/**
 * Determines whether the requested path is permitted for the supplied role.
 * Paths that are not explicitly guarded default to allow to keep middleware
 * permissive during phased rollouts.
 */
export function isRouteAllowedForRole(
  pathWithoutLocale: string,
  role: UserRole | null | undefined
): boolean {
  if (!role || !isUserRole(role)) {
    return true;
  }

  const normalisedPath = normalisePath(pathWithoutLocale);
  return ROLE_ROUTE_GUARDS.every(({ prefix, allowed }) => {
    const normalisedPrefix = normalisePath(prefix);
    if (
      normalisedPath === normalisedPrefix ||
      normalisedPath.startsWith(`${normalisedPrefix}/`)
    ) {
      return allowed.includes(role);
    }
    return true;
  });
}
