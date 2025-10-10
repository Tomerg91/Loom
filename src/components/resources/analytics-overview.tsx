/**
 * Analytics Overview Component
 *
 * Displays high-level analytics for the resource library:
 * - Total resources
 * - Total views
 * - Total downloads
 * - Total completions
 * - Engagement rate
 *
 * @module components/resources/analytics-overview
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Eye, Download, CheckCircle2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LibraryAnalytics } from '@/types/resources';

export interface AnalyticsOverviewProps {
  analytics: LibraryAnalytics;
  isLoading?: boolean;
  className?: string;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs mt-2',
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            <TrendingUp
              className={cn('w-3 h-3', !trend.isPositive && 'rotate-180')}
            />
            <span>
              {trend.isPositive ? '+' : ''}
              {trend.value}% from last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * AnalyticsOverview Component
 */
export function AnalyticsOverview({
  analytics,
  isLoading,
  className,
}: AnalyticsOverviewProps) {
  if (isLoading) {
    return (
      <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const engagementRate =
    analytics.totalResources > 0
      ? ((analytics.totalViews / analytics.totalResources) * 100).toFixed(1)
      : '0';

  const completionRate =
    analytics.totalViews > 0
      ? ((analytics.totalCompletions / analytics.totalViews) * 100).toFixed(1)
      : '0';

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      <StatCard
        title="Total Resources"
        value={analytics.totalResources}
        icon={<FileText className="w-4 h-4" />}
        description={`${analytics.sharedResources} shared with clients`}
      />

      <StatCard
        title="Total Views"
        value={analytics.totalViews.toLocaleString()}
        icon={<Eye className="w-4 h-4" />}
        description={`${engagementRate} avg views per resource`}
      />

      <StatCard
        title="Total Downloads"
        value={analytics.totalDownloads.toLocaleString()}
        icon={<Download className="w-4 h-4" />}
        description={`From ${analytics.uniqueViewers} unique clients`}
      />

      <StatCard
        title="Completions"
        value={analytics.totalCompletions.toLocaleString()}
        icon={<CheckCircle2 className="w-4 h-4" />}
        description={`${completionRate}% completion rate`}
      />
    </div>
  );
}
