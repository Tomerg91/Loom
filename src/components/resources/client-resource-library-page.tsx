'use client';

/**
 * Client Resource Library Page Component
 *
 * Main component for client-facing resource library:
 * - Browse resources shared by coach(es)
 * - Filter by category, tags, collections
 * - Track progress (viewed/completed)
 * - Download/view resources
 * - RLS enforced at API level
 *
 * @module components/resources/client-resource-library-page
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Grid3x3, List, Loader2, BookOpen } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { ClientResourceGrid } from '@/components/resources/client-resource-grid';
import { ClientResourceFilters } from '@/components/resources/client-resource-filters';
import { ClientResourceProgressCard } from '@/components/resources/client-resource-progress-card';
import { ResourceEmptyState } from '@/components/resources/resource-empty-state';

import type {
  ClientResourceItem,
  ResourceListParams,
  ProgressAction,
} from '@/types/resources';

export function ClientResourceLibraryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter state
  const [filters, setFilters] = useState<ResourceListParams>({
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCompleted, setShowCompleted] = useState(true);

  // Fetch resources
  const {
    data: resourcesData,
    isLoading: resourcesLoading,
    error: resourcesError,
  } = useQuery({
    queryKey: ['client-resources', filters, showCompleted],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.tags?.length) params.append('tags', filters.tags.join(','));
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.coachId) params.append('coachId', filters.coachId);
      params.append('showCompleted', String(showCompleted));

      const response = await fetch(`/api/client/resources?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch resources');
      }
      return response.json();
    },
  });

  const resources: ClientResourceItem[] = resourcesData?.data?.resources || [];
  const total = resourcesData?.data?.total || 0;

  // Track progress mutation
  const trackProgressMutation = useMutation({
    mutationFn: async ({ resourceId, action }: { resourceId: string; action: ProgressAction }) => {
      const response = await fetch(`/api/client/resources/${resourceId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to track progress');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-resources'] });

      const actionLabels = {
        viewed: 'viewed',
        completed: 'completed',
        accessed: 'accessed',
      };

      toast({
        title: 'Progress updated',
        description: `Resource marked as ${actionLabels[variables.action]}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error tracking progress',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle progress tracking
  const handleTrackProgress = useCallback(
    (resourceId: string, action: ProgressAction) => {
      trackProgressMutation.mutate({ resourceId, action });
    },
    [trackProgressMutation]
  );

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<ResourceListParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Calculate progress stats
  const stats = {
    total: total,
    viewed: resources.filter(r => r.progress?.viewed).length,
    completed: resources.filter(r => r.progress?.completed).length,
    notStarted: resources.filter(r => !r.progress?.viewed).length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (resourcesError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error loading resources</p>
            <p className="text-sm text-muted-foreground mt-2">
              {resourcesError instanceof Error ? resourcesError.message : 'Unknown error'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resource Library</h1>
        <p className="text-muted-foreground mt-2">
          Access resources shared with you by your coach
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viewed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.viewed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Badge variant="secondary" className="h-4 px-1">
              {completionRate}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notStarted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <ClientResourceFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          showCompleted={showCompleted}
          onShowCompletedChange={setShowCompleted}
        />

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Resources Display */}
      {resourcesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : resources.length === 0 ? (
        <ResourceEmptyState
          title="No resources yet"
          description={
            filters.category || filters.search || filters.tags?.length
              ? "No resources match your filters. Try adjusting your search criteria."
              : "Your coach hasn't shared any resources with you yet."
          }
        />
      ) : (
        <ClientResourceGrid
          resources={resources}
          viewMode={viewMode}
          onTrackProgress={handleTrackProgress}
          isTracking={trackProgressMutation.isPending}
        />
      )}

      {/* Progress Tracking Card (for in-progress resources) */}
      {stats.notStarted > 0 && (
        <ClientResourceProgressCard
          resources={resources.filter(r => !r.progress?.viewed)}
          onTrackProgress={handleTrackProgress}
        />
      )}
    </div>
  );
}
