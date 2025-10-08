import { redirect } from 'next/navigation';
import { requireAuth, requireRole, requireAnyRole } from './auth';
import type { UserRole } from '@/types';

/**
 * Page-level auth guard for server components.
 * Redirects to sign-in if user is not authenticated.
 *
 * @param redirectTo - Optional path to redirect to after sign-in
 * @returns The authenticated user
 *
 * @example
 * export default async function DashboardPage() {
 *   const user = await withAuthGuard('/dashboard');
 *   return <Dashboard user={user} />;
 * }
 */
export async function withAuthGuard(redirectTo?: string) {
  try {
    const user = await requireAuth();
    return user;
  } catch (_error) {
    // Extract locale from current path if available, default to 'en'
    const locale = redirectTo?.split('/')[1] || 'en';
    const signInPath = `/${locale}/auth/signin`;
    const redirectUrl = redirectTo ? `${signInPath}?redirectTo=${encodeURIComponent(redirectTo)}` : signInPath;
    redirect(redirectUrl);
  }
}

/**
 * Page-level role guard for server components.
 * Redirects to unauthorized page if user doesn't have required role.
 *
 * @param role - Required user role
 * @param redirectTo - Optional path for the current page
 * @returns The authenticated user with required role
 *
 * @example
 * export default async function AdminPage() {
 *   const user = await withRoleGuard('admin', '/admin');
 *   return <AdminDashboard user={user} />;
 * }
 */
export async function withRoleGuard(role: UserRole, redirectTo?: string) {
  try {
    const user = await requireRole(role);
    return user;
  } catch (_error) {
    // First check if user is authenticated
    try {
      await requireAuth();
      // User is authenticated but doesn't have required role
      const locale = redirectTo?.split('/')[1] || 'en';
      redirect(`/${locale}/unauthorized`);
    } catch {
      // User is not authenticated
      const locale = redirectTo?.split('/')[1] || 'en';
      const signInPath = `/${locale}/auth/signin`;
      const redirectUrl = redirectTo ? `${signInPath}?redirectTo=${encodeURIComponent(redirectTo)}` : signInPath;
      redirect(redirectUrl);
    }
  }
}

/**
 * Page-level multi-role guard for server components.
 * Redirects to unauthorized page if user doesn't have any of the required roles.
 *
 * @param roles - Array of acceptable user roles
 * @param redirectTo - Optional path for the current page
 * @returns The authenticated user with one of the required roles
 *
 * @example
 * export default async function CoachingPage() {
 *   const user = await withAnyRoleGuard(['coach', 'admin'], '/coaching');
 *   return <CoachingDashboard user={user} />;
 * }
 */
export async function withAnyRoleGuard(roles: UserRole[], redirectTo?: string) {
  try {
    const user = await requireAnyRole(roles);
    return user;
  } catch (_error) {
    // First check if user is authenticated
    try {
      await requireAuth();
      // User is authenticated but doesn't have required role
      const locale = redirectTo?.split('/')[1] || 'en';
      redirect(`/${locale}/unauthorized`);
    } catch {
      // User is not authenticated
      const locale = redirectTo?.split('/')[1] || 'en';
      const signInPath = `/${locale}/auth/signin`;
      const redirectUrl = redirectTo ? `${signInPath}?redirectTo=${encodeURIComponent(redirectTo)}` : signInPath;
      redirect(redirectUrl);
    }
  }
}
