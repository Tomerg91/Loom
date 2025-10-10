/**
 * Resource Library Analytics Page
 *
 * Comprehensive analytics dashboard for resource library:
 * - Overview metrics
 * - Top performing resources
 * - Category breakdown
 * - Engagement trends
 *
 * @module app/(dashboard)/coach/resources/analytics
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AnalyticsOverview,
  TopResourcesList,
  ResourceEmptyState,
  AutoShareSettings,
} from '@/components/resources';
import { ResourceErrorBoundary } from '@/components/resources/resource-error-boundary';
import type { LibraryAnalytics, ResourceLibraryItem } from '@/types/resources';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

/**
 * Fetch library analytics
 */
async function fetchAnalytics() {
  const res = await fetch('/api/resources/analytics');

  if (!res.ok) {
    throw new Error('Failed to fetch analytics');
  }

  const data = await res.json();
  return data.data as LibraryAnalytics;
}

/**
 * Fetch all resources for top performers analysis
 */
async function fetchResources() {
  const res = await fetch('/api/resources');

  if (!res.ok) {
    throw new Error('Failed to fetch resources');
  }

  const data = await res.json();
  return data.data.resources as ResourceLibraryItem[];
}

/**
 * ResourceAnalyticsPage Component
 */
export default function ResourceAnalyticsPage() {
  const router = useRouter();

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['resource-analytics'],
    queryFn: fetchAnalytics,
  });

  // Fetch resources
  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: fetchResources,
  });

  const isLoading = analyticsLoading || resourcesLoading;

  return (
    <ResourceErrorBoundary>
      <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/coach/resources')}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Resources
        </Button>

        <h1 className="text-3xl font-bold tracking-tight">Resource Analytics</h1>
        <p className="text-muted-foreground">
          Track engagement and performance of your resource library
        </p>
      </div>

      {/* Overview Metrics */}
      {analytics && (
        <AnalyticsOverview analytics={analytics} isLoading={isLoading} />
      )}

      {/* Tabs for Different Views */}
      <Tabs defaultValue="top-performers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
          <TabsTrigger value="category-breakdown">By Category</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Top Performers Tab */}
        <TabsContent value="top-performers" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <TopResourcesList
              resources={resources}
              title="Most Viewed"
              description="Resources with the highest view count"
              metric="views"
              limit={5}
            />

            <TopResourcesList
              resources={resources}
              title="Most Downloaded"
              description="Resources clients download most"
              metric="downloads"
              limit={5}
            />
          </div>

          <TopResourcesList
            resources={resources}
            title="Most Completed"
            description="Resources with highest completion rate"
            metric="completions"
            limit={10}
          />
        </TabsContent>

        {/* Category Breakdown Tab */}
        <TabsContent value="category-breakdown" className="space-y-6">
          {analytics && analytics.byCategory ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(analytics.byCategory).map(([category, stats]) => (
                <div
                  key={category}
                  className="rounded-lg border bg-card p-6 space-y-2"
                >
                  <h3 className="font-semibold capitalize">{category}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resources:</span>
                      <span className="font-medium">{stats.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Views:</span>
                      <span className="font-medium">{stats.views}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Downloads:</span>
                      <span className="font-medium">{stats.downloads}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ResourceEmptyState
              title="No category data"
              description="Upload resources to see category breakdown"
            />
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <AutoShareSettings
            enabled={false}
            permission="view"
            selectedCollections={[]}
            onEnabledChange={(enabled) => {
              console.log('Auto-share enabled:', enabled);
            }}
            onPermissionChange={(permission) => {
              console.log('Permission changed:', permission);
            }}
            onSave={async () => {
              console.log('Settings saved');
            }}
          />
        </TabsContent>
      </Tabs>
      </div>
    </ResourceErrorBoundary>
  );
}
