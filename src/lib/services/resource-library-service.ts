/**
 * Resource Library Service
 *
 * Business logic layer for resource library operations.
 * This service provides high-level methods for resource management,
 * collection handling, sharing workflows, and analytics.
 *
 * It integrates with the existing FileManagementService for file operations
 * and adds library-specific functionality on top.
 *
 * @module lib/services/resource-library-service
 */

import { createClient } from '@/lib/supabase/server';
import { getFileManagementService } from '@/lib/services/file-management-service';
import { Result } from '@/lib/types/result';
import type {
  ResourceLibraryItem,
  ResourceCollection,
  ResourceLibrarySettings,
  ResourceAnalytics,
  LibraryAnalytics,
  ResourceListParams,
  CreateResourceRequest,
  UpdateResourceRequest,
  ShareAllClientsRequest,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  StorageUsage,
  BulkShareResponse,
} from '@/types/resources';
import * as db from '@/lib/database/resources';

/**
 * Resource Library Service Class
 *
 * Provides methods for:
 * - Resource CRUD operations
 * - Collection management
 * - Sharing workflows (individual, bulk, auto-share)
 * - Analytics and reporting
 * - Progress tracking
 */
class ResourceLibraryService {
  // ============================================================================
  // Resource Operations
  // ============================================================================

  /**
   * Upload a new resource to the library
   *
   * @param file - File to upload
   * @param userId - Coach's user ID
   * @param metadata - Resource metadata (category, tags, description)
   * @returns Created resource or error
   */
  async uploadResource(
    file: File,
    userId: string,
    metadata: {
      category: string;
      tags: string[];
      description?: string;
      addToCollection?: string;
    }
  ): Promise<Result<ResourceLibraryItem>> {
    try {
      // Use existing file upload service
      const fileService = getFileManagementService();
      const uploadResult = await fileService.uploadFile(file, userId, {
        fileCategory: metadata.category as any,
        tags: metadata.tags,
        description: metadata.description,
      });

      if (!uploadResult.success) {
        return Result.error(uploadResult.error || 'File upload failed');
      }

      const fileId = uploadResult.data.id;

      // Mark as library resource
      const supabase = await createClient();
      const { error: updateError } = await supabase
        .from('file_uploads')
        .update({ is_library_resource: true })
        .eq('id', fileId);

      if (updateError) {
        return Result.error(`Failed to mark as library resource: ${updateError.message}`);
      }

      // Add to collection if specified
      if (metadata.addToCollection) {
        await db.addResourcesToCollection(metadata.addToCollection, [fileId]);
      }

      // Get the updated resource
      const resource = await db.getResourceById(fileId, userId);
      if (!resource) {
        return Result.error('Resource created but not found');
      }

      return Result.success(resource);
    } catch (error) {
      console.error('Resource upload error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Resource upload failed'
      );
    }
  }

  /**
   * Get library resources for a coach with filtering
   *
   * @param coachId - Coach's user ID
   * @param filters - Optional filters (category, tags, search, sort)
   * @returns Resources matching filters or error
   */
  async getResources(
    coachId: string,
    filters?: ResourceListParams
  ): Promise<Result<{ resources: ResourceLibraryItem[]; total: number }>> {
    try {
      const resources = await db.getCoachLibraryResources(coachId, filters);

      return Result.success({
        resources,
        total: resources.length, // TODO: Get actual total count for pagination
      });
    } catch (error) {
      console.error('Get resources error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get resources'
      );
    }
  }

  /**
   * Get a single resource by ID
   *
   * @param resourceId - Resource ID
   * @param userId - User ID (for permission check)
   * @returns Resource or error
   */
  async getResource(
    resourceId: string,
    userId: string
  ): Promise<Result<ResourceLibraryItem>> {
    try {
      const resource = await db.getResourceById(resourceId, userId);

      if (!resource) {
        return Result.error('Resource not found');
      }

      return Result.success(resource);
    } catch (error) {
      console.error('Get resource error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get resource'
      );
    }
  }

  /**
   * Update resource metadata
   *
   * @param resourceId - Resource ID
   * @param userId - User ID (must be owner)
   * @param updates - Metadata updates
   * @returns Updated resource or error
   */
  async updateResource(
    resourceId: string,
    userId: string,
    updates: UpdateResourceRequest
  ): Promise<Result<ResourceLibraryItem>> {
    try {
      const supabase = await createClient();

      // Verify ownership
      const resource = await db.getResourceById(resourceId, userId);
      if (!resource) {
        return Result.error('Resource not found');
      }

      if (resource.userId !== userId) {
        return Result.error('Access denied');
      }

      // Build update object
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.filename) {
        updateData.filename = updates.filename;
      }

      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }

