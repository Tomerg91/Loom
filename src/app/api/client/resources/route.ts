/**
 * Client Resources API
 *
 * GET /api/client/resources
 * - Fetches resources shared with the authenticated client
 * - Supports filtering by category, tags, collection, search
 * - Includes progress tracking data
 * - RLS enforced: only returns resources shared with client
 *
 * Query Parameters:
 * - category: Filter by resource category
 * - tags: Comma-separated list of tags
 * - search: Search by filename or description
 * - collectionId: Filter by collection ID
 * - sortBy: Sort field (created_at, filename, view_count)
 * - sortOrder: Sort order (asc, desc)
 * - showCompleted: Include completed resources (default: true)
 *
 * @module api/client/resources
 */

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import type { ClientResourceItem } from '@/types/resources';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a client
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_metadata')
      .eq('id', user.id)
      .single();

    if (userError || userData?.user_metadata?.role !== 'client') {
      return NextResponse.json({ error: 'Forbidden: Client access only' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const search = searchParams.get('search');
    const collectionId = searchParams.get('collectionId');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const showCompleted = searchParams.get('showCompleted') !== 'false';

    // Build base query
    // RLS automatically filters to only show resources shared with this client
    let query = supabase
      .from('file_uploads')
      .select(`
        *,
        owner:users!file_uploads_user_id_fkey(
          id,
          name,
          user_metadata
        ),
        shares:file_shares!file_shares_file_id_fkey(
          id,
          shared_by,
          shared_with,
          permission_type,
          expires_at,
          access_count,
          last_accessed_at,
          created_at,
          shared_by_user:users!file_shares_shared_by_fkey(
            id,
            name,
            user_metadata
          )
        ),
        progress:resource_client_progress!resource_client_progress_file_id_fkey(
          id,
          viewed_at,
          completed_at,
          last_accessed_at,
          access_count
        )
      `)
      .eq('is_library_resource', true)
      .eq('shares.shared_with', user.id);

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (tags && tags.length > 0) {
      query = query.contains('tags', tags);
    }

    if (search) {
      query = query.or(`filename.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filter by completion status
    if (!showCompleted) {
      query = query.is('progress.completed_at', null);
    }

    // Apply sorting
    const sortColumn = sortBy === 'filename' ? 'filename' : sortBy === 'view_count' ? 'view_count' : 'created_at';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    const { data: resources, error } = await query;

    if (error) {
      console.error('Error fetching client resources:', error);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    // Transform data to ClientResourceItem format
    const clientResources: ClientResourceItem[] = (resources || []).map((resource) => {
      const share = resource.shares?.[0]; // Client should have one share per resource
      const progress = resource.progress?.[0];

      return {
        id: resource.id,
        userId: resource.user_id,
        filename: resource.filename,
        originalFilename: resource.original_filename,
        fileType: resource.file_type,
        fileSize: resource.file_size,
        storagePath: resource.storage_path,
        bucketName: resource.bucket_name,
        isLibraryResource: resource.is_library_resource,
        isPublic: resource.is_public,
        sharedWithAllClients: resource.shared_with_all_clients,
        category: resource.category,
        tags: resource.tags || [],
        description: resource.description,
        viewCount: resource.view_count,
        downloadCount: resource.download_count,
        completionCount: resource.completion_count,
        createdAt: resource.created_at,
        updatedAt: resource.updated_at,
        sharedBy: {
          id: share?.shared_by_user?.id || resource.user_id,
          name: share?.shared_by_user?.name || resource.owner?.name || 'Unknown',
          role: share?.shared_by_user?.user_metadata?.role || 'coach',
        },
        permission: share?.permission_type || 'view',
        expiresAt: share?.expires_at || null,
        progress: progress ? {
          viewed: !!progress.viewed_at,
          completed: !!progress.completed_at,
          viewedAt: progress.viewed_at,
          completedAt: progress.completed_at,
        } : {
          viewed: false,
          completed: false,
          viewedAt: null,
          completedAt: null,
        },
      };
    });

    // If filtering by collection, join with collection items
    let filteredResources = clientResources;
    if (collectionId) {
      const { data: collectionItems } = await supabase
        .from('resource_collection_items')
        .select('file_id')
        .eq('collection_id', collectionId);

      const collectionFileIds = new Set(collectionItems?.map(item => item.file_id) || []);
      filteredResources = clientResources.filter(r => collectionFileIds.has(r.id));
    }

    return NextResponse.json({
      success: true,
      data: {
        resources: filteredResources,
        total: filteredResources.length,
      },
    });
  } catch (error) {
    console.error('Error in client resources API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
