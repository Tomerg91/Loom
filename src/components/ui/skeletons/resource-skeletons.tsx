/**
 * @fileoverview Resource library and task skeleton components
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Skeleton for resource card in grid view
 */
export function ResourceCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded" />
          <div className="space-y-2">
            <SkeletonText className="h-5 w-3/4" />
            <SkeletonText className="h-3 w-full" />
            <SkeletonText className="h-3 w-2/3" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <SkeletonAvatar className="h-6 w-6" />
              <SkeletonText className="h-3 w-20" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for resource list item
 */
export function ResourceListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-4 p-4 border rounded-lg', className)}>
      <Skeleton className="h-16 w-16 rounded flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <SkeletonText className="h-5 w-64" />
            <SkeletonText className="h-3 w-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonButton className="h-8 w-8" />
            <SkeletonButton className="h-8 w-8" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <SkeletonAvatar className="h-5 w-5" />
            <SkeletonText className="h-3 w-24" />
          </div>
          <SkeletonText className="h-3 w-20" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for resource library page
 */
export function ResourceLibrarySkeleton({ view = 'grid', className }: { view?: 'grid' | 'list'; className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading resource library">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <SkeletonText className="h-7 w-48" />
          <SkeletonText className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <SkeletonButton className="h-9 w-28" />
          <SkeletonButton className="h-9 w-32" />
        </div>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-10 flex-1 min-w-[200px] rounded" />
            <SkeletonButton className="h-10 w-32" />
            <SkeletonButton className="h-10 w-24" />
            <SkeletonButton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <ResourceListItemSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <SkeletonButton className="h-9 w-20" />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonButton key={i} className="h-9 w-9" />
        ))}
        <SkeletonButton className="h-9 w-20" />
      </div>
    </div>
  );
}

/**
 * Skeleton for resource collection
 */
export function ResourceCollectionSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <SkeletonText className="h-6 w-48" />
            <SkeletonText className="h-4 w-64" />
          </div>
          <SkeletonButton className="h-8 w-8" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded" />
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <SkeletonAvatar className="h-6 w-6" />
            <SkeletonText className="h-3 w-24" />
          </div>
          <SkeletonText className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for task card
 */
export function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="flex-1 space-y-2">
                <SkeletonText className="h-4 w-full" />
                <SkeletonText className="h-3 w-3/4" />
              </div>
            </div>
            <SkeletonButton className="h-8 w-8" />
          </div>
          <div className="flex items-center gap-3 pl-8">
            <SkeletonAvatar className="h-6 w-6" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <SkeletonText className="h-3 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for task list
 */
export function TaskListSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading tasks">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for task board view (Kanban)
 */
export function TaskBoardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading task board">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonText className="h-7 w-40" />
        <div className="flex gap-2">
          <SkeletonButton className="h-9 w-28" />
          <SkeletonButton className="h-9 w-32" />
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {['To Do', 'In Progress', 'Review', 'Done'].map((column, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <SkeletonText className="h-5 w-24" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: i + 2 }).map((_, j) => (
                <TaskCardSkeleton key={j} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for resource analytics dashboard
 */
export function ResourceAnalyticsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading analytics">
      <div className="flex items-center justify-between">
        <SkeletonText className="h-7 w-48" />
        <div className="flex gap-2">
          <SkeletonButton className="h-9 w-24" />
          <SkeletonButton className="h-9 w-28" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <SkeletonText className="h-4 w-24" />
                <SkeletonText className="h-8 w-20" />
                <SkeletonText className="h-3 w-32" />
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

      {/* Top Resources Table */}
      <Card>
        <CardHeader>
          <SkeletonText className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-1">
                  <SkeletonText className="h-4 w-48" />
                  <SkeletonText className="h-3 w-32" />
                </div>
                <SkeletonText className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
