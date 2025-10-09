/**
 * Top Resources List Component
 *
 * Displays top performing resources by views/downloads/completions:
 * - Resource name and category
 * - Engagement metrics
 * - Visual bars for comparison
 * - Link to resource detail
 *
 * @module components/resources/top-resources-list
 */

'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, CheckCircle2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResourceLibraryItem } from '@/types/resources';

export interface TopResourcesListProps {
  resources: ResourceLibraryItem[];
  title?: string;
  description?: string;
  metric?: 'views' | 'downloads' | 'completions';
  limit?: number;
  className?: string;
}

/**
 * TopResourcesList Component
 */
export function TopResourcesList({
  resources,
  title = 'Top Performing Resources',
  description = 'Your most engaged resources',
  metric = 'views',
  limit = 5,
  className,
}: TopResourcesListProps) {
  const router = useRouter();

  const getMetricValue = (resource: ResourceLibraryItem) => {
    switch (metric) {
      case 'downloads':
        return resource.downloadCount;
      case 'completions':
        return resource.completionCount;
      case 'views':
      default:
        return resource.viewCount;
    }
  };

  const getMetricIcon = () => {
    switch (metric) {
      case 'downloads':
        return Download;
      case 'completions':
        return CheckCircle2;
      case 'views':
      default:
        return Eye;
    }
  };

  const MetricIcon = getMetricIcon();

  // Sort and limit resources
  const sortedResources = [...resources]
    .sort((a, b) => getMetricValue(b) - getMetricValue(a))
    .slice(0, limit);

  const maxValue = Math.max(...sortedResources.map(getMetricValue), 1);

  if (sortedResources.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No analytics data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedResources.map((resource, index) => {
          const value = getMetricValue(resource);
          const percentage = (value / maxValue) * 100;

          return (
            <div
              key={resource.id}
              className="group cursor-pointer"
              onClick={() => router.push(`/coach/resources/${resource.id}`)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-muted-foreground">
                      #{index + 1}
                    </span>
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {resource.filename}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {resource.category}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 text-sm font-medium">
                  <MetricIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{value.toLocaleString()}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    index === 0 && 'bg-primary',
                    index === 1 && 'bg-blue-500',
                    index === 2 && 'bg-green-500',
                    index > 2 && 'bg-muted-foreground'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
