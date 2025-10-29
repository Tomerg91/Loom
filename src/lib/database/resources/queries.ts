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

import {
  mapFileUploadToResource,
  mapFileUploadsToResources,
  type FileUploadRow,
} from './utils';

/**
 * Get library resources for a coach with optional filtering
 *
 * @param coachId - Coach's user ID
 * @param filters - Optional filters (category, tags, search)
 * @returns Array of resources matching filters
 */
export async function getCoachLibraryResources(
  coachId: string,
  filters?: ResourceListParams
): Promise<ResourceLibraryItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from('file_uploads')
    .select('*')
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

  // Apply pagination
  if (filters?.limit) {
    const offset = filters.offset || 0;
    query = query.range(offset, offset + filters.limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    // Log RLS policy violations for debugging
    if (error.code === 'PGRST301' || error.message.includes('policy')) {
      console.error(
        '[RLS Policy Violation] Failed to fetch library resources:',
        {
          coachId,
          filters,
          error: error.message,
          code: error.code,
        }
      );
    }
    throw new Error(`Failed to fetch library resources: ${error.message}`);
  }

  return mapFileUploadsToResources(data || []);
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
type FileShareRow = {
  file_id: string;
  permission_type: ClientResourceItem['permission'];
  expires_at: string | null;
  file_uploads:
    | (FileUploadRow & {
        users?: {
          first_name: string | null;
          last_name: string | null;
          user_metadata?: { role?: string } | null;
        } | null;
      })
    | null;
};

type ProgressRow = {
  file_id: string;
  viewed_at: string | null;
  completed_at: string | null;
};

export async function getClientSharedResources(
  clientId: string,
  filters?: ResourceListParams
): Promise<ClientResourceItem[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from('file_shares')
    .select(
      `
        file_id,
        permission_type,
        expires_at,
        file_uploads:file_uploads!inner(
          id,
          user_id,
          filename,
          original_filename,
          file_type,
          file_size,
          storage_path,
          bucket_name,
          is_library_resource,
          is_public,
          shared_with_all_clients,
          file_category,
          tags,
          description,
          view_count,
          download_count,
          completion_count,
          created_at,
          updated_at,
          users:users!file_uploads_user_id_fkey(first_name, last_name, user_metadata)
        )
      `
    )
    .eq('shared_with', clientId)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .eq('file_uploads.is_library_resource', true);

  if (filters?.coachId) {
    query = query.eq('file_uploads.user_id', filters.coachId);
  }

  if (filters?.category) {
    const normalizedCategory = normalizeResourceCategory(filters.category);
    const synonyms = getResourceCategorySynonyms(normalizedCategory);
    query = query.in('file_uploads.file_category', synonyms);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('file_uploads.tags', filters.tags);
  }

  if (filters?.search) {
    const searchTerm = filters.search.trim();
    if (searchTerm) {
      query = query.or(
        `filename.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
        { foreignTable: 'file_uploads' }
      );
    }
  }

  const sortBy = filters?.sortBy || 'created_at';
  const sortOrder = filters?.sortOrder === 'asc' ? 'asc' : 'desc';
  const fileUploadSortColumns = new Set([
    'filename',
    'original_filename',
    'file_type',
    'file_size',
    'view_count',
    'download_count',
    'completion_count',
    'created_at',
    'updated_at',
  ]);
  const orderOptions: { ascending: boolean; foreignTable?: string } = {
    ascending: sortOrder === 'asc',
  };

  if (fileUploadSortColumns.has(sortBy)) {
    orderOptions.foreignTable = 'file_uploads';
  }

  query = query.order(sortBy, orderOptions);

  if (filters?.limit) {
    const offset = filters.offset || 0;
    query = query.range(offset, offset + filters.limit - 1);
  }

  const { data: shares, error } = await query;

  if (error) {
    if (error.code === 'PGRST301' || error.message.includes('policy')) {
      console.error(
        '[RLS Policy Violation] Failed to fetch shared resources:',
        {
          clientId,
          error: error.message,
          code: error.code,
        }
      );
    }
    throw new Error(`Failed to fetch shared resources: ${error.message}`);
  }

  if (!shares || shares.length === 0) {
    return [];
  }

  const typedShares = shares as unknown as FileShareRow[];
  const resourceIds = typedShares
    .map(share => share.file_uploads?.id)
    .filter((id): id is string => Boolean(id));

  let progressMap = new Map<string, ProgressRow>();
  if (resourceIds.length > 0) {
    const { data: progressData, error: progressError } = await supabase
      .from('resource_client_progress')
      .select('file_id, viewed_at, completed_at')
      .eq('client_id', clientId)
      .in('file_id', resourceIds);

    if (progressError) {
      console.error('[Resource Progress] Failed to load client progress', {
        clientId,
        error: progressError.message,
      });
    }

    progressMap = new Map((progressData || []).map(row => [row.file_id, row]));
  }

  return typedShares
    .filter(share => share.file_uploads)
    .map(share => {
      const file = share.file_uploads as FileUploadRow & {
        users?: {
          first_name: string | null;
          last_name: string | null;
          user_metadata?: { role?: string } | null;
        } | null;
      };
      const owner = file.users;
      const progress = progressMap.get(file.id);

      return {
        ...mapFileUploadToResource(file),
        sharedBy: {
          id: file.user_id,
          name: owner
            ? `${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim() ||
              'Coach'
            : 'Coach',
          role:
            (owner?.user_metadata?.role as 'coach' | 'admin' | undefined) ||
            'coach',
        },
        permission: share.permission_type,
        expiresAt: share.expires_at,
        progress: progress
          ? {
              viewed: Boolean(progress.viewed_at),
              completed: Boolean(progress.completed_at),
              viewedAt: progress.viewed_at,
              completedAt: progress.completed_at,
            }
          : undefined,
      } satisfies ClientResourceItem;
    });
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
