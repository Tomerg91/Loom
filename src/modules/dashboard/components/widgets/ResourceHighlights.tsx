/**
 * @fileoverview Resource Highlights Widget - Displays top performing resources
 * with analytics for the coach dashboard.
 */

'use client';

import { Eye, TrendingUp, ExternalLink, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ResourcePerformanceSummary } from '@/types/resources';

export interface ResourceHighlightsProps {
  /** Array of resource performance data */
  resources: ResourcePerformanceSummary[];
  /** Locale for formatting */
  locale: string;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage: string;
  /** View all resources label */
  viewAllLabel: string;
}

/**
 * ResourceHighlights Component
 *
 * Displays top 5 performing resources by view count with:
 * - Resource name and category
 * - View count
 * - Visual comparison bars
 * - Click to navigate to resource details
 * - Link to full analytics page
 */
export function ResourceHighlights({
  resources,
  locale,
  isLoading = false,
  emptyMessage,
  viewAllLabel,
}: ResourceHighlightsProps) {
  const router = useRouter();

  const sortedResources = useMemo(() => {
    return [...resources]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);
  }, [resources]);

  const maxViews = useMemo(() => {
    return Math.max(...sortedResources.map(r => r.viewCount), 1);
  }, [sortedResources]);

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat(locale).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 animate-pulse rounded bg-sand-200" />
              <div className="h-4 w-12 animate-pulse rounded bg-sand-200" />
            </div>
            <div className="h-2 w-full animate-pulse rounded-full bg-sand-200" />
          </div>
        ))}
      </div>
    );
  }

  if (!sortedResources || sortedResources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <TrendingUp className="mb-3 h-10 w-10 text-sand-300" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        <Button
          variant="link"
          onClick={() => router.push('/coach/resources')}
          className="mt-2"
        >
          {viewAllLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedResources.map((resource, index) => {
        const percentage = (resource.viewCount / maxViews) * 100;

        return (
          <div
            key={resource.id}
            className="group cursor-pointer space-y-2"
            onClick={() => router.push(`/coach/resources/${resource.id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <p className="text-sm font-medium truncate group-hover:text-teal-600 transition-colors">
                    {resource.filename}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="text-xs"
                >
                  {resource.category}
                </Badge>
              </div>

              <div className="flex items-center gap-1 text-sm font-medium text-sand-700">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span>{formatNumber(resource.viewCount)}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-sand-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  index === 0 && 'bg-teal-500',
                  index === 1 && 'bg-sky-500',
                  index === 2 && 'bg-terracotta-400',
                  index > 2 && 'bg-sand-400'
                )}
                style={{ width: `${percentage}%` }}
                aria-label={`${percentage.toFixed(0)}% of top resource views`}
              />
            </div>
          </div>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push('/coach/resources/analytics')}
        className="w-full mt-4 gap-2"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        {viewAllLabel}
      </Button>
    </div>
  );
}
