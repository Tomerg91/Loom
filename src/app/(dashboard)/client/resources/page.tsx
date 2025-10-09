/**
 * Client Resource Library Page
 *
 * Page for clients to view and access resources shared by their coaches:
 * - View shared resources in grid/list layout
 * - Filter and search resources
 * - Download/view resources
 * - Track progress (mark as viewed/completed)
 * - Filter by coach (if multiple)
 *
 * @module app/(dashboard)/client/resources
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import {
  ResourceGrid,
  ResourceFilters,
} from '@/components/resources';
import { ResourceErrorBoundary } from '@/components/resources/resource-error-boundary';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import type { ResourceLibraryItem, ResourceListParams } from '@/types/resources';

/**
 * Client-specific resource type with coach info
 */
interface ClientResourceItem extends ResourceLibraryItem {
  sharedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  hasViewed?: boolean;
  hasCompleted?: boolean;
}

/**
 * Fetch resources shared with client
 */
async function fetchSharedResources(filters: Partial<ResourceListParams>) {
  const params = new URLSearchParams();

  if (filters.category) params.set('category', filters.category);
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  if (filters.search) params.set('search', filters.search);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

  const res = await fetch(`/api/resources/client?${params.toString()}`);

  if (!res.ok) {
    throw new Error('Failed to fetch resources');
  }

  const data = await res.json();
  return data.data.resources as ClientResourceItem[];
}

/**
 * Track resource progress
 */
async function trackProgress(
  resourceId: string,
  action: 'viewed' | 'completed' | 'accessed'
) {
  const res = await fetch(`/api/resources/${resourceId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to track progress');
  }

  return res.json();
}

/**
 * Download resource
 */
async function downloadResource(resource: ClientResourceItem) {
  // Track access before download
  await trackProgress(resource.id, 'accessed');

  // Trigger download
  window.open(`/api/files/${resource.id}/download`, '_blank');
}

/**
 * ClientResourcesPage Component
 */
export default function ClientResourcesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local state
  const [filters, setFilters] = useState<Partial<ResourceListParams>>({});

  // Fetch resources
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['client-resources', filters],
    queryFn: () => fetchSharedResources(filters),
  });

  // Track progress mutation
  const progressMutation = useMutation({
    mutationFn: ({ resourceId, action }: { resourceId: string; action: 'viewed' | 'completed' | 'accessed' }) =>
      trackProgress(resourceId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-resources'] });
    },
  });

  // Extract unique tags and coaches for filters
  const availableTags = Array.from(
    new Set(resources.flatMap((r) => r.tags))
  ).sort();

  const coaches = Array.from(
    new Map(resources.map((r) => [r.sharedBy.id, r.sharedBy])).values()
  );

  // Handlers
  const handleView = useCallback(
    async (resource: ResourceLibraryItem) => {
      const clientResource = resource as ClientResourceItem;
      // Track view
      if (!clientResource.hasViewed) {
        progressMutation.mutate({
          resourceId: resource.id,
          action: 'viewed',
        });
      }

      // Navigate to resource detail
      router.push(`/client/resources/${resource.id}`);
    },
    [router, progressMutation]
  );

  const handleDownload = useCallback(
    async (resource: ResourceLibraryItem) => {
      try {
        await downloadResource(resource as ClientResourceItem);

        toast({
          title: 'Download started',
          description: 'Your resource download has started.',
        });
      } catch (error) {
        toast({
          title: 'Download failed',
          description: error instanceof Error ? error.message : 'Failed to download resource',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const _handleMarkComplete = useCallback(
    async (resource: ClientResourceItem) => {
      try {
        await progressMutation.mutateAsync({
          resourceId: resource.id,
          action: 'completed',
        });

        toast({
          title: 'Marked as complete',
          description: `"${resource.filename}" has been marked as completed.`,
        });
      } catch (error) {
        toast({
          title: 'Failed to update',
          description: error instanceof Error ? error.message : 'Failed to update progress',
          variant: 'destructive',
        });
      }
    },
    [progressMutation, toast]
  );

  return (
    <ResourceErrorBoundary>
      <div className="container py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Resources</h1>
        <p className="text-muted-foreground mt-2">
          Resources shared with you by your coaches
        </p>
      </div>

      {/* Coach Filter (if multiple coaches) */}
      {coaches.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Filter by coach:</span>
          {coaches.map((coach) => (
            <Badge key={coach.id} variant="outline" className="cursor-pointer">
              {coach.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <ResourceFilters
        availableTags={availableTags}
        initialFilters={filters}
        onFiltersChange={setFilters}
      />

      {/* Resource Grid */}
      <ResourceGrid
        resources={resources as ResourceLibraryItem[]}
        viewMode="client"
        isLoading={isLoading}
        emptyStateTitle="No resources shared yet"
        emptyStateDescription="Your coach hasn't shared any resources with you yet. Check back later!"
        onView={handleView}
        onDownload={handleDownload}
      />

      {/* Stats Summary */}
      {resources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Viewed</p>
              <p className="text-2xl font-bold">
                {resources.filter((r) => r.hasViewed).length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">
                {resources.filter((r) => r.hasCompleted).length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10">
              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Resources</p>
              <p className="text-2xl font-bold">{resources.length}</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </ResourceErrorBoundary>
  );
}
