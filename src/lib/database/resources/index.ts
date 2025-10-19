/**
 * Resource Library Database Module
 *
 * Re-exports all resource library database functions from their respective modules.
 *
 * @module lib/database/resources
 */

// Query operations
export {
  getCoachLibraryResources,
  getResourceById,
  getClientSharedResources,
  getOrCreateLibrarySettings,
  getCoachStorageUsage,
} from './queries';

// Sharing operations
export {
  shareResourceWithAllClients,
  getResourceShares,
} from './sharing';

// Collection operations
export {
  getCoachCollections,
  getCollectionWithResources,
  createCollection,
  addResourcesToCollection,
} from './collections';

// Analytics and progress tracking
export {
  trackResourceProgress,
  getResourceAnalytics,
  getLibraryAnalytics,
} from './analytics';

// Utility functions
export {
  mapFileUploadToResource,
  mapFileUploadsToResources,
  type FileUploadRow,
} from './utils';
