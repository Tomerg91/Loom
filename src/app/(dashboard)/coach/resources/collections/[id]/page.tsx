/**
 * Collection Detail Page
 *
 * Page for viewing and managing a specific collection:
 * - View collection resources
 * - Add/remove resources
 * - Reorder resources with drag-and-drop
 * - Edit collection details
 *
 * @module app/(dashboard)/coach/resources/collections/[id]
 */

'use client';

import { use, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Edit, GripVertical, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResourceEmptyState, CollectionDialog } from '@/components/resources';
import { ResourceErrorBoundary } from '@/components/resources/resource-error-boundary';
import { useToast } from '@/components/ui/use-toast';
import type { ResourceLibraryItem, ResourceCollection } from '@/types/resources';
import { cn } from '@/lib/utils';

/**
 * Fetch collection with resources
 */
async function fetchCollection(id: string) {
  const res = await fetch(`/api/resources/collections/${id}`);

  if (!res.ok) {
    throw new Error('Failed to fetch collection');
  }

  const data = await res.json();
  return data.data.collection as ResourceCollection & { resources: ResourceLibraryItem[] };
}

/**
 * Update collection resource order
 */
async function updateCollectionOrder(id: string, resourceOrder: string[]) {
  const res = await fetch(`/api/resources/collections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceOrder }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update order');
  }

  return res.json();
}

/**
 * Sortable Resource Item
 */
function SortableResourceItem({
  resource,
  onRemove,
}: {
  resource: ResourceLibraryItem;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: resource.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border bg-card',
        isDragging && 'opacity-50'
      )}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{resource.filename}</p>
        <p className="text-xs text-muted-foreground">{resource.category}</p>
      </div>

      <Button variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}

/**
 * CollectionDetailPage Component
 */
export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [localResources, setLocalResources] = useState<ResourceLibraryItem[]>([]);

  // Fetch collection
  const { data: collection, isLoading } = useQuery({
    queryKey: ['resource-collection', resolvedParams.id],
    queryFn: () => fetchCollection(resolvedParams.id),
    onSuccess: (data) => {
      setLocalResources(data.resources || []);
    },
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: (resourceOrder: string[]) =>
      updateCollectionOrder(resolvedParams.id, resourceOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-collection', resolvedParams.id] });
      toast({
        title: 'Order updated',
        description: 'Resource order has been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setLocalResources((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);

          const newOrder = arrayMove(items, oldIndex, newIndex);

          // Save to server
          updateOrderMutation.mutate(newOrder.map((r) => r.id));

          return newOrder;
        });
      }
    },
    [updateOrderMutation]
  );

  if (isLoading) {
    return (
      <div className="container py-8 space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="container py-8">
        <ResourceEmptyState
          title="Collection not found"
          description="This collection doesn't exist or you don't have access to it"
          action={
            <Button onClick={() => router.push('/coach/resources/collections')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Collections
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <ResourceErrorBoundary>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/coach/resources/collections')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Collections
            </Button>

            <div className="flex items-center gap-3">
              <span className="text-4xl">{collection.icon || '📁'}</span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{collection.name}</h1>
                {collection.description && (
                  <p className="text-muted-foreground mt-1">{collection.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Resources
            </Button>
          </div>
        </div>

        {/* Resources List with Drag-and-Drop */}
        {localResources.length === 0 ? (
          <ResourceEmptyState
            variant="collection-empty"
            title="No resources in this collection"
            description="Add resources to organize them in this collection"
            action={
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Resources
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {localResources.length} resource{localResources.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Drag to reorder
              </p>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localResources.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {localResources.map((resource) => (
                    <SortableResourceItem
                      key={resource.id}
                      resource={resource}
                      onRemove={() => {
                        // Remove from collection logic
                        toast({
                          title: 'Feature coming soon',
                          description: 'Resource removal will be implemented in the next update.',
                        });
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Edit Dialog */}
        <CollectionDialog
          collection={collection}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={async (_data) => {
            // Update collection logic
            toast({
              title: 'Feature coming soon',
              description: 'Collection editing will be fully implemented soon.',
            });
            setEditDialogOpen(false);
          }}
        />
      </div>
    </ResourceErrorBoundary>
  );
}
