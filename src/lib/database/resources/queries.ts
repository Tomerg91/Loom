/**
 * Resource Library Query Functions
 *
 * This module provides core query operations for resource library management.
 * Includes fetching resources for coaches and clients, storage usage, and settings.
 *
 * @module lib/database/resources/queries
 */

import { createClient } from '@/lib/supabase/server';
import type {
  ResourceLibraryItem,
  ResourceLibrarySettings,
  ClientResourceItem,
  ResourceListParams,
  StorageUsage,
} from '@/types/resources';
import {
  getResourceCategorySynonyms,
  normalizeResourceCategory,
} from '@/types/resources';

import { mapFileUploadToResource, mapFileUploadsToResources } from './utils';

/**
 * Get library resources for a coach with optional filtering
 *
 * @param coachId - Coach's user ID
 * @param filters - Optional filters (category, tags, search)
 * @returns Object with resources array and total count
 */
export async function getCoachLibraryResources(
  coachId: string,
  filters?: ResourceListParams
): Promise<{ resources: ResourceLibraryItem[]; count: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('file_uploads')
    .select('*', { count: 'exact' })
    .eq('user_id', coachId)
    .eq('is_library_resource', true);

  // Apply category filter
  if (filters?.category) {
    const normalizedCategory = normalizeResourceCategory(filters.category);
    const synonyms = getResourceCategorySynonyms(normalizedCategory);
    query = query.in('file_category', synonyms);
  }

  // Apply tags filter (overlaps = has any of the specified tags)
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  // Apply search filter (filename or description)
  if (filters?.search) {
    query = query.or(
      `filename.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  // Apply sorting
  const sortBy = filters?.sortBy || 'created_at';
  const sortOrder = filters?.sortOrder || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination - support both page-based and offset-based
  if (filters?.page && filters?.limit) {
    const offset = (filters.page - 1) * filters.limit;
    query = query.range(offset, offset + filters.limit - 1);
  } else if (filters?.limit) {
    const offset = filters.offset || 0;
    query = query.range(offset, offset + filters.limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    // Log RLS policy violations for debugging
    if (error.code === 'PGRST301' || error.message.includes('policy')) {
      console.error('[RLS Policy Violation] Failed to fetch library resources:', {
        coachId,
        filters,
        error: error.message,
        code: error.code,
      });
    }
    throw new Error(`Failed to fetch library resources: ${error.message}`);
  }

  return {
    resources: mapFileUploadsToResources(data || []),
    count: count || 0,
  };
}

/**
 * Get a single resource by ID
 *
 * @param resourceId - Resource ID
 * @param userId - User ID (for permission check)
 * @returns Resource or null if not found
 */
export async function getResourceById(
  resourceId: string,
  userId?: string
): Promise<ResourceLibraryItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('file_uploads')
    .select('*')
    .eq('id', resourceId)
    .eq('is_library_resource', true)
    .single();

  if (error || !data) {
    return null;
  }

  // Check permissions if userId provided
  if (userId && data.user_id !== userId) {
    // Check if resource is shared with user
    const { data: share } = await supabase
      .from('file_shares')
      .select('*')
      .eq('file_id', resourceId)
      .eq('shared_with', userId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .single();

    if (!share) {
      throw new Error('Access denied');
    }
  }

  const resources = mapFileUploadsToResources([data]);
  return resources[0] || null;
}

/**
 * Get resources shared with a client
 *
 * @param clientId - Client's user ID
 * @param filters - Optional filters
 * @returns Array of shared resources with share metadata
 */
export async function getClientSharedResources(
  clientId: string,
  filters?: ResourceListParams
): Promise<ClientResourceItem[]> {
  const supabase = await createClient();

  // Get file shares for this client
  const sharesQuery = supabase
    .from('file_shares')
    .select(
      `
      *,
      file_uploads!file_shares_file_id_fkey(
        *,
        users!file_uploads_user_id_fkey(first_name, last_name, user_metadata)
      )
    `
    )
    .eq('shared_with', clientId)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  const { data: shares, error } = await sharesQuery;

  if (error) {
    // Log RLS policy violations for debugging
    if (error.code === 'PGRST301' || error.message.includes('policy')) {
      console.error('[RLS Policy Violation] Failed to fetch shared resources:', {
        clientId,
        error: error.message,
        code: error.code,
      });
    }
    throw new Error(`Failed to fetch shared resources: ${error.message}`);
  }

  if (!shares || shares.length === 0) {
    return [];
  }

  // Get progress for all shared resources
  const resourceIds = shares.map(s => s.file_id);
  const { data: progressData } = await supabase
    .from('resource_client_progress')
    .select('*')
    .eq('client_id', clientId)
    .in('file_id', resourceIds);

  const progressMap = new Map(progressData?.map(p => [p.file_id, p]) || []);

  // Map to ClientResourceItem
  let resources: ClientResourceItem[] = shares
    .filter(
      share => share.file_uploads && share.file_uploads.is_library_resource
    )
    .map(share => {
      const file = share.file_uploads;
      const user = file.users;
      const progress = progressMap.get(file.id);

      return {
        ...mapFileUploadToResource(file),
        sharedBy: {
          id: file.user_id,
          name: user
            ? `${user.first_name} ${user.last_name || ''}`.trim()
            : 'Coach',
          role: user?.user_metadata?.role || 'coach',
        },
        permission: share.permission_type,
        expiresAt: share.expires_at,
        progress: progress
          ? {
              viewed: !!progress.viewed_at,
              completed: !!progress.completed_at,
              viewedAt: progress.viewed_at,
              completedAt: progress.completed_at,
            }
          : undefined,
      };
    });

  // Apply filters
  if (filters?.category) {
    const normalizedCategory = normalizeResourceCategory(filters.category);
    resources = resources.filter(r => r.category === normalizedCategory);
  }

  if (filters?.tags && filters.tags.length > 0) {
    resources = resources.filter(r =>
      r.tags.some(tag => filters.tags!.includes(tag))
    );
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    resources = resources.filter(
      r =>
        r.filename.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
    );
  }

  // Apply sorting
  const sortBy = filters?.sortBy || 'created_at';
  const sortOrder = filters?.sortOrder || 'desc';
  resources.sort((a, b) => {
    const key = sortBy as keyof ClientResourceItem;
    const aVal = a[key];
    const bVal = b[key];

    if (aVal == null && bVal == null) {
      return 0;
    }

    if (aVal == null) {
      return sortOrder === 'asc' ? 1 : -1;
    }

    if (bVal == null) {
      return sortOrder === 'asc' ? -1 : 1;
    }

    const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return resources;
}

/**
 * Get or create library settings for a coach
 *
 * @param coachId - Coach ID
 * @returns Library settings
 */
export async function getOrCreateLibrarySettings(
  coachId: string
): Promise<ResourceLibrarySettings> {
  const supabase = await createClient();

  // Try to get existing settings
  const { data: initialSettings, error } = await supabase
    .from('resource_library_settings')
    .select('*')
    .eq('coach_id', coachId)
    .single();

  let settings = initialSettings;

  // Create default settings if none exist
  if (error || !settings) {
    const { data: newSettings, error: createError } = await supabase
      .from('resource_library_settings')
      .insert({
        coach_id: coachId,
        default_permission: 'download',
        auto_share_new_clients: false,
        storage_limit_mb: 1000,
        allow_client_requests: true,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(
        `Failed to create library settings: ${createError.message}`
      );
    }

    settings = newSettings;
  }

  return {
    coachId: settings.coach_id,
    defaultPermission: settings.default_permission,
    autoShareNewClients: settings.auto_share_new_clients,
    storageLimitMb: settings.storage_limit_mb,
    allowClientRequests: settings.allow_client_requests,
    createdAt: settings.created_at,
    updatedAt: settings.updated_at,
  };
}

/**
 * Get storage usage for a coach
 *
 * @param coachId - Coach ID
 * @returns Storage usage summary
 */
export async function getCoachStorageUsage(
  coachId: string
): Promise<StorageUsage> {
  const supabase = await createClient();

  const { data } = await supabase.rpc('get_user_storage_usage', {
    user_uuid: coachId,
  });

  const settings = await getOrCreateLibrarySettings(coachId);
  const totalSizeMb = data?.[0]?.total_size_mb || 0;
  const limitMb = settings.storageLimitMb;
  const percentageUsed = Math.round((totalSizeMb / limitMb) * 100);

  return {
    totalFiles: data?.[0]?.total_files || 0,
    totalSizeBytes: data?.[0]?.total_size_bytes || 0,
    totalSizeMb,
    limitMb,
    percentageUsed,
    remainingMb: Math.max(0, limitMb - totalSizeMb),
  };
}
