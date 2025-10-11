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

import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CollectionCard,
  CollectionDialog,
  ResourceEmptyState,
} from '@/components/resources';
import { ResourceErrorBoundary } from '@/components/resources/resource-error-boundary';
import type { ResourceCollection } from '@/types/resources';
import {
  useCollections,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
} from '@/hooks/resources';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

/**
 * CollectionsPage Component
 */
export default function CollectionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<ResourceCollection | null>(null);

  // Fetch collections
  const { data: collections = [], isLoading } = useCollections();

  // Mutations
  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const deleteMutation = useDeleteCollection();

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
        await updateMutation.mutateAsync({
          id: selectedCollection.id,
          data,
        });
        setDialogOpen(false);
        setSelectedCollection(null);
      } else {
        await createMutation.mutateAsync(data);
        setDialogOpen(false);
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
            <div key={i} className="h-48 rounded-lg border bg-card animate-pulse" />
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
