/**
 * @fileoverview High-level dashboard shell that composes the sidebar, topbar,
 * and content region with responsive behavior.
 */

'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

import type {
  DashboardNavigationConfig,
  NavigationRole,
} from '@/components/layout/navigation-types';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { DashboardContentSkeleton } from '@/components/ui/dashboard-skeletons';
import { usePathname } from '@/i18n/routing';
import { useUser } from '@/lib/auth/use-user';
import { cn } from '@/lib/utils';

export interface DashboardShellProps {
  locale: string;
  navigation: DashboardNavigationConfig;
  children: ReactNode;
  /** Optional content to render in the topbar actions row. */
  actionsSlot?: ReactNode;
  /** When true the provided skeleton (or default) will render instead of content. */
  isLoading?: boolean;
  /** Custom skeleton element for long running dashboard loaders. */
  skeleton?: ReactNode;
  /**
   * Footer region rendered at the bottom of the sidebar. Useful for injecting
   * support links or environment banners.
   */
  sidebarFooter?: ReactNode;
  /** Additional classes forwarded to the scrollable content region. */
  contentClassName?: string;
}

export function DashboardShell({
  locale,
  navigation,
  children,
  actionsSlot,
  isLoading = false,
  skeleton,
  sidebarFooter,
  contentClassName,
}: DashboardShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const user = useUser();

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  const userSummary = useMemo(() => {
    if (!user) {
      return null;
    }

    const displayName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : (user.firstName ?? user.email);

    return {
      name: displayName,
      email: user.email,
      role: (user.role ?? 'all') as NavigationRole,
    };
  }, [user]);

  return (
    <div
      className="dashboard-shell"
      data-state={isMobileNavOpen ? 'mobile-open' : 'default'}
    >
      <Sidebar
        locale={locale}
        navigation={navigation}
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
        footer={sidebarFooter}
        userSummary={userSummary}
      />

      <div className="dashboard-shell__content-area">
        <Topbar
          onToggleMobileNav={() => setIsMobileNavOpen(open => !open)}
          actionsSlot={actionsSlot}
        />

        <div
          className={cn('dashboard-shell__scroll-region', contentClassName)}
          role="region"
          aria-live="polite"
        >
          {isLoading ? (skeleton ?? <DashboardContentSkeleton />) : children}
        </div>
      </div>
    </div>
  );
}
