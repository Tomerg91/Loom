/**
 * Resource Library Database Query Functions
 *
 * This module provides database query functions for resource library operations.
 * All functions use Supabase client and return properly typed results.
 *
 * Key Functions:
 * - Resource CRUD operations
 * - Collection management
 * - Sharing workflows (individual, bulk, auto-share)
 * - Analytics aggregations
 * - Progress tracking
 *
 * @module lib/database/resources
 */

import { createClient } from '@/lib/supabase/server';
import type {
  ResourceLibraryItem,
  ResourceCollection,
  ResourceCollectionItem,
  ResourceLibrarySettings,
  ResourceClientProgress,
  ResourceAnalytics,
  LibraryAnalytics,
  ResourceListParams,
  ResourceShare,
  ClientResourceItem,
  StorageUsage,
  ResourceCategory,
} from '@/types/resources';

// ============================================================================
// Resource Queries
// ============================================================================

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
    query = query.eq('file_category', filters.category);
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
export async function getClientSharedResources(
  clientId: string,
  filters?: ResourceListParams
): Promise<ClientResourceItem[]> {
  const supabase = await createClient();

  // Get file shares for this client
  let sharesQuery = supabase
    .from('file_shares')
    .select(`
      *,
      file_uploads!file_shares_file_id_fkey(
        *,
        users!file_uploads_user_id_fkey(first_name, last_name, user_metadata)
      )
    `)
    .eq('shared_with', clientId)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  const { data: shares, error } = await sharesQuery;

  if (error) {
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

  const progressMap = new Map(
    progressData?.map(p => [p.file_id, p]) || []
  );

  // Map to ClientResourceItem
  let resources: ClientResourceItem[] = shares
    .filter(share => share.file_uploads && share.file_uploads.is_library_resource)
    .map(share => {
      const file = share.file_uploads;
      const user = file.users;
      const progress = progressMap.get(file.id);

      return {
        ...mapFileUploadToResource(file),
        sharedBy: {
          id: file.user_id,
          name: user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Coach',
          role: user?.user_metadata?.role || 'coach',
        },
        permission: share.permission_type,
        expiresAt: share.expires_at,
        progress: progress ? {
          viewed: !!progress.viewed_at,
          completed: !!progress.completed_at,
          viewedAt: progress.viewed_at,
          completedAt: progress.completed_at,
        } : undefined,
      };
    });

  // Apply filters
  if (filters?.category) {
    resources = resources.filter(r => r.category === filters.category);
  }

  if (filters?.tags && filters.tags.length > 0) {
    resources = resources.filter(r =>
      r.tags.some(tag => filters.tags!.includes(tag))
    );
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    resources = resources.filter(r =>
      r.filename.toLowerCase().includes(searchLower) ||
      r.description?.toLowerCase().includes(searchLower)
    );
  }

  // Apply sorting
  const sortBy = filters?.sortBy || 'created_at';
  const sortOrder = filters?.sortOrder || 'desc';
  resources.sort((a, b) => {
    const aVal = a[sortBy as keyof ClientResourceItem];
    const bVal = b[sortBy as keyof ClientResourceItem];
    const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return resources;
}

// ============================================================================
// Sharing Operations
// ============================================================================

/**
 * Share a resource with all current clients of a coach
 *
 * @param resourceId - Resource to share
 * @param coachId - Coach sharing the resource
 * @param permission - Permission level
 * @param expiresAt - Optional expiration date
 * @returns Array of created/updated shares
 */
export async function shareResourceWithAllClients(
  resourceId: string,
  coachId: string,
  permission: 'view' | 'download' | 'edit',
  expiresAt?: Date
): Promise<ResourceShare[]> {
  const supabase = await createClient();

  // Get all unique clients coached by this coach (via sessions)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('client_id')
    .eq('coach_id', coachId)
    .not('client_id', 'is', null);

  if (!sessions || sessions.length === 0) {
    return [];
  }

  const uniqueClientIds = [...new Set(sessions.map(s => s.client_id).filter(Boolean))];

  // Create share records for each client
  const shares = uniqueClientIds.map(clientId => ({
    file_id: resourceId,
    shared_by: coachId,
    shared_with: clientId,
    permission_type: permission,
    expires_at: expiresAt?.toISOString() || null,
  }));

  const { data, error } = await supabase
    .from('file_shares')
    .upsert(shares, {
      onConflict: 'file_id,shared_by,shared_with',
    })
    .select();

  if (error) {
    throw new Error(`Failed to share resource: ${error.message}`);
  }

  // Mark resource as shared with all clients
  await supabase
    .from('file_uploads')
    .update({
      shared_with_all_clients: true,
      is_shared: true
    })
    .eq('id', resourceId);

  return data || [];
}

/**
 * Get all shares for a resource
 *
 * @param resourceId - Resource ID
 * @returns Array of shares
 */
export async function getResourceShares(resourceId: string): Promise<ResourceShare[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('file_shares')
    .select(`
      *,
      users!file_shares_shared_with_fkey(id, first_name, last_name, email)
    `)
    .eq('file_id', resourceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch resource shares: ${error.message}`);
  }

  return (data || []).map(share => ({
    id: share.id,
    fileId: share.file_id,
    sharedBy: share.shared_by,
    sharedWith: share.shared_with,
    permissionType: share.permission_type,
    expiresAt: share.expires_at,
    accessCount: share.access_count,
    lastAccessedAt: share.last_accessed_at,
    createdAt: share.created_at,
    sharedWithUser: share.users ? {
      id: share.users.id,
      name: `${share.users.first_name} ${share.users.last_name || ''}`.trim(),
      email: share.users.email,
    } : undefined,
  }));
}

// ============================================================================
// Collection Operations
// ============================================================================

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
    .select(`
      *,
      resource_collection_items(count)
    `)
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
    .select(`
      *,
      file_uploads!resource_collection_items_file_id_fkey(*)
    `)
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to fetch collection items: ${itemsError.message}`);
  }

  const resources = items
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

  const nextSortOrder = existing && existing.length > 0
    ? existing[0].sort_order + 1
    : 0;

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

  let nextSortOrder = existing && existing.length > 0
    ? existing[0].sort_order + 1
    : 0;

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

// ============================================================================
// Progress Tracking
// ============================================================================

/**
 * Track client progress on a resource
 *
 * @param resourceId - Resource ID
 * @param clientId - Client ID
 * @param action - Action taken (viewed, completed, accessed)
 */
export async function trackResourceProgress(
  resourceId: string,
  clientId: string,
  action: 'viewed' | 'completed' | 'accessed'
): Promise<void> {
  const supabase = await createClient();

  const now = new Date().toISOString();
  const updates: any = {
    last_accessed_at: now,
  };

  if (action === 'viewed') {
    updates.viewed_at = now;
  } else if (action === 'completed') {
    updates.completed_at = now;
  }

  // Upsert progress record
  const { error } = await supabase
    .from('resource_client_progress')
    .upsert({
      file_id: resourceId,
      client_id: clientId,
      ...updates,
      access_count: 1, // Will be incremented by trigger
    }, {
      onConflict: 'file_id,client_id',
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Failed to track progress: ${error.message}`);
  }

  // Increment view count on resource
  if (action === 'viewed' || action === 'accessed') {
    await supabase.rpc('increment_resource_view_count', {
      resource_id: resourceId,
    });
  }
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Get analytics for a specific resource
 *
 * @param resourceId - Resource ID
 * @param coachId - Coach ID (for permission check)
 * @returns Resource analytics
 */
export async function getResourceAnalytics(
  resourceId: string,
  coachId: string
): Promise<ResourceAnalytics | null> {
  const supabase = await createClient();

  // Get resource
  const { data: resource } = await supabase
    .from('file_uploads')
    .select('*')
    .eq('id', resourceId)
    .eq('user_id', coachId)
    .eq('is_library_resource', true)
    .single();

  if (!resource) {
    return null;
  }

  // Get progress data for all clients
  const { data: progressData } = await supabase
    .from('resource_client_progress')
    .select(`
      *,
      users!resource_client_progress_client_id_fkey(id, first_name, last_name, email)
    `)
    .eq('file_id', resourceId);

  // Get share data
  const { data: shareData } = await supabase
    .from('file_shares')
    .select('shared_with')
    .eq('file_id', resourceId);

  const totalShares = shareData?.length || 0;
  const uniqueViewers = new Set(
    progressData?.filter(p => p.viewed_at).map(p => p.client_id) || []
  ).size;
  const totalCompletions = progressData?.filter(p => p.completed_at).length || 0;
  const completionRate = totalShares > 0
    ? Math.round((totalCompletions / totalShares) * 100)
    : 0;

  return {
    resourceId: resource.id,
    resourceName: resource.filename,
    totalViews: resource.view_count || 0,
    totalDownloads: resource.download_count || 0,
    totalCompletions,
    uniqueViewers,
    averageEngagementTime: null, // TODO: Implement if tracking time
    completionRate,
    clientBreakdown: (progressData || []).map(p => ({
      clientId: p.client_id,
      clientName: p.users
        ? `${p.users.first_name} ${p.users.last_name || ''}`.trim()
        : 'Client',
      clientEmail: p.users?.email,
      viewCount: p.access_count || 0,
      downloadCount: 0, // TODO: Track separately if needed
      lastAccessedAt: p.last_accessed_at,
      completed: !!p.completed_at,
      completedAt: p.completed_at,
    })),
  };
}

/**
 * Get overall library analytics for a coach
 *
 * @param coachId - Coach ID
 * @returns Library-wide analytics
 */
export async function getLibraryAnalytics(coachId: string): Promise<LibraryAnalytics> {
  const supabase = await createClient();

  // Get all library resources
  const { data: resources } = await supabase
    .from('file_uploads')
    .select('*')
    .eq('user_id', coachId)
    .eq('is_library_resource', true);

  if (!resources || resources.length === 0) {
    return {
      totalResources: 0,
      totalViews: 0,
      totalDownloads: 0,
      totalCompletions: 0,
      avgCompletionRate: 0,
      activeClients: 0,
      topResources: [],
      categoryBreakdown: [],
    };
  }

  const totalViews = resources.reduce((sum, r) => sum + (r.view_count || 0), 0);
  const totalDownloads = resources.reduce((sum, r) => sum + (r.download_count || 0), 0);
  const totalCompletions = resources.reduce((sum, r) => sum + (r.completion_count || 0), 0);

  // Get active clients (those with progress records)
  const resourceIds = resources.map(r => r.id);
  const { data: progressData } = await supabase
    .from('resource_client_progress')
    .select('client_id')
    .in('file_id', resourceIds);

  const activeClients = new Set(progressData?.map(p => p.client_id) || []).size;

  // Calculate average completion rate
  const avgCompletionRate = resources.length > 0
    ? Math.round(
        resources.reduce((sum, r) => {
          const shares = r.share_count || 0;
          const completions = r.completion_count || 0;
          return sum + (shares > 0 ? (completions / shares) * 100 : 0);
        }, 0) / resources.length
      )
    : 0;

  // Top resources
  const topResources = [...resources]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 10)
    .map(r => ({
      id: r.id,
      filename: r.filename,
      category: r.file_category as ResourceCategory,
      viewCount: r.view_count || 0,
      downloadCount: r.download_count || 0,
      completionCount: r.completion_count || 0,
      completionRate: 0, // TODO: Calculate
      shareCount: 0, // TODO: Get from shares
    }));

  return {
    totalResources: resources.length,
    totalViews,
    totalDownloads,
    totalCompletions,
    avgCompletionRate,
    activeClients,
    topResources,
    categoryBreakdown: [], // TODO: Implement category grouping
  };
}

// ============================================================================
// Library Settings
// ============================================================================

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
  let { data: settings, error } = await supabase
    .from('resource_library_settings')
    .select('*')
    .eq('coach_id', coachId)
    .single();

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
      throw new Error(`Failed to create library settings: ${createError.message}`);
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
export async function getCoachStorageUsage(coachId: string): Promise<StorageUsage> {
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map database file_uploads row to ResourceLibraryItem
 */
function mapFileUploadToResource(file: any): ResourceLibraryItem {
  return {
    id: file.id,
    userId: file.user_id,
    filename: file.filename,
    originalFilename: file.original_filename,
    fileType: file.file_type,
    fileSize: file.file_size,
    storagePath: file.storage_path,
    bucketName: file.bucket_name,
    isLibraryResource: file.is_library_resource,
    isPublic: file.is_public || false,
    sharedWithAllClients: file.shared_with_all_clients || false,
    category: file.file_category as ResourceCategory,
    tags: file.tags || [],
    description: file.description,
    viewCount: file.view_count || 0,
    downloadCount: file.download_count || 0,
    completionCount: file.completion_count || 0,
    createdAt: file.created_at,
    updatedAt: file.updated_at,
  };
}

/**
 * Map array of file_uploads to ResourceLibraryItem array
 */
function mapFileUploadsToResources(files: any[]): ResourceLibraryItem[] {
  return files.map(mapFileUploadToResource);
}
