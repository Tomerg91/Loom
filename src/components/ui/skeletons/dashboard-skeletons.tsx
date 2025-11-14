/**
 * @fileoverview Dashboard skeleton components for coach, client, and admin dashboards
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton, SkeletonCard } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Skeleton for dashboard stat cards
 */
export function DashboardStatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonText className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <SkeletonText className="h-8 w-20" />
          <SkeletonText className="h-3 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for coach dashboard
 */
export function CoachDashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading coach dashboard">
      {/* Welcome Header */}
      <div className="space-y-2">
        <SkeletonText className="h-8 w-64" />
        <SkeletonText className="h-5 w-96" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardStatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Agenda */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <SkeletonText className="h-6 w-32" />
              <SkeletonButton className="h-8 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <Skeleton className="h-12 w-1 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <SkeletonText className="h-4 w-32" />
                    <SkeletonText className="h-3 w-16" />
                  </div>
                  <SkeletonText className="h-3 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <SkeletonText className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <SkeletonAvatar className="h-8 w-8" />
                <div className="flex-1 space-y-1">
                  <SkeletonText className="h-4 w-full" />
                  <SkeletonText className="h-3 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Clients Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <SkeletonText className="h-6 w-32" />
            <SkeletonButton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                <SkeletonAvatar className="h-12 w-12" />
                <div className="flex-1 space-y-2">
                  <SkeletonText className="h-4 w-40" />
                  <SkeletonText className="h-3 w-56" />
                </div>
                <div className="flex gap-2">
                  <SkeletonButton className="h-8 w-20" />
                  <SkeletonButton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton for client dashboard
 */
export function ClientDashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading client dashboard">
      {/* Welcome Header */}
      <div className="space-y-2">
        <SkeletonText className="h-8 w-64" />
        <SkeletonText className="h-5 w-96" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardStatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <SkeletonText className="h-6 w-40" />
              <SkeletonButton className="h-8 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <SkeletonAvatar className="h-12 w-12" />
                <div className="flex-1 space-y-2">
                  <SkeletonText className="h-4 w-32" />
                  <SkeletonText className="h-3 w-48" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <SkeletonText className="h-6 w-36" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-32 w-full rounded" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="text-center space-y-1">
                  <SkeletonText className="h-6 w-12 mx-auto" />
                  <SkeletonText className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reflections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <SkeletonText className="h-6 w-40" />
            <SkeletonButton className="h-8 w-28" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <SkeletonText className="h-4 w-32" />
                <SkeletonText className="h-3 w-24" />
              </div>
              <SkeletonText className="h-4 w-full" />
              <SkeletonText className="h-4 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton for admin dashboard
 */
export function AdminDashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading admin dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonText className="h-8 w-48" />
        <div className="flex gap-2">
          <SkeletonButton className="h-9 w-32" />
          <SkeletonButton className="h-9 w-32" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <DashboardStatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <SkeletonText className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SkeletonText className="h-6 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <SkeletonText className="h-6 w-32" />
            <SkeletonButton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-4 pb-3 border-b">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonText key={i} className="h-4 w-20" />
              ))}
            </div>
            {/* Table Rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-4 items-center">
                <div className="flex items-center gap-2">
                  <SkeletonAvatar className="h-8 w-8" />
                  <SkeletonText className="h-4 w-24" />
                </div>
                <SkeletonText className="h-4 w-32" />
                <SkeletonText className="h-4 w-20" />
                <SkeletonText className="h-4 w-16" />
                <SkeletonButton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Generic dashboard content skeleton
 */
export function DashboardContentSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading dashboard">
      <div className="flex items-center justify-between">
        <SkeletonText className="h-8 w-48" />
        <SkeletonButton className="h-9 w-32" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="min-h-[160px]" />
        ))}
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
