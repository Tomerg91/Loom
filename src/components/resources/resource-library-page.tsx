'use client';

/**
 * Resource Library Page Component
 *
 * Main component for the coach resource library that integrates:
 * - Resource list/grid with filtering
 * - Upload workflow
 * - Collection management
 * - Resource sharing
 * - Analytics dashboard
 *
 * @module components/resources/resource-library-page
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Resource components
import { ResourceGrid } from '@/components/resources/resource-grid';
import { ResourceFilters } from '@/components/resources/resource-filters';
import { ResourceShareDialog } from '@/components/resources/resource-share-dialog';
import { ResourceUploadDialog } from '@/components/resources/resource-upload-dialog';
import { CollectionDialog } from '@/components/resources/collection-dialog';
import { CollectionCard } from '@/components/resources/collection-card';
import { AnalyticsOverview } from '@/components/resources/analytics-overview';
import { TopResourcesList } from '@/components/resources/top-resources-list';
import { AutoShareSettings } from '@/components/resources/auto-share-settings';
import { ResourceEmptyState } from '@/components/resources/resource-empty-state';

import type {
  ResourceLibraryItem,
  ResourceCollection,
  ResourceListParams,
  LibraryAnalytics,
} from '@/types/resources';

export function ResourceLibraryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceLibraryItem | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<ResourceCollection | null>(null);

  // Filter state
  const [filters, setFilters] = useState<ResourceListParams>({
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Active tab
  const [activeTab, setActiveTab] = useState<'all' | 'collections' | 'analytics'>('all');

  // Fetch resources
  const {
    data: resources,
    isLoading: resourcesLoading,
    error: resourcesError,
  } = useQuery({
    queryKey: ['coach-resources', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.tags?.length) params.append('tags', filters.tags.join(','));
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/coach/resources?${params}`);
      if (!response.ok) throw new Error('Failed to fetch resources');
      const data = await response.json();
      return data.data as ResourceLibraryItem[];
    },
  });

  // Fetch collections
  const {
    data: collections,
    isLoading: collectionsLoading,
  } = useQuery({
    queryKey: ['coach-collections'],
    queryFn: async () => {
      const response = await fetch('/api/coach/collections');
      if (!response.ok) throw new Error('Failed to fetch collections');
      const data = await response.json();
      return data.data as ResourceCollection[];
    },
  });

  // Fetch analytics
  const {
    data: analytics,
    isLoading: analyticsLoading,
  } = useQuery({
    queryKey: ['coach-library-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/coach/resources/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      return data.data as LibraryAnalytics;
    },
  });

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const response = await fetch(`/api/coach/resources/${resourceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete resource');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-resources'] });
      queryClient.invalidateQueries({ queryKey: ['coach-library-analytics'] });
      toast({
        title: 'Success',
        description: 'Resource deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete resource',
        variant: 'destructive',
      });
    },
  });

  // Delete collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const response = await fetch(`/api/coach/collections/${collectionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete collection');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-collections'] });
      toast({
        title: 'Success',
        description: 'Collection deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete collection',
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleUploadSuccess = useCallback(() => {
    setUploadDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['coach-resources'] });
    queryClient.invalidateQueries({ queryKey: ['coach-library-analytics'] });
    toast({
      title: 'Success',
      description: 'Resource uploaded successfully',
    });
  }, [queryClient, toast]);

  const handleCollectionSuccess = useCallback(() => {
    setCollectionDialogOpen(false);
    setSelectedCollection(null);
    queryClient.invalidateQueries({ queryKey: ['coach-collections'] });
    toast({
      title: 'Success',
      description: selectedCollection ? 'Collection updated successfully' : 'Collection created successfully',
    });
  }, [queryClient, toast, selectedCollection]);

  const handleShareSuccess = useCallback(() => {
    setShareDialogOpen(false);
    setSelectedResource(null);
    queryClient.invalidateQueries({ queryKey: ['coach-resources'] });
    toast({
      title: 'Success',
      description: 'Resource shared successfully',
    });
  }, [queryClient, toast]);

  const handleShareResource = useCallback((resource: ResourceLibraryItem) => {
    setSelectedResource(resource);
    setShareDialogOpen(true);
  }, []);

  const handleDeleteResource = useCallback((resourceId: string) => {
    if (confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      deleteResourceMutation.mutate(resourceId);
    }
  }, [deleteResourceMutation]);

  const handleEditCollection = useCallback((collection: ResourceCollection) => {
    setSelectedCollection(collection);
    setCollectionDialogOpen(true);
  }, []);

  const handleDeleteCollection = useCallback((collectionId: string) => {
    if (confirm('Are you sure you want to delete this collection? Resources will not be deleted.')) {
      deleteCollectionMutation.mutate(collectionId);
    }
  }, [deleteCollectionMutation]);

  const handleFilterChange = useCallback((newFilters: Partial<ResourceListParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resource Library</h1>
          <p className="text-muted-foreground mt-1">
            Manage and share resources with your clients
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCollectionDialogOpen(true)} variant="outline">
            <FolderPlus className="mr-2 h-4 w-4" />
            New Collection
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Resource
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="all">All Resources</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* All Resources Tab */}
        <TabsContent value="all" className="space-y-6">
          {/* Filters */}
          <ResourceFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            availableTags={[]} // TODO: Get from resources
          />

          {/* Resources Grid */}
          {resourcesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : resourcesError ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-destructive">
                  Failed to load resources. Please try again.
                </p>
              </CardContent>
            </Card>
          ) : !resources || resources.length === 0 ? (
            <ResourceEmptyState onUpload={() => setUploadDialogOpen(true)} />
          ) : (
            <ResourceGrid
              resources={resources}
              onShare={handleShareResource}
              onDelete={handleDeleteResource}
              collections={collections || []}
            />
          )}
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections" className="space-y-6">
          {collectionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !collections || collections.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <FolderPlus className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <h3 className="font-semibold">No Collections Yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create collections to organize your resources
                    </p>
                  </div>
                  <Button onClick={() => setCollectionDialogOpen(true)}>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Create Collection
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  onEdit={handleEditCollection}
                  onDelete={handleDeleteCollection}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !analytics ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  No analytics available yet. Upload resources to see insights.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Analytics Overview */}
              <AnalyticsOverview analytics={analytics} />

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Resources */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Resources</CardTitle>
                    <CardDescription>Most viewed resources in your library</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TopResourcesList resources={analytics.topResources} />
                  </CardContent>
                </Card>

                {/* Auto-Share Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Auto-Share Settings</CardTitle>
                    <CardDescription>Automatically share resources with new clients</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AutoShareSettings />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ResourceUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={handleUploadSuccess}
        collections={collections || []}
      />

      <CollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
        onSuccess={handleCollectionSuccess}
        collection={selectedCollection}
      />

      {selectedResource && (
        <ResourceShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          onSuccess={handleShareSuccess}
          resource={selectedResource}
        />
      )}
    </div>
  );
}
