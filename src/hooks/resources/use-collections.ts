/**
 * useCollections Hook
 *
 * Custom hooks for fetching and managing resource collections
 * Consolidates TanStack Query logic for collections
 *
 * @module hooks/resources/use-collections
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import type { ResourceCollection } from '@/types/resources';

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
 * Hook for fetching resource collections
 *
 * @returns Query result with collections data
 *
 * @example
 * ```tsx
 * const { data: collections, isLoading } = useCollections();
 * ```
 */
export function useCollections() {
  return useQuery({
    queryKey: ['resource-collections'],
    queryFn: fetchCollections,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single collection with resources
 */
async function fetchCollection(id: string) {
  const res = await fetch(`/api/resources/collections/${id}`);

  if (!res.ok) {
    throw new Error('Failed to fetch collection');
  }

  const data = await res.json();
  return data.data.collection;
}

/**
 * Hook for fetching a single collection
 *
 * @param id - Collection ID
 * @returns Query result with collection data
 *
 * @example
 * ```tsx
 * const { data: collection, isLoading } = useCollection(collectionId);
 * ```
 */
export function useCollection(id: string) {
  return useQuery({
    queryKey: ['resource-collection', id],
    queryFn: () => fetchCollection(id),
    enabled: !!id,
  });
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
 * Hook for creating collections
 *
 * @returns Mutation object with create function
 *
 * @example
 * ```tsx
 * const createMutation = useCreateCollection();
 *
 * const handleCreate = async (data: { name: string; description?: string }) => {
 *   await createMutation.mutateAsync(data);
 * };
 * ```
 */
export function useCreateCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-collections'] });
      toast({
        title: 'Collection created',
        description: 'Your collection has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create collection',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
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
 * Hook for updating collections
 *
 * @returns Mutation object with update function
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateCollection();
 *
 * const handleUpdate = async (id: string, data: { name?: string }) => {
 *   await updateMutation.mutateAsync({ id, data });
 * };
 * ```
 */
export function useUpdateCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; icon?: string } }) =>
      updateCollection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-collections'] });
      toast({
        title: 'Collection updated',
        description: 'Your collection has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update collection',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
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
 * Hook for deleting collections
 *
 * @returns Mutation object with delete function
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteCollection();
 *
 * const handleDelete = async (collection: ResourceCollection) => {
 *   await deleteMutation.mutateAsync(collection.id);
 * };
 * ```
 */
export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
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
}
