/**
 * Resource Analytics and Progress Tracking
 *
 * This module provides analytics and progress tracking for resources.
 * Includes client progress tracking, resource analytics, and library-wide metrics.
 *
 * @module lib/database/resources/analytics
 */

import { createClient } from '@/lib/supabase/server';
import type {
  ResourceAnalytics,
  LibraryAnalytics,
  ResourceCategory,
} from '@/types/resources';
import { normalizeResourceCategory } from '@/types/resources';
import { logger } from '@/lib/logger';

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
  const updates: {
    last_accessed_at: string;
    viewed_at?: string;
    completed_at?: string;
  } = {
    last_accessed_at: now,
  };

  if (action === 'viewed') {
    updates.viewed_at = now;
  } else if (action === 'completed') {
    updates.completed_at = now;
  }

  // Upsert progress record
  const { error } = await supabase.from('resource_client_progress').upsert(
    {
      file_id: resourceId,
      client_id: clientId,
      ...updates,
      access_count: 1, // Will be incremented by trigger
    },
    {
      onConflict: 'file_id,client_id',
      ignoreDuplicates: false,
    }
  );

  if (error) {
    // Log RLS policy violations for debugging
    if (error.code === 'PGRST301' || error.message.includes('policy')) {
      logger.error('[RLS Policy Violation] Failed to track progress:', {
        resourceId,
        clientId,
        action,
        error: error.message,
        code: error.code,
      });
    }
    throw new Error(`Failed to track progress: ${error.message}`);
  }

  // Increment view count on resource
  if (action === 'viewed' || action === 'accessed') {
    const { error: rpcError } = await supabase.rpc('increment_resource_view_count', {
      p_file_id: resourceId,
      p_client_id: clientId,
    });

    if (rpcError) {
      logger.error('Failed to increment view count:', rpcError);
      // Don't throw - this is a non-critical analytics operation
    }
  }
}

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
    .select(
      `
      *,
      users!resource_client_progress_client_id_fkey(id, first_name, last_name, email)
    `
    )
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
  const totalCompletions =
    progressData?.filter(p => p.completed_at).length || 0;
  const completionRate =
    totalShares > 0 ? Math.round((totalCompletions / totalShares) * 100) : 0;

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
export async function getLibraryAnalytics(
  coachId: string
): Promise<LibraryAnalytics> {
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
      sharedResources: 0,
      uniqueViewers: 0,
      topResources: [],
      categoryBreakdown: [],
    };
  }

  const totalViews = resources.reduce((sum, r) => sum + (r.view_count || 0), 0);
  const totalDownloads = resources.reduce(
    (sum, r) => sum + (r.download_count || 0),
    0
  );
  const totalCompletions = resources.reduce(
    (sum, r) => sum + (r.completion_count || 0),
    0
  );

  const sharedResources = resources.filter(
    resource => resource.is_shared || resource.shared_with_all_clients
  ).length;

  // Get active clients (those with progress records)
  const resourceIds = resources.map(r => r.id);
  const { data: progressData } = await supabase
    .from('resource_client_progress')
    .select('client_id')
    .in('file_id', resourceIds);

  const progressClientIds = progressData?.map(p => p.client_id) || [];
  const activeClients = new Set(progressClientIds).size;
  const uniqueViewers = activeClients;

  // Fetch share counts for resources
  const { data: shareRows } = await supabase
    .from('file_shares')
    .select('file_id')
    .in('file_id', resourceIds);

  const shareCountByResource = new Map<string, number>();
  for (const row of shareRows || []) {
    shareCountByResource.set(
      row.file_id,
      (shareCountByResource.get(row.file_id) || 0) + 1
    );
  }

  // Calculate average completion rate
  const avgCompletionRate =
    resources.length > 0
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
      category: normalizeResourceCategory(r.file_category),
      viewCount: r.view_count || 0,
      downloadCount: r.download_count || 0,
      completionCount: r.completion_count || 0,
      completionRate:
        r.view_count && r.view_count > 0
          ? Math.round(((r.completion_count || 0) / r.view_count) * 100)
          : 0,
      shareCount: shareCountByResource.get(r.id) || 0,
    }));

  const categoryAccumulator = new Map<
    ResourceCategory,
    {
      resourceCount: number;
      totalViews: number;
      totalDownloads: number;
      totalCompletions: number;
    }
  >();

  for (const resource of resources) {
    const category = normalizeResourceCategory(resource.file_category);
    const stats =
      categoryAccumulator.get(category) || {
        resourceCount: 0,
        totalViews: 0,
        totalDownloads: 0,
        totalCompletions: 0,
      };

    stats.resourceCount += 1;
    stats.totalViews += resource.view_count || 0;
    stats.totalDownloads += resource.download_count || 0;
    stats.totalCompletions += resource.completion_count || 0;

    categoryAccumulator.set(category, stats);
  }

  const categoryBreakdown = Array.from(categoryAccumulator.entries())
    .map(([category, stats]) => ({
      category,
      resourceCount: stats.resourceCount,
      totalViews: stats.totalViews,
      totalDownloads: stats.totalDownloads,
      totalCompletions: stats.totalCompletions,
      avgCompletionRate:
        stats.totalViews > 0
          ? Math.round((stats.totalCompletions / stats.totalViews) * 100)
          : 0,
    }))
    .sort((a, b) => b.totalViews - a.totalViews);

  return {
    totalResources: resources.length,
    totalViews,
    totalDownloads,
    totalCompletions,
    avgCompletionRate,
    activeClients,
    sharedResources,
    uniqueViewers,
    topResources,
    categoryBreakdown,
  };
}
