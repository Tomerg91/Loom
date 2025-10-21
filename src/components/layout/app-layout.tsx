'use client';

import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

import { RouteGuard } from '@/components/auth/route-guard';
import { NavMenu } from '@/components/navigation/nav-menu';
import { Card, CardContent } from '@/components/ui/card';

interface AppLayoutProps {
  children: React.ReactNode;
  skeleton?: boolean; // Allow opt-in skeleton loading
}

// Layout skeleton to prevent CLS while auth loads
function LayoutSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-16 bg-card border-b flex items-center px-4 skeleton-loading">
        <div className="h-8 w-32 bg-muted rounded skeleton-loading" />
      </div>
      <main className="flex-1 pb-safe-area-bottom">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-3" />
                <span className="text-lg">Loading...</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <RouteGuard requireAuth>
      <div className="min-h-screen bg-background flex flex-col">
        <Suspense fallback={<div className="h-16 bg-card border-b skeleton-loading" />}>
          <NavMenu />
        </Suspense>
        <main className="flex-1 pb-safe-area-bottom">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Suspense fallback={<LayoutSkeleton />}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </RouteGuard>
  );
}