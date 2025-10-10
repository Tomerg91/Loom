/**
 * Resource Hooks - Barrel Exports
 *
 * Centralized exports for all resource-related hooks
 *
 * @module hooks/resources
 */

// Resource hooks
export {
  useResources,
  useClientResources,
  extractUniqueTags,
} from './use-resources';

// Resource mutation hooks
export {
  useUploadResource,
  useDeleteResource,
  useShareResource,
} from './use-resource-mutations';

// Collection hooks
export {
  useCollections,
  useCollection,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
} from './use-collections';