      if (updates.category) {
        updateData.file_category = updates.category;
      }

      if (updates.tags) {
        updateData.tags = updates.tags;
      }

      const { error } = await supabase
        .from('file_uploads')
        .update(updateData)
        .eq('id', resourceId);

      if (error) {
        return Result.error(`Failed to update resource: ${error.message}`);
      }

      const updatedResource = await db.getResourceById(resourceId, userId);
      if (!updatedResource) {
        return Result.error('Resource updated but not found');
      }

      return Result.success(updatedResource);
    } catch (error) {
      console.error('Update resource error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to update resource'
      );
    }
  }

  /**
   * Delete a resource
   *
   * @param resourceId - Resource ID
   * @param userId - User ID (must be owner)
   * @returns Success or error
   */
  async deleteResource(
    resourceId: string,
    userId: string
  ): Promise<Result<void>> {
    try {
      // Verify ownership
      const resource = await db.getResourceById(resourceId, userId);
      if (!resource) {
        return Result.error('Resource not found');
      }

      if (resource.userId !== userId) {
        return Result.error('Access denied');
      }

      // Use file management service to delete (handles storage cleanup)
      const fileService = getFileManagementService();
      const deleteResult = await fileService.deleteFile(resourceId, userId);

      if (!deleteResult.success) {
        return Result.error(deleteResult.error || 'Failed to delete resource');
      }

      return Result.success(undefined);
    } catch (error) {
      console.error('Delete resource error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to delete resource'
      );
    }
  }

  // ============================================================================
  // Sharing Operations
  // ============================================================================

  /**
   * Share a resource with all current clients
   *
   * @param resourceId - Resource ID
   * @param coachId - Coach's user ID
   * @param request - Share configuration
   * @returns Share summary or error
   */
  async shareWithAllClients(
    resourceId: string,
    coachId: string,
    request: ShareAllClientsRequest
  ): Promise<Result<BulkShareResponse>> {
    try {
      // Verify ownership
      const resource = await db.getResourceById(resourceId, coachId);
      if (!resource) {
        return Result.error('Resource not found');
      }

      if (resource.userId !== coachId) {
        return Result.error('Access denied');
      }

      const expiresAt = request.expiresAt ? new Date(request.expiresAt) : undefined;

      const shares = await db.shareResourceWithAllClients(
        resourceId,
        coachId,
        request.permission,
        expiresAt
      );

      // TODO: Send notifications if message provided

      return Result.success({
        success: true,
        summary: {
          filesProcessed: 1,
          usersSharedWith: shares.length,
          sharesCreated: shares.length,
          sharesUpdated: 0, // TODO: Track upserts
        },
        shares,
      });
    } catch (error) {
      console.error('Share with all clients error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to share resource'
      );
    }
  }

  /**
   * Get all shares for a resource
   *
   * @param resourceId - Resource ID
   * @param userId - User ID (must be owner)
   * @returns Array of shares or error
   */
  async getResourceShares(
    resourceId: string,
    userId: string
  ): Promise<Result<any[]>> {
    try {
      // Verify ownership
      const resource = await db.getResourceById(resourceId, userId);
      if (!resource) {
        return Result.error('Resource not found');
      }

      if (resource.userId !== userId) {
        return Result.error('Access denied');
      }

      const shares = await db.getResourceShares(resourceId);

      return Result.success(shares);
    } catch (error) {
      console.error('Get resource shares error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get shares'
      );
    }
  }

  // ============================================================================
  // Collection Operations
  // ============================================================================

  /**
   * Get all collections for a coach
   *
   * @param coachId - Coach's user ID
   * @param includeArchived - Include archived collections
   * @returns Array of collections or error
   */
  async getCollections(
    coachId: string,
    includeArchived: boolean = false
  ): Promise<Result<ResourceCollection[]>> {
    try {
      const collections = await db.getCoachCollections(coachId, includeArchived);

      return Result.success(collections);
    } catch (error) {
      console.error('Get collections error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get collections'
      );
    }
  }

  /**
   * Get a collection with all its resources
   *
   * @param collectionId - Collection ID
   * @param coachId - Coach's user ID
   * @returns Collection with resources or error
   */
  async getCollection(
    collectionId: string,
    coachId: string
  ): Promise<Result<ResourceCollection & { resources: ResourceLibraryItem[] }>> {
    try {
      const collection = await db.getCollectionWithResources(collectionId, coachId);

      if (!collection) {
        return Result.error('Collection not found');
      }

      return Result.success(collection);
    } catch (error) {
      console.error('Get collection error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get collection'
      );
    }
  }

  /**
   * Create a new collection
   *
   * @param coachId - Coach's user ID
   * @param request - Collection data
   * @returns Created collection or error
   */
  async createCollection(
    coachId: string,
    request: CreateCollectionRequest
  ): Promise<Result<ResourceCollection>> {
    try {
      const collection = await db.createCollection(
        coachId,
        request.name,
        request.description,
        request.icon
      );

      // Add initial resources if provided
      if (request.resourceIds && request.resourceIds.length > 0) {
        await db.addResourcesToCollection(collection.id, request.resourceIds);
      }

      return Result.success(collection);
    } catch (error) {
      console.error('Create collection error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to create collection'
      );
    }
  }

  /**
   * Update a collection
   *
   * @param collectionId - Collection ID
   * @param coachId - Coach's user ID (for permission check)
   * @param request - Updates
   * @returns Updated collection or error
   */
  async updateCollection(
    collectionId: string,
    coachId: string,
    request: UpdateCollectionRequest
  ): Promise<Result<ResourceCollection>> {
    try {
      const supabase = await createClient();

      // Verify ownership
      const collection = await db.getCollectionWithResources(collectionId, coachId);
      if (!collection) {
        return Result.error('Collection not found');
      }

      // Build update object
      const updateData: any = {};

      if (request.name) {
        updateData.name = request.name;
      }

      if (request.description !== undefined) {
        updateData.description = request.description;
      }

      if (request.icon !== undefined) {
        updateData.icon = request.icon;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('resource_collections')
          .update(updateData)
          .eq('id', collectionId);

        if (error) {
          return Result.error(`Failed to update collection: ${error.message}`);
        }
      }

      // Handle resource reordering if provided
      if (request.resourceOrder && request.resourceOrder.length > 0) {
        // Update sort_order for each item
        const updates = request.resourceOrder.map((fileId, index) => ({
          collection_id: collectionId,
          file_id: fileId,
          sort_order: index,
        }));

        const { error } = await supabase
          .from('resource_collection_items')
          .upsert(updates, {
            onConflict: 'collection_id,file_id',
          });

        if (error) {
          return Result.error(`Failed to reorder resources: ${error.message}`);
        }
      }

      const updatedCollection = await db.getCollectionWithResources(collectionId, coachId);
      if (!updatedCollection) {
        return Result.error('Collection updated but not found');
      }

      return Result.success(updatedCollection);
    } catch (error) {
      console.error('Update collection error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to update collection'
      );
    }
  }

  /**
   * Delete a collection (resources remain, just unlinked)
   *
   * @param collectionId - Collection ID
   * @param coachId - Coach's user ID
   * @returns Success or error
   */
  async deleteCollection(
    collectionId: string,
    coachId: string
  ): Promise<Result<void>> {
    try {
      const supabase = await createClient();

      // Verify ownership
      const collection = await db.getCollectionWithResources(collectionId, coachId);
      if (!collection) {
        return Result.error('Collection not found');
      }

      const { error } = await supabase
        .from('resource_collections')
        .delete()
        .eq('id', collectionId);

      if (error) {
        return Result.error(`Failed to delete collection: ${error.message}`);
      }

      return Result.success(undefined);
    } catch (error) {
      console.error('Delete collection error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to delete collection'
      );
    }
  }

  /**
   * Add resources to a collection
   *
   * @param collectionId - Collection ID
   * @param coachId - Coach's user ID
   * @param resourceIds - Resource IDs to add
   * @returns Success or error
   */
  async addToCollection(
    collectionId: string,
    coachId: string,
    resourceIds: string[]
  ): Promise<Result<void>> {
    try {
      // Verify ownership
      const collection = await db.getCollectionWithResources(collectionId, coachId);
      if (!collection) {
        return Result.error('Collection not found');
      }

      await db.addResourcesToCollection(collectionId, resourceIds);

      return Result.success(undefined);
    } catch (error) {
      console.error('Add to collection error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to add resources to collection'
      );
    }
  }

  /**
   * Remove a resource from a collection
   *
   * @param collectionId - Collection ID
   * @param coachId - Coach's user ID
   * @param resourceId - Resource ID to remove
   * @returns Success or error
   */
  async removeFromCollection(
    collectionId: string,
    coachId: string,
    resourceId: string
  ): Promise<Result<void>> {
    try {
      const supabase = await createClient();

      // Verify ownership
      const collection = await db.getCollectionWithResources(collectionId, coachId);
      if (!collection) {
        return Result.error('Collection not found');
      }

      const { error } = await supabase
        .from('resource_collection_items')
        .delete()
        .eq('collection_id', collectionId)
        .eq('file_id', resourceId);

      if (error) {
        return Result.error(`Failed to remove resource: ${error.message}`);
      }

      return Result.success(undefined);
    } catch (error) {
      console.error('Remove from collection error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to remove resource from collection'
      );
    }
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Get analytics for a specific resource
   *
   * @param resourceId - Resource ID
   * @param coachId - Coach's user ID
   * @returns Resource analytics or error
   */
  async getResourceAnalytics(
    resourceId: string,
    coachId: string
  ): Promise<Result<ResourceAnalytics>> {
    try {
      const analytics = await db.getResourceAnalytics(resourceId, coachId);

      if (!analytics) {
        return Result.error('Resource not found');
      }

      return Result.success(analytics);
    } catch (error) {
      console.error('Get resource analytics error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get analytics'
      );
    }
  }

  /**
   * Get overall library analytics for a coach
   *
   * @param coachId - Coach's user ID
   * @returns Library analytics or error
   */
  async getLibraryAnalytics(
    coachId: string
  ): Promise<Result<LibraryAnalytics>> {
    try {
      const analytics = await db.getLibraryAnalytics(coachId);

      return Result.success(analytics);
    } catch (error) {
      console.error('Get library analytics error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get library analytics'
      );
    }
  }

  // ============================================================================
  // Settings & Utilities
  // ============================================================================

  /**
   * Get or create library settings for a coach
   *
   * @param coachId - Coach's user ID
   * @returns Library settings or error
   */
  async getSettings(
    coachId: string
  ): Promise<Result<ResourceLibrarySettings>> {
    try {
      const settings = await db.getOrCreateLibrarySettings(coachId);

      return Result.success(settings);
    } catch (error) {
      console.error('Get settings error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get settings'
      );
    }
  }

  /**
   * Update library settings
   *
   * @param coachId - Coach's user ID
   * @param updates - Settings updates
   * @returns Updated settings or error
   */
  async updateSettings(
    coachId: string,
    updates: Partial<ResourceLibrarySettings>
  ): Promise<Result<ResourceLibrarySettings>> {
    try {
      const supabase = await createClient();

      const updateData: any = {};

      if (updates.defaultPermission) {
        updateData.default_permission = updates.defaultPermission;
      }

      if (updates.autoShareNewClients !== undefined) {
        updateData.auto_share_new_clients = updates.autoShareNewClients;
      }

      if (updates.allowClientRequests !== undefined) {
        updateData.allow_client_requests = updates.allowClientRequests;
      }

      const { error } = await supabase
        .from('resource_library_settings')
        .update(updateData)
        .eq('coach_id', coachId);

      if (error) {
        return Result.error(`Failed to update settings: ${error.message}`);
      }

      const settings = await db.getOrCreateLibrarySettings(coachId);

      return Result.success(settings);
    } catch (error) {
      console.error('Update settings error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to update settings'
      );
    }
  }

  /**
   * Get storage usage for a coach
   *
   * @param coachId - Coach's user ID
   * @returns Storage usage or error
   */
  async getStorageUsage(
    coachId: string
  ): Promise<Result<StorageUsage>> {
    try {
      const usage = await db.getCoachStorageUsage(coachId);

      return Result.success(usage);
    } catch (error) {
      console.error('Get storage usage error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get storage usage'
      );
    }
  }
}

// ============================================================================
// Service Instance
// ============================================================================

let serviceInstance: ResourceLibraryService | null = null;

/**
 * Get singleton instance of ResourceLibraryService
 */
export function getResourceLibraryService(): ResourceLibraryService {
  if (!serviceInstance) {
    serviceInstance = new ResourceLibraryService();
  }
  return serviceInstance;
}

/**
 * Create new instance of ResourceLibraryService
 */
export function createResourceLibraryService(): ResourceLibraryService {
  return new ResourceLibraryService();
}

// Default export for convenience
export default getResourceLibraryService;
