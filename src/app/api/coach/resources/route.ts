import { NextRequest, NextResponse } from 'next/server';

import {
  getCoachLibraryResources,

} from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
import type { ResourceListParams } from '@/types/resources';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coach/resources
 * Get all library resources for the authenticated coach with optional filtering
 */
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

    // Verify coach role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = request.nextUrl;
    const filters: ResourceListParams = {
      category: searchParams.get('category') as unknown,
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as unknown) || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    // Fetch resources
    const resources = await getCoachLibraryResources(user.id, filters);

    return NextResponse.json({
      success: true,
      data: resources,
    });
  } catch (error) {
    console.error('Failed to fetch coach resources:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch resources',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
