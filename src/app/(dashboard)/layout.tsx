/**
 * Dashboard Layout
 *
 * Layout for all authenticated dashboard pages.
 * Forces dynamic rendering to ensure auth and React Query work properly.
 *
 * @module app/(dashboard)/layout
 */

// Force dynamic rendering for all dashboard pages to ensure:
// 1. Auth checks work properly
// 2. React Query has access to QueryClientProvider
// 3. No SSR/hydration issues with client-only features
export const dynamic = 'force-dynamic';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return children;
}
