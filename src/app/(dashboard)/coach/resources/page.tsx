/**
 * Coach Resource Library Page
 *
 * Main page for coaches to manage their resource library:
 * - View all resources in grid/list layout
 * - Upload new resources
 * - Filter and search resources
 * - Share resources with clients
 * - Edit and delete resources
 * - View analytics
 *
 * @module app/(dashboard)/coach/resources
 */

'use client';

import { Plus, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import {
  ResourceGrid,
  ResourceFilters,
  ResourceUploadDialog,
  ResourceShareDialog,
} from '@/components/resources';
import { ResourceErrorBoundary } from '@/components/resources/resource-error-boundary';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useResources,
  useCollections,
  useUploadResource,
  useDeleteResource,
  useShareResource,
  extractUniqueTags,
} from '@/hooks/resources';
import type {
  ResourceLibraryItem,
  ResourceListParams,
} from '@/types/resources';

/**
 * Download resource
 */
async function downloadResource(resource: ResourceLibraryItem) {
  // Trigger download via signed URL or direct download
  window.open(`/api/files/${resource.id}/download`, '_blank');
}

// Disable static generation for this page
export const dynamic = 'force-dynamic';

/**
 * CoachResourcesPage Component
 */
export default function CoachResourcesPage() {
  const router = useRouter();

  // Local state
  const [filters, setFilters] = useState<Partial<ResourceListParams>>({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceLibraryItem | null>(null);

  // Fetch resources and collections using custom hooks
  const { data: resources = [], isLoading } = useResources(filters);
  const { data: collections = [] } = useCollections();

  // Mutation hooks with built-in toast notifications
  const uploadMutation = useUploadResource();
  const shareMutation = useShareResource();
  const deleteMutation = useDeleteResource();

  // Extract unique tags for filter
  const availableTags = extractUniqueTags(resources);

  // Handlers
  const handleUpload = useCallback(
    async (file: File, metadata: { category: string; tags?: string; description?: string; collectionId?: string }) => {
      await uploadMutation.mutateAsync({ file, metadata });
      setUploadDialogOpen(false);
    },
    [uploadMutation]
  );

  const handleShare = useCallback(
    (resource: ResourceLibraryItem) => {
      setSelectedResource(resource);
      setShareDialogOpen(true);
    },
    []
  );

  const handleShareSubmit = useCallback(
    async (resourceId: string, data: { permission: string; expiresAt?: Date; message?: string }) => {
      await shareMutation.mutateAsync({ resourceId, data });
      setShareDialogOpen(false);
      setSelectedResource(null);
    },
    [shareMutation]
  );

  const handleDelete = useCallback(
    (resource: ResourceLibraryItem) => {
      if (
        confirm(
          `Are you sure you want to delete "${resource.filename}"? This action cannot be undone.`
        )
      ) {
        deleteMutation.mutate(resource.id);
      }
    },
    [deleteMutation]
  );

  const handleView = useCallback(
    (resource: ResourceLibraryItem) => {
      router.push(`/coach/resources/${resource.id}`);
    },
    [router]
  );

  const handleDownload = useCallback(async (resource: ResourceLibraryItem) => {
    await downloadResource(resource);
  }, []);

  return (
    <ResourceErrorBoundary>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Resource Library</h1>
            <p className="text-muted-foreground mt-2">
              Manage and share resources with your clients
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/coach/resources/analytics')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>

            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Resource
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all-resources" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all-resources">All Resources</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
          </TabsList>

          {/* All Resources Tab */}
          <TabsContent value="all-resources" className="space-y-6">
            {/* Filters */}
            <ResourceFilters
              availableTags={availableTags}
              initialFilters={filters}
              onFiltersChange={setFilters}
            />

            {/* Resource Grid */}
            <ResourceGrid
              resources={resources}
              viewMode="coach"
              isLoading={isLoading}
              emptyStateTitle="No resources yet"
              emptyStateDescription="Upload your first resource to start building your library"
              emptyStateAction={
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Resource
                </Button>
              }
              onView={handleView}
              onDownload={handleDownload}
              onShare={handleShare}
              onDelete={handleDelete}
            />
          </TabsContent>

          {/* Collections Tab */}
          <TabsContent value="collections" className="space-y-6">
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">Collections</h3>
              <p className="text-muted-foreground mb-6">
                Organize your resources into themed collections
              </p>
              <Button onClick={() => router.push('/coach/resources/collections')}>
                Manage Collections
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Upload Dialog */}
        <ResourceUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          collections={collections}
          onUpload={handleUpload}
        />

        {/* Share Dialog */}
        <ResourceShareDialog
          resource={selectedResource}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          onShare={handleShareSubmit}
        />
      </div>
    </ResourceErrorBoundary>
  );
}
