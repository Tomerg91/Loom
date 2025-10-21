/**
 * Resource Collection Operations
 *
 * This module provides functions for managing resource collections.
 * Includes creating collections, adding resources, and organizing content.
 *
 * @module lib/database/resources/collections
 */

import { createClient } from '@/lib/supabase/server';
import type {
  ResourceCollection,
  ResourceCollectionItem,
  ResourceLibraryItem,
} from '@/types/resources';

import { mapFileUploadToResource } from './utils';

/**
 * Get all collections for a coach
 *
 * @param coachId - Coach's user ID
 * @param includeArchived - Whether to include archived collections
 * @returns Array of collections with resource counts
 */
export async function getCoachCollections(
  coachId: string,
  includeArchived: boolean = false
): Promise<ResourceCollection[]> {
  const supabase = await createClient();

  let query = supabase
    .from('resource_collections')
    .select(
      `
      *,
      resource_collection_items(count)
    `
    )
    .eq('coach_id', coachId);

  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  query = query.order('sort_order', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch collections: ${error.message}`);
  }

  return (data || []).map(collection => ({
    id: collection.id,
    coachId: collection.coach_id,
    name: collection.name,
    description: collection.description,
    icon: collection.icon,
    sortOrder: collection.sort_order,
    isArchived: collection.is_archived,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
    itemCount: collection.resource_collection_items?.[0]?.count || 0,
  }));
}

/**
 * Get a collection with all its resources
 *
 * @param collectionId - Collection ID
 * @param coachId - Coach ID (for permission check)
 * @returns Collection with resources or null
 */
export async function getCollectionWithResources(
  collectionId: string,
  coachId: string
): Promise<(ResourceCollection & { resources: ResourceLibraryItem[] }) | null> {
  const supabase = await createClient();

  // Get collection
  const { data: collection, error: collectionError } = await supabase
    .from('resource_collections')
    .select('*')
    .eq('id', collectionId)
    .eq('coach_id', coachId)
    .single();

  if (collectionError || !collection) {
    return null;
  }

  // Get collection items with file details
  const { data: items, error: itemsError } = await supabase
    .from('resource_collection_items')
    .select(
      `
      *,
      file_uploads!resource_collection_items_file_id_fkey(*)
    `
    )
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to fetch collection items: ${itemsError.message}`);
  }

  const resources =
    items
      ?.filter(item => item.file_uploads)
      .map(item => mapFileUploadToResource(item.file_uploads)) || [];

  return {
    id: collection.id,
    coachId: collection.coach_id,
    name: collection.name,
    description: collection.description,
    icon: collection.icon,
    sortOrder: collection.sort_order,
    isArchived: collection.is_archived,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
    resources,
    itemCount: resources.length,
  };
}

/**
 * Create a new collection
 *
 * @param coachId - Coach creating the collection
 * @param name - Collection name
 * @param description - Optional description
 * @param icon - Optional icon/emoji
 * @returns Created collection
 */
export async function createCollection(
  coachId: string,
  name: string,
  description?: string,
  icon?: string
): Promise<ResourceCollection> {
  const supabase = await createClient();

  // Get max sort_order for this coach
  const { data: existing } = await supabase
    .from('resource_collections')
    .select('sort_order')
    .eq('coach_id', coachId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('resource_collections')
    .insert({
      coach_id: coachId,
      name,
      description: description || null,
      icon: icon || null,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create collection: ${error.message}`);
  }

  return {
    id: data.id,
    coachId: data.coach_id,
    name: data.name,
    description: data.description,
    icon: data.icon,
    sortOrder: data.sort_order,
    isArchived: data.is_archived,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    itemCount: 0,
  };
}

/**
 * Add resources to a collection
 *
 * @param collectionId - Collection ID
 * @param resourceIds - Array of resource IDs to add
 * @returns Created collection items
 */
export async function addResourcesToCollection(
  collectionId: string,
  resourceIds: string[]
): Promise<ResourceCollectionItem[]> {
  const supabase = await createClient();

  // Get max sort_order in this collection
  const { data: existing } = await supabase
    .from('resource_collection_items')
    .select('sort_order')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: false })
    .limit(1);

  let nextSortOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const items = resourceIds.map(fileId => ({
    collection_id: collectionId,
    file_id: fileId,
    sort_order: nextSortOrder++,
  }));

  const { data, error } = await supabase
    .from('resource_collection_items')
    .insert(items)
    .select();

  if (error) {
    // Log RLS policy violations for debugging
    if (error.code === 'PGRST301' || error.message.includes('policy')) {
      console.error('[RLS Policy Violation] Failed to add resources to collection:', {
        collectionId,
        resourceIds,
        error: error.message,
        code: error.code,
      });
    }
    throw new Error(`Failed to add resources to collection: ${error.message}`);
  }

  return (data || []).map(item => ({
    id: item.id,
    collectionId: item.collection_id,
    fileId: item.file_id,
    sortOrder: item.sort_order,
    createdAt: item.created_at,
  }));
}
