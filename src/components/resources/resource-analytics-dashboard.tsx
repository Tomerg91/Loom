'use client';

/**
 * Resource Analytics Dashboard Component
 *
 * Comprehensive analytics dashboard for resource library:
 * - Overview statistics
 * - Top performing resources
 * - Category performance breakdown
 * - Engagement trends
 * - Client activity metrics
 * - Resource ROI analysis
 *
 * Note: Analytics may show cached data; refresh to update stats
 *
 * @module components/resources/resource-analytics-dashboard
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Download, Calendar, TrendingUp, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

import { AnalyticsOverview } from '@/components/resources/analytics-overview';
import {
  TopResourcesChart,
  CategoryPerformanceChart,
  EngagementTrendsChart,
  CompletionRateChart,
  ResourceROIChart,
} from '@/components/resources/analytics-charts';
import { TopResourcesList } from '@/components/resources/top-resources-list';

import type { LibraryAnalytics } from '@/types/resources';

type TimeRange = '7d' | '30d' | '90d' | 'all';

export function ResourceAnalyticsDashboard() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['resource-analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/coach/resources/analytics?timeRange=${timeRange}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch analytics');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const analytics: LibraryAnalytics | undefined = analyticsData?.data;

  const handleRefresh = () => {
    refetch();
    toast({
      title: 'Refreshing analytics',
      description: 'Updating resource library statistics...',
    });
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    toast({
      title: 'Export started',
      description: 'Your analytics report is being generated...',
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error loading analytics</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <Button onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resource Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track usage, engagement, and impact of your resource library
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export Button */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Cache Notice */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Badge variant="outline" className="text-xs">
          Note
        </Badge>
        <span>Analytics may show cached data. Click refresh to update statistics.</span>
      </div>

      {/* Overview Cards */}
      <AnalyticsOverview analytics={analytics!} isLoading={isLoading} />

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Target className="h-4 w-4 mr-2" />
            Top Resources
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Target className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="engagement">
            <Users className="h-4 w-4 mr-2" />
            Engagement
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Resources Chart */}
            {analytics && analytics.topResources.length > 0 && (
              <TopResourcesChart resources={analytics.topResources} />
            )}

            {/* Category Distribution */}
            {analytics && analytics.categoryBreakdown.length > 0 && (
              <CategoryPerformanceChart categories={analytics.categoryBreakdown} />
            )}
          </div>

          {/* Completion Rate by Category */}
          {analytics && analytics.categoryBreakdown.length > 0 && (
            <CompletionRateChart categories={analytics.categoryBreakdown} />
          )}
        </TabsContent>

        {/* Top Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          {analytics && analytics.topResources.length > 0 ? (
            <>
              <TopResourcesList resources={analytics.topResources} />
              <TopResourcesChart resources={analytics.topResources} />
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No resource data available for the selected time range
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          {analytics && analytics.categoryBreakdown.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <CategoryPerformanceChart
                categories={analytics.categoryBreakdown}
                metric="totalViews"
                title="Views by Category"
                description="Total views across resource categories"
              />
              <CategoryPerformanceChart
                categories={analytics.categoryBreakdown}
                metric="totalCompletions"
                title="Completions by Category"
                description="Total completions across resource categories"
              />
              <div className="md:col-span-2">
                <CompletionRateChart categories={analytics.categoryBreakdown} />
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No category data available
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.activeClients || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Clients who accessed resources
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.avgCompletionRate ? Math.round(analytics.avgCompletionRate) : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average across all resources
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Shared Resources</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.sharedResources || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Of {analytics?.totalResources || 0} total resources
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Placeholder for future engagement trends */}
          <Card>
            <CardHeader>
              <CardTitle>Client Engagement Metrics</CardTitle>
              <CardDescription>
                Detailed engagement analytics coming soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Unique Viewers</span>
                  <span className="font-medium">{analytics?.uniqueViewers || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Views</span>
                  <span className="font-medium">{analytics?.totalViews || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Downloads</span>
                  <span className="font-medium">{analytics?.totalDownloads || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Completions</span>
                  <span className="font-medium">{analytics?.totalCompletions || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
