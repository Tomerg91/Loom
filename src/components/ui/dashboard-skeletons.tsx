/**
 * @fileoverview Aggregated skeleton exports for dashboard focused surfaces.
 */

import {
  Skeleton,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonTable,
  SkeletonText,
} from './skeleton';

/**
 * Responsive dashboard content skeleton used by the shell while data loads.
 */
export function DashboardContentSkeleton() {
  return (
    <div
      className="dashboard-skeleton"
      role="status"
      aria-label="Loading dashboard"
    >
      <div className="dashboard-skeleton__header">
        <SkeletonText className="h-6 w-48" />
        <SkeletonButton className="h-9 w-32" />
      </div>

      <div className="dashboard-skeleton__grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={`stat-${index}`} className="min-h-[160px]" />
        ))}
      </div>

      <div className="dashboard-skeleton__list">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={`list-${index}`} />
        ))}
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonTable,
  SkeletonText,
};
