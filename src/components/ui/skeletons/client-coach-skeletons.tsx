/**
 * @fileoverview Client and Coach specific page skeleton components
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Skeleton for client card in coach's clients list
 */
export function ClientCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <SkeletonAvatar className="h-16 w-16" />
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <SkeletonText className="h-5 w-40" />
              <SkeletonText className="h-4 w-56" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <SkeletonText className="h-3 w-20" />
                <SkeletonText className="h-5 w-12" />
              </div>
              <div className="space-y-1">
                <SkeletonText className="h-3 w-24" />
                <SkeletonText className="h-5 w-16" />
              </div>
              <div className="space-y-1">
                <SkeletonText className="h-3 w-16" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <SkeletonButton className="h-9 w-24" />
            <SkeletonButton className="h-9 w-9" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for coach clients page
 */
export function CoachClientsPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading clients">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <SkeletonText className="h-8 w-48" />
          <SkeletonText className="h-4 w-64" />
        </div>
        <SkeletonButton className="h-10 w-32" />
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-10 flex-1 min-w-[200px] rounded" />
            <SkeletonButton className="h-10 w-28" />
            <SkeletonButton className="h-10 w-24" />
            <SkeletonButton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Client Cards */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ClientCardSkeleton key={i} />
        ))}
      </div>

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
 * Skeleton for client detail page (coach view)
 */
export function ClientDetailPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading client details">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <SkeletonAvatar className="h-24 w-24" />
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <SkeletonText className="h-7 w-48" />
                <SkeletonText className="h-4 w-64" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <SkeletonText className="h-3 w-20" />
                    <SkeletonText className="h-5 w-16" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <SkeletonButton className="h-9 w-28" />
              <SkeletonButton className="h-9 w-28" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {['Overview', 'Sessions', 'Notes', 'Progress', 'Files'].map((_, i) => (
          <SkeletonButton key={i} className="h-10 w-24" />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <SkeletonText className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <SkeletonText className="h-4 w-32" />
                  <SkeletonText className="h-3 w-20" />
                </div>
                <SkeletonText className="h-3 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SkeletonText className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton for coach card (client view)
 */
export function CoachCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <SkeletonAvatar className="h-20 w-20" />
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <SkeletonText className="h-5 w-40" />
              <SkeletonText className="h-4 w-full" />
              <SkeletonText className="h-4 w-3/4" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-4 rounded-full" />
                <SkeletonText className="h-4 w-12" />
              </div>
              <SkeletonText className="h-4 w-32" />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-20 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <SkeletonButton className="h-9 w-32" />
            <SkeletonButton className="h-9 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for client coaches page
 */
export function ClientCoachesPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading coaches">
      <div className="space-y-2">
        <SkeletonText className="h-8 w-40" />
        <SkeletonText className="h-4 w-64" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CoachCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for reflections/journal page
 */
export function ReflectionsPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading reflections">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonText className="h-8 w-48" />
        <SkeletonButton className="h-10 w-40" />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['All', 'This Week', 'This Month', 'Favorites'].map((_, i) => (
          <SkeletonButton key={i} className="h-9 w-24" />
        ))}
      </div>

      {/* Reflections List */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <SkeletonText className="h-5 w-48" />
                    <SkeletonText className="h-3 w-32" />
                  </div>
                  <div className="flex gap-2">
                    <SkeletonButton className="h-8 w-8" />
                    <SkeletonButton className="h-8 w-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <SkeletonText className="h-4 w-full" />
                  <SkeletonText className="h-4 w-full" />
                  <SkeletonText className="h-4 w-2/3" />
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Skeleton key={j} className="h-6 w-16 rounded-full" />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for progress/analytics page
 */
export function ProgressPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading progress">
      <div className="flex items-center justify-between">
        <SkeletonText className="h-8 w-48" />
        <SkeletonButton className="h-9 w-32" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <SkeletonText className="h-4 w-24" />
                <SkeletonText className="h-7 w-16" />
                <Skeleton className="h-2 w-full rounded-full" />
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

      {/* Goals/Milestones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <SkeletonText className="h-6 w-32" />
            <SkeletonButton className="h-8 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-2">
                  <SkeletonText className="h-4 w-64" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-2 flex-1 rounded-full" />
                    <SkeletonText className="h-3 w-12" />
                  </div>
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
 * Skeleton for notes management page
 */
export function NotesPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading notes">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonText className="h-8 w-32" />
        <SkeletonButton className="h-10 w-32" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1 rounded" />
            <SkeletonButton className="h-10 w-32" />
            <SkeletonButton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <SkeletonAvatar className="h-8 w-8" />
                    <SkeletonText className="h-4 w-32" />
                    <SkeletonText className="h-3 w-24" />
                  </div>
                  <div className="space-y-1">
                    <SkeletonText className="h-4 w-full" />
                    <SkeletonText className="h-4 w-3/4" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <SkeletonButton className="h-8 w-8" />
                  <SkeletonButton className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for availability manager (coach)
 */
export function AvailabilityManagerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading availability">
      <div className="flex items-center justify-between">
        <SkeletonText className="h-8 w-48" />
        <SkeletonButton className="h-10 w-36" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Calendar View */}
        <Card>
          <CardHeader>
            <SkeletonText className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="p-2 text-center text-sm font-medium">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader>
            <SkeletonText className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded">
                  <SkeletonText className="h-4 w-24" />
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
