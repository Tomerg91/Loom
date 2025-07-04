'use client';

import { NavMenu } from '@/components/navigation/nav-menu';
import { RouteGuard } from '@/components/auth/route-guard';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <RouteGuard requireAuth>
      <div className="min-h-screen bg-background">
        <NavMenu />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}