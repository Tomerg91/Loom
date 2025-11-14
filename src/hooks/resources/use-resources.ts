/**
 * useResources Hook
 *
 * Custom hook for fetching and managing resource library items
 * Consolidates TanStack Query logic for resources
 *
 * @module hooks/resources/use-resources
 */

import { useQuery } from '@tanstack/react-query';

import type {
  ResourceLibraryItem,
  ResourceListParams,
  PaginationMetadata,
} from '@/types/resources';

/**
 * Response type for resources API
 */
interface ResourcesResponse {
  resources: ResourceLibraryItem[];
  total: number;
  pagination?: PaginationMetadata;
}

/**
 * Fetch resources from API
 */
async function fetchResources(
  filters: Partial<ResourceListParams>
): Promise<ResourcesResponse> {
  const params = new URLSearchParams();

  if (filters.category) params.set('category', filters.category);
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  if (filters.search) params.set('search', filters.search);
  if (filters.page !== undefined) params.set('page', filters.page.toString());
  if (filters.limit !== undefined) params.set('limit', filters.limit.toString());
  if (filters.offset !== undefined)
    params.set('offset', filters.offset.toString());
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

  const res = await fetch(`/api/resources?${params.toString()}`);

  if (!res.ok) {
    throw new Error('Failed to fetch resources');
  }

  const data = await res.json();
  return {
    resources: data.data.resources,
    total: data.data.total,
    pagination: data.data.pagination,
  };
}

/**
 * Hook for fetching resources with filters
 *
 * @param filters - Query filters for resources
 * @returns Query result with resources data
 *
 * @example
 * ```tsx
 * const { data: resources, isLoading, error } = useResources({
 *   category: 'document',
 *   tags: ['onboarding'],
 *   search: 'guide'
 * });
 * ```
 */
export function useResources(filters: Partial<ResourceListParams> = {}) {
  return useQuery({
    queryKey: ['resources', filters],
    queryFn: () => fetchResources(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch client shared resources
 */
async function fetchClientResources(
  filters: Partial<ResourceListParams>
): Promise<ResourcesResponse> {
  const params = new URLSearchParams();

  if (filters.category) params.set('category', filters.category);
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  if (filters.search) params.set('search', filters.search);
  if (filters.page !== undefined) params.set('page', filters.page.toString());
  if (filters.limit !== undefined) params.set('limit', filters.limit.toString());
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters.coachId) params.set('coach', filters.coachId);

  const res = await fetch(`/api/resources/client?${params.toString()}`);

  if (!res.ok) {
    throw new Error('Failed to fetch shared resources');
  }

  const data = await res.json();
  return {
    resources: data.data.resources,
    total: data.data.total,
    pagination: data.data.pagination,
  };
}

/**
 * Hook for fetching resources shared with client
 *
 * @param filters - Query filters for resources
 * @returns Query result with shared resources data
 *
 * @example
 * ```tsx
 * const { data: resources, isLoading } = useClientResources({
 *   category: 'video',
 *   search: 'tutorial'
 * });
 * ```
 */
export function useClientResources(filters: Partial<ResourceListParams> = {}) {
  return useQuery({
    queryKey: ['client-resources', filters],
    queryFn: () => fetchClientResources(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Extract unique tags from resources
 *
 * @param resources - Array of resources
 * @returns Sorted array of unique tags
 */
export function extractUniqueTags(resources: ResourceLibraryItem[]): string[] {
  return Array.from(new Set(resources.flatMap(r => r.tags))).sort();
}
