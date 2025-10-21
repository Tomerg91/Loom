/**
 * Client Resource Collections API
 *
 * GET /api/client/resources/collections
 * - Fetches collections containing resources shared with the client
 * - RLS enforced: only returns collections with accessible resources
 *
 * @module api/client/resources/collections
 */

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import type { ResourceCollection } from '@/types/resources';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
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

    // Fetch collections that contain resources shared with this client
    // RLS policy "Clients can view collections with shared items" enforces this
    const { data: collections, error } = await supabase
      .from('resource_collections')
      .select(`
        id,
        coach_id,
        name,
        description,
        icon,
        sort_order,
        is_archived,
        created_at,
        updated_at,
        coach:users!resource_collections_coach_id_fkey(
          id,
          name
        )
      `)
      .eq('is_archived', false)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching client collections:', error);
      return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
    }

    // Get item counts for each collection (only counting accessible resources)
    const collectionsWithCounts = await Promise.all(
      (collections || []).map(async (collection) => {
        // Count items that are accessible to this client
        const { count } = await supabase
          .from('resource_collection_items')
          .select('id', { count: 'exact', head: true })
          .eq('collection_id', collection.id);

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
          itemCount: count || 0,
        } as ResourceCollection & { itemCount: number };
      })
    );

    // Filter out collections with no accessible items
    const accessibleCollections = collectionsWithCounts.filter(c => c.itemCount > 0);

    return NextResponse.json({
      success: true,
      data: accessibleCollections,
    });
  } catch (error) {
    console.error('Error in client collections API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
