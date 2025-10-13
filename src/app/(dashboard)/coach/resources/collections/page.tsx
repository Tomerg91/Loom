/**
 * Collections Management Page
 *
 * Page for managing resource collections:
 * - View all collections
 * - Create new collections
 * - Edit collections
 * - Delete collections
 * - View collection resources
 *
 * @module app/(dashboard)/coach/resources/collections
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState, useCallback } from 'react';

import {
  CollectionCard,
  CollectionDialog,
  ResourceEmptyState,
} from '@/components/resources';
import { ResourceErrorBoundary } from '@/components/resources/resource-error-boundary';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import type { ResourceCollection } from '@/types/resources';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

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
 * Create collection
 */
async function createCollection(data: { name: string; description?: string; icon?: string }) {
  const res = await fetch('/api/resources/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create collection');
  }

  return res.json();
}

/**
 * Update collection
 */
async function updateCollection(
  id: string,
  data: { name?: string; description?: string; icon?: string }
) {
  const res = await fetch(`/api/resources/collections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update collection');
  }

  return res.json();
}

/**
 * Delete collection
 */
async function deleteCollection(id: string) {
  const res = await fetch(`/api/resources/collections/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete collection');
  }

  return res.json();
}

/**
 * CollectionsPage Component
 */
export default function CollectionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<ResourceCollection | null>(null);

  // Fetch collections
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['resource-collections'],
    queryFn: fetchCollections,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-collections'] });
      toast({
        title: 'Collection created',
        description: 'Your collection has been created successfully.',
      });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create collection',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; icon?: string } }) => updateCollection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-collections'] });
      toast({
        title: 'Collection updated',
        description: 'Your collection has been updated successfully.',
      });
      setDialogOpen(false);
      setSelectedCollection(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update collection',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-collections'] });
      toast({
        title: 'Collection deleted',
        description: 'The collection has been deleted. Resources remain in your library.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete collection',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleCreate = useCallback(() => {
    setSelectedCollection(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((collection: ResourceCollection) => {
    setSelectedCollection(collection);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (collection: ResourceCollection) => {
      await deleteMutation.mutateAsync(collection.id);
    },
    [deleteMutation]
  );

  const handleSave = useCallback(
    async (data: { name: string; description?: string; icon?: string }) => {
      if (selectedCollection) {
        // Update existing
        await updateMutation.mutateAsync({
          id: selectedCollection.id,
          data,
        });
      } else {
        // Create new
        await createMutation.mutateAsync(data);
      }
    },
    [selectedCollection, updateMutation, createMutation]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
            <p className="text-muted-foreground mt-2">
              Organize your resources into themed collections
            </p>
          </div>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-lg border bg-card animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ResourceErrorBoundary>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
            <p className="text-muted-foreground mt-2">
              Organize your resources into themed collections
            </p>
          </div>

          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        </div>

        {/* Collections Grid */}
        {collections.length === 0 ? (
          <ResourceEmptyState
            variant="collection-empty"
            title="No collections yet"
            description="Create your first collection to organize your resources"
            action={
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create Collection
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Collection Dialog */}
        <CollectionDialog
          collection={selectedCollection}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSave}
        />
      </div>
    </ResourceErrorBoundary>
  );
}
