'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface DashboardShellProps {
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function DashboardShell({
  isLoading = false,
  children,
}: DashboardShellProps) {
  return (
    <div className="space-y-8">
      {/* Header with user info */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <h1 className="text-2xl font-bold">Dashboard</h1>
          )}
          {isLoading && <Skeleton className="h-4 w-40 mt-1" />}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div
        data-testid="quick-actions-grid"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </>
        ) : (
          children
        )}
      </div>

      {/* Client Snapshot */}
      <div data-testid="snapshot-skeleton" className="space-y-4">
        {isLoading && <Skeleton className="h-64 rounded-lg" />}
      </div>

      {/* Activity Feed */}
      <div data-testid="activity-feed" className="space-y-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
