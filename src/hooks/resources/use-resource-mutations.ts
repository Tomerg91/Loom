/**
 * useResourceMutations Hook
 *
 * Custom hooks for resource mutations (upload, update, delete, share)
 * Consolidates mutation logic and cache invalidation
 *
 * @module hooks/resources/use-resource-mutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import type { ResourceLibraryItem } from '@/types/resources';

/**
 * Upload resource metadata type
 */
interface UploadMetadata {
  category: string;
  tags?: string;
  description?: string;
  collectionId?: string;
}

/**
 * Upload resource to API
 */
async function uploadResource(file: File, metadata: UploadMetadata) {
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
 * Hook for uploading resources
 *
 * @returns Mutation object with upload function
 *
 * @example
 * ```tsx
 * const uploadMutation = useUploadResource();
 *
 * const handleUpload = async (file: File, metadata: UploadMetadata) => {
 *   await uploadMutation.mutateAsync({ file, metadata });
 * };
 * ```
 */
export function useUploadResource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata: UploadMetadata }) =>
      uploadResource(file, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({
        title: 'Resource uploaded',
        description: 'Your resource has been added to the library.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete resource from API
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
 * Hook for deleting resources with optimistic updates
 *
 * @returns Mutation object with delete function
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteResource();
 *
 * const handleDelete = (resource: ResourceLibraryItem) => {
 *   deleteMutation.mutate(resource.id);
 * };
 * ```
 */
export function useDeleteResource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteResource,
    // Optimistic update
    onMutate: async (resourceId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['resources'] });

      // Snapshot previous value
      const previousResources = queryClient.getQueryData(['resources']);

      // Optimistically remove resource
      queryClient.setQueriesData(
        { queryKey: ['resources'] },
        (old: ResourceLibraryItem[] | undefined) =>
          old?.filter((r) => r.id !== resourceId) ?? []
      );

      return { previousResources };
    },
    onSuccess: () => {
      toast({
        title: 'Resource deleted',
        description: 'The resource has been removed from your library.',
      });
    },
    onError: (error: Error, _resourceId, context) => {
      // Rollback on error
      if (context?.previousResources) {
        queryClient.setQueryData(['resources'], context.previousResources);
      }
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

/**
 * Share data type
 */
interface ShareData {
  permission: string;
  expiresAt?: Date;
  message?: string;
}

/**
 * Share resource with all clients
 */
async function shareResourceWithAllClients(resourceId: string, data: ShareData) {
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
 * Hook for sharing resources with all clients
 *
 * @returns Mutation object with share function
 *
 * @example
 * ```tsx
 * const shareMutation = useShareResource();
 *
 * const handleShare = async (resourceId: string, data: ShareData) => {
 *   await shareMutation.mutateAsync({ resourceId, data });
 * };
 * ```
 */
export function useShareResource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ resourceId, data }: { resourceId: string; data: ShareData }) =>
      shareResourceWithAllClients(resourceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({
        title: 'Resource shared',
        description: 'Your resource has been shared with all clients.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Share failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
