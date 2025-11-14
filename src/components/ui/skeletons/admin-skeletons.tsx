/**
 * @fileoverview Admin-specific skeleton components
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton, SkeletonTable } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Skeleton for admin users table
 */
export function AdminUsersTableSkeleton({ count = 10, className }: { count?: number; className?: string }) {
  return (
    <Card className={cn('w-full', className)} role="status" aria-label="Loading users">
      <CardHeader>
        <div className="flex items-center justify-between">
          <SkeletonText className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-64 rounded" />
            <SkeletonButton className="h-10 w-28" />
            <SkeletonButton className="h-10 w-10" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 pb-3 border-b font-medium">
            <SkeletonText className="h-4 w-20" />
            <SkeletonText className="h-4 w-16" />
            <SkeletonText className="h-4 w-24" />
            <SkeletonText className="h-4 w-20" />
            <SkeletonText className="h-4 w-24" />
            <SkeletonText className="h-4 w-20" />
          </div>
          {/* Table Rows */}
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 items-center py-3 border-b last:border-b-0">
              <div className="flex items-center gap-2">
                <SkeletonAvatar className="h-8 w-8" />
                <SkeletonText className="h-4 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <SkeletonText className="h-4 w-32" />
              <SkeletonText className="h-4 w-20" />
              <SkeletonText className="h-4 w-24" />
              <div className="flex gap-2">
                <SkeletonButton className="h-8 w-8" />
                <SkeletonButton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <SkeletonText className="h-4 w-40" />
          <div className="flex gap-2">
            <SkeletonButton className="h-9 w-20" />
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonButton key={i} className="h-9 w-9" />
            ))}
            <SkeletonButton className="h-9 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for admin analytics page
 */
export function AdminAnalyticsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading analytics">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonText className="h-8 w-48" />
        <div className="flex gap-2">
          <SkeletonButton className="h-9 w-32" />
          <SkeletonButton className="h-9 w-28" />
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-2">
        {['7d', '30d', '90d', '1y', 'Custom'].map((_, i) => (
          <SkeletonButton key={i} className="h-9 w-16" />
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <SkeletonText className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
                <SkeletonText className="h-8 w-20" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <SkeletonText className="h-3 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <SkeletonText className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SkeletonText className="h-6 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Full Width Chart */}
      <Card>
        <CardHeader>
          <SkeletonText className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full rounded" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton for admin audit log
 */
export function AdminAuditLogSkeleton({ count = 20, className }: { count?: number; className?: string }) {
  return (
    <Card className={cn('w-full', className)} role="status" aria-label="Loading audit log">
      <CardHeader>
        <div className="flex items-center justify-between">
          <SkeletonText className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-64 rounded" />
            <SkeletonButton className="h-10 w-24" />
            <SkeletonButton className="h-10 w-28" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-3 border rounded-lg hover:bg-muted/50">
              <Skeleton className="h-10 w-10 rounded flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SkeletonText className="h-4 w-64" />
                    <SkeletonText className="h-3 w-48" />
                  </div>
                  <SkeletonText className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-3">
                  <SkeletonAvatar className="h-5 w-5" />
                  <SkeletonText className="h-3 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for admin sessions management
 */
export function AdminSessionsTableSkeleton({ count = 15, className }: { count?: number; className?: string }) {
  return (
    <Card className={cn('w-full', className)} role="status" aria-label="Loading sessions">
      <CardHeader>
        <div className="flex items-center justify-between">
          <SkeletonText className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-64 rounded" />
            <SkeletonButton className="h-10 w-24" />
            <SkeletonButton className="h-10 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2 pb-3 border-b">
            {['All', 'Scheduled', 'Completed', 'Cancelled'].map((_, i) => (
              <SkeletonButton key={i} className="h-8 w-24" />
            ))}
          </div>

          {/* Table */}
          <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <SkeletonAvatar className="h-10 w-10" />
                  <div className="space-y-1">
                    <SkeletonText className="h-4 w-48" />
                    <SkeletonText className="h-3 w-64" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <SkeletonText className="h-4 w-32" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <div className="flex gap-2">
                    <SkeletonButton className="h-8 w-8" />
                    <SkeletonButton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for admin system health
 */
export function AdminSystemHealthSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading system health">
      <SkeletonText className="h-8 w-40" />

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {['Database', 'API', 'Storage', 'Email'].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SkeletonText className="h-5 w-24" />
                  <Skeleton className="h-3 w-3 rounded-full" />
                </div>
                <SkeletonText className="h-7 w-16" />
                <SkeletonText className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Metrics */}
      <Card>
        <CardHeader>
          <SkeletonText className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <SkeletonText className="h-4 w-32" />
                  <SkeletonText className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <SkeletonText className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <SkeletonText className="h-4 w-64" />
                  <SkeletonText className="h-3 w-24" />
                </div>
                <SkeletonText className="h-3 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton for admin moderation panel
 */
export function AdminModerationPanelSkeleton({ count = 10, className }: { count?: number; className?: string }) {
  return (
    <Card className={cn('w-full', className)} role="status" aria-label="Loading moderation queue">
      <CardHeader>
        <div className="flex items-center justify-between">
          <SkeletonText className="h-6 w-48" />
          <div className="flex gap-2">
            {['All', 'Pending', 'Approved', 'Rejected'].map((_, i) => (
              <SkeletonButton key={i} className="h-8 w-20" />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <SkeletonAvatar className="h-10 w-10" />
                  <div className="space-y-1">
                    <SkeletonText className="h-4 w-32" />
                    <SkeletonText className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-2 p-3 bg-muted/50 rounded">
                <SkeletonText className="h-4 w-full" />
                <SkeletonText className="h-4 w-3/4" />
              </div>
              <div className="flex gap-2">
                <SkeletonButton className="h-9 w-24" />
                <SkeletonButton className="h-9 w-24" />
                <SkeletonButton className="h-9 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
