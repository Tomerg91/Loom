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

import { CheckCircle2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useCallback } from 'react';

import { ResourceGrid, ResourceFilters } from '@/components/resources';
import { ResourceErrorBoundary } from '@/components/resources/resource-error-boundary';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  useClientResources,
  extractUniqueTags,
  useTrackResourceProgress,
} from '@/hooks/resources';
import type {
  ClientResourceItem,
  ResourceLibraryItem,
  ResourceListParams,
} from '@/types/resources';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

/**
 * Client-specific resource type with optional legacy progress flags
 */
type ClientResourceWithFlags = ClientResourceItem & {
  hasViewed?: boolean;
  hasCompleted?: boolean;
};

/**
 * Helper to determine if the resource has been viewed
 */
function hasViewedResource(resource: ClientResourceWithFlags): boolean {
  return resource.progress?.viewed ?? resource.hasViewed ?? false;
}

/**
 * Helper to determine if the resource has been completed
 */
function hasCompletedResource(resource: ClientResourceWithFlags): boolean {
  return resource.progress?.completed ?? resource.hasCompleted ?? false;
}

/**
 * ClientResourcesPage Component
 */
export default function ClientResourcesPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Local filter state shared with query hook
  const [filters, setFilters] = useState<Partial<ResourceListParams>>({});
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      coachId: selectedCoachId ?? undefined,
    }),
    [filters, selectedCoachId]
  );

  // Fetch resources
  const { data: resources = [], isLoading } = useClientResources(queryFilters);
  const clientResources = resources as ClientResourceWithFlags[];

  // Track progress mutation shared across view/download actions
  const progressMutation = useTrackResourceProgress(['client-resources']);

  // Derived filters and metadata
  const availableTags = useMemo(
    () => extractUniqueTags(clientResources),
    [clientResources]
  );

  const coaches = useMemo(() => {
    const coachMap = new Map<string, { id: string; name: string }>();

    clientResources.forEach(resource => {
      if (resource.sharedBy) {
        coachMap.set(resource.sharedBy.id, {
          id: resource.sharedBy.id,
          name: resource.sharedBy.name,
        });
      }
    });

    return Array.from(coachMap.values());
  }, [clientResources]);

  const viewedCount = useMemo(
    () =>
      clientResources.filter(resource => hasViewedResource(resource)).length,
    [clientResources]
  );

  const completedCount = useMemo(
    () =>
      clientResources.filter(resource => hasCompletedResource(resource)).length,
    [clientResources]
  );

  // Handlers
  const handleFiltersChange = useCallback(
    (updatedFilters: Partial<ResourceListParams>) => {
      setFilters(updatedFilters);
    },
    []
  );

  const handleCoachFilter = useCallback((coachId: string | null) => {
    setSelectedCoachId(previous =>
      previous === coachId || coachId === null ? null : coachId
    );
  }, []);

  const handleView = useCallback(
    (resource: ResourceLibraryItem) => {
      const clientResource = resource as ClientResourceWithFlags;

      if (!hasViewedResource(clientResource)) {
        progressMutation.mutate({
          resourceId: clientResource.id,
          action: 'viewed',
        });
      }

      router.push(`/client/resources/${clientResource.id}`);
    },
    [router, progressMutation]
  );

  const handleDownload = useCallback(
    async (resource: ResourceLibraryItem) => {
      const clientResource = resource as ClientResourceWithFlags;

      try {
        await progressMutation.mutateAsync({
          resourceId: clientResource.id,
          action: 'accessed',
        });

        window.open(`/api/files/${clientResource.id}/download`, '_blank');

        toast({
          title: 'Download started',
          description: 'Your resource download has started.',
        });
      } catch (error) {
        toast({
          title: 'Download failed',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to download resource',
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
            <Badge
              key="all"
              variant={selectedCoachId ? 'outline' : 'default'}
              className="cursor-pointer"
              onClick={() => handleCoachFilter(null)}
            >
              All coaches
            </Badge>
            {coaches.map(coach => (
              <Badge
                key={coach.id}
                variant={selectedCoachId === coach.id ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleCoachFilter(coach.id)}
              >
                {coach.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Filters */}
        <ResourceFilters
          availableTags={availableTags}
          initialFilters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {/* Resource Grid */}
        <ResourceGrid
          resources={clientResources as ResourceLibraryItem[]}
          viewMode="client"
          isLoading={isLoading}
          emptyStateTitle="No resources shared yet"
          emptyStateDescription="Your coach hasn't shared any resources with you yet. Check back later!"
          onView={handleView}
          onDownload={handleDownload}
        />

        {/* Stats Summary */}
        {clientResources.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Viewed</p>
                <p className="text-2xl font-bold">{viewedCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Resources</p>
                <p className="text-2xl font-bold">{clientResources.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResourceErrorBoundary>
  );
}
