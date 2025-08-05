'use client';

import { NavMenu } from '@/components/navigation/nav-menu';
import { RouteGuard } from '@/components/auth/route-guard';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <RouteGuard requireAuth>
      <div className="min-h-screen bg-background flex flex-col">
        <NavMenu />
        <main className="flex-1 pb-safe-area-bottom">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </RouteGuard>
  );
}