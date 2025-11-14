/**
 * @fileoverview Comprehensive skeleton loading states for dashboard components.
 * Provides visual feedback while data is being fetched from APIs.
 */

'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for dashboard summary cards
 */
export function SummaryCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`summary-card-skeleton-${index}`}
          className="overflow-hidden rounded-lg border border-sand-200 bg-white"
        >
          <div className="flex flex-row items-start justify-between gap-3 p-6">
            <div className="space-y-3 flex-1">
              <Skeleton className="h-4 w-24 bg-sand-200" />
              <Skeleton className="h-3 w-32 bg-sand-100" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full bg-sand-200" />
          </div>
          <div className="px-6 pb-6">
            <Skeleton className="h-9 w-16 bg-sand-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for widget card
 */
export function WidgetCardSkeleton({
  title = true,
  description = true,
  items = 3,
}: {
  title?: boolean;
  description?: boolean;
  items?: number;
}) {
  return (
    <div className="rounded-lg border border-sand-200 bg-white">
      <div className="p-6 border-b border-sand-100">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            {title && <Skeleton className="h-5 w-40 bg-sand-200" />}
            {description && <Skeleton className="h-4 w-56 bg-sand-100" />}
          </div>
          <Skeleton className="h-8 w-20 bg-sand-100" />
        </div>
      </div>
      <div className="p-6 space-y-3">
        {Array.from({ length: items }).map((_, index) => (
          <div
            key={`widget-item-skeleton-${index}`}
            className="rounded-xl border border-sand-200 bg-white/60 p-4 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-5 w-32 bg-sand-200" />
                <Skeleton className="h-6 w-16 rounded-full bg-sand-100" />
              </div>
              <Skeleton className="h-4 w-48 bg-sand-100" />
              <Skeleton className="h-4 w-40 bg-sand-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Complete dashboard skeleton for Coach Overview
 */
export function CoachDashboardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading coach dashboard">
      {/* Header Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 bg-sand-200" />
          <Skeleton className="h-5 w-96 bg-sand-100" />
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-7 w-32 rounded-full bg-sand-100" />
          <Skeleton className="h-10 w-36 rounded-md bg-sand-200" />
          <Skeleton className="h-10 w-24 rounded-md bg-sand-100" />
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCardsSkeleton count={4} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WidgetCardSkeleton items={3} />
        </div>
        <WidgetCardSkeleton items={3} />
      </div>

      {/* Secondary Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WidgetCardSkeleton items={4} />
        <WidgetCardSkeleton items={5} />
      </div>
    </div>
  );
}

/**
 * Complete dashboard skeleton for Client Overview
 */
export function ClientDashboardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading client dashboard">
      {/* Header Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 bg-sand-200" />
          <Skeleton className="h-5 w-96 bg-sand-100" />
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-7 w-32 rounded-full bg-sand-100" />
          <Skeleton className="h-10 w-24 rounded-md bg-sand-100" />
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCardsSkeleton count={4} />

      {/* Main Content Grid */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WidgetCardSkeleton items={3} />
        </div>
        <WidgetCardSkeleton items={3} />
      </div>

      {/* Goals Section */}
      <div className="rounded-lg border border-sand-200 bg-white">
        <div className="p-6 border-b border-sand-100">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 bg-sand-200" />
            <Skeleton className="h-4 w-48 bg-sand-100" />
          </div>
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`goal-skeleton-${index}`}
              className="space-y-3 rounded-xl border border-sand-200 bg-white/60 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-5 w-40 bg-sand-200" />
                <Skeleton className="h-6 w-16 rounded-full bg-sand-100" />
              </div>
              <Skeleton className="h-3 w-full rounded-full bg-sand-100" />
              <Skeleton className="h-4 w-20 bg-sand-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
