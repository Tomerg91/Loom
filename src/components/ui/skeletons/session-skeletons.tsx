/**
 * @fileoverview Session-related skeleton components for loading states
 */

import { Calendar, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Skeleton for session card in list view
 */
export function SessionCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <SkeletonAvatar className="h-12 w-12" />
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <SkeletonText className="h-5 w-48" />
                <SkeletonText className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <SkeletonText className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <SkeletonText className="h-3 w-32" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <SkeletonButton className="h-9 w-20" />
            <SkeletonButton className="h-9 w-9" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for session list view
 */
export function SessionListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-4', className)} role="status" aria-label="Loading sessions">
      {Array.from({ length: count }).map((_, i) => (
        <SessionCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for session calendar view
 */
export function SessionCalendarSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)} role="status" aria-label="Loading calendar">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <SkeletonText className="h-6 w-32" />
          </div>
          <div className="flex gap-2">
            <SkeletonButton className="w-16 h-8" />
            <SkeletonButton className="w-16 h-8" />
            <SkeletonButton className="w-16 h-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Calendar Header - Days of Week */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          {/* Calendar Grid - 6 weeks */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded border" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for session details page
 */
export function SessionDetailsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading session details">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <SkeletonText className="h-7 w-64" />
              <SkeletonText className="h-4 w-48" />
            </div>
            <div className="flex gap-2">
              <SkeletonButton className="h-9 w-24" />
              <SkeletonButton className="h-9 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonText className="h-3 w-20" />
                <SkeletonText className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Participant Info */}
      <Card>
        <CardHeader>
          <CardTitle>
            <SkeletonText className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <SkeletonAvatar className="h-16 w-16" />
            <div className="space-y-2 flex-1">
              <SkeletonText className="h-5 w-40" />
              <SkeletonText className="h-4 w-56" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            <SkeletonText className="h-5 w-24" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-32 w-full rounded" />
          <SkeletonButton className="h-9 w-32" />
        </CardContent>
      </Card>

      {/* Files Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            <SkeletonText className="h-5 w-20" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton for session booking/create form
 */
export function SessionFormSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)} role="status" aria-label="Loading form">
      <CardHeader>
        <SkeletonText className="h-6 w-40" />
        <SkeletonText className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form fields */}
        {[
          { label: 'Client', width: 'w-24' },
          { label: 'Date', width: 'w-16' },
          { label: 'Time', width: 'w-16' },
          { label: 'Duration', width: 'w-24' },
          { label: 'Type', width: 'w-20' },
          { label: 'Notes', width: 'w-20' },
        ].map((field, i) => (
          <div key={i} className="space-y-2">
            <SkeletonText className={cn('h-4', field.width)} />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        ))}

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          <SkeletonButton className="h-10 w-24" />
          <SkeletonButton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for session timeline view
 */
export function SessionTimelineSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading timeline">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="h-3 w-3 rounded-full" />
            {i < count - 1 && <Skeleton className="h-16 w-0.5 my-2" />}
          </div>
          <div className="flex-1 pb-6">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <SkeletonText className="h-5 w-40" />
                    <SkeletonText className="h-4 w-24" />
                  </div>
                  <SkeletonText className="h-4 w-full" />
                  <SkeletonText className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for session file manager
 */
export function SessionFileManagerSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full', className)} role="status" aria-label="Loading files">
      <CardHeader>
        <div className="flex items-center justify-between">
          <SkeletonText className="h-6 w-32" />
          <SkeletonButton className="h-9 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-32 w-full rounded" />
              <SkeletonText className="h-4 w-full" />
              <SkeletonText className="h-3 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
