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

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BarChart3 } from 'lucide-react';
import {
  ResourceGrid,
  ResourceFilters,
  ResourceUploadDialog,
  ResourceShareDialog,
} from '@/components/resources';
import { useToast } from '@/components/ui/use-toast';
import type {
  ResourceLibraryItem,
  ResourceListParams,
  ResourceCollection,
} from '@/types/resources';

/**
 * Fetch resources from API
 */
async function fetchResources(filters: Partial<ResourceListParams>) {
  const params = new URLSearchParams();

  if (filters.category) params.set('category', filters.category);
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  if (filters.search) params.set('search', filters.search);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

  const res = await fetch(`/api/resources?${params.toString()}`);

  if (!res.ok) {
    throw new Error('Failed to fetch resources');
  }

  const data = await res.json();
  return data.data.resources as ResourceLibraryItem[];
}

/**
 * Fetch collections from API
 */
async function fetchCollections() {
  const res = await fetch('/api/resources/collections');

  if (!res.ok) {
    throw new Error('Failed to fetch collections');
  }

  const data = await res.json();
  return data.data.collections as ResourceCollection[];
}

/**
 * Upload resource
 */
async function uploadResource(file: File, metadata: any) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', metadata.category);

  if (metadata.tags) {
    const tags = metadata.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    formData.append('tags', JSON.stringify(tags));
  }

  if (metadata.description) {
    formData.append('description', metadata.description);
  }

  if (metadata.collectionId && metadata.collectionId !== 'none') {
    formData.append('collectionId', metadata.collectionId);
  }

  const res = await fetch('/api/resources', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to upload resource');
  }

  return res.json();
}

/**
 * Share resource with all clients
 */
async function shareResourceWithAllClients(
  resourceId: string,
  data: { permission: string; expiresAt?: Date; message?: string }
) {
  const res = await fetch(`/api/resources/${resourceId}/share-all-clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      permission: data.permission,
      expiresAt: data.expiresAt?.toISOString(),
      message: data.message,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to share resource');
  }

  return res.json();
}

/**
 * Delete resource
 */
async function deleteResource(resourceId: string) {
  const res = await fetch(`/api/resources/${resourceId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete resource');
  }

  return res.json();
}

/**
 * Download resource
 */
async function downloadResource(resource: ResourceLibraryItem) {
  // Trigger download via signed URL or direct download
  window.open(`/api/files/${resource.id}/download`, '_blank');
}

/**
 * CoachResourcesPage Component
 */
export default function CoachResourcesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local state
  const [filters, setFilters] = useState<Partial<ResourceListParams>>({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceLibraryItem | null>(null);

  // Fetch resources
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources', filters],
    queryFn: () => fetchResources(filters),
  });

  // Fetch collections
  const { data: collections = [] } = useQuery({
    queryKey: ['resource-collections'],
    queryFn: fetchCollections,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata: any }) =>
      uploadResource(file, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({
        title: 'Resource uploaded',
        description: 'Your resource has been added to the library.',
      });
      setUploadDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: ({ resourceId, data }: { resourceId: string; data: any }) =>
      shareResourceWithAllClients(resourceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({
        title: 'Resource shared',
        description: 'Your resource has been shared with all clients.',
      });
      setShareDialogOpen(false);
      setSelectedResource(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Share failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({
        title: 'Resource deleted',
        description: 'The resource has been removed from your library.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Extract unique tags for filter
  const availableTags = Array.from(
    new Set(resources.flatMap((r) => r.tags))
  ).sort();

  // Handlers
  const handleUpload = useCallback(
    async (file: File, metadata: any) => {
      await uploadMutation.mutateAsync({ file, metadata });
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
    async (resourceId: string, data: any) => {
      await shareMutation.mutateAsync({ resourceId, data });
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
          <div className="text-center py-12 text-muted-foreground">
            <p>Collections feature coming soon!</p>
            <p className="text-sm mt-2">
              Organize your resources into themed collections
            </p>
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
  );
}
