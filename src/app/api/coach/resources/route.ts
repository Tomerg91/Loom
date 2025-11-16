import { NextRequest, NextResponse } from 'next/server';

import {
  getCoachLibraryResources,

} from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
import type { ResourceListParams } from '@/types/resources';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coach/resources
 * Get all library resources for the authenticated coach with optional filtering and pagination
 *
 * Query Parameters:
 * - category: Filter by resource category
 * - tags: Comma-separated list of tags
 * - search: Search by filename or description
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Sort field (created_at, filename, file_size, view_count, download_count)
 * - sortOrder: Sort order (asc, desc)
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

    // Parse query parameters with pagination
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const filters: ResourceListParams = {
      category: searchParams.get('category') as unknown,
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      search: searchParams.get('search') || undefined,
      page,
      limit,
      sortBy: (searchParams.get('sortBy') as unknown) || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    // Fetch resources with pagination
    const result = await getCoachLibraryResources(user.id, filters);

    // Calculate pagination metadata
    const totalPages = Math.ceil(result.count / limit);

    return NextResponse.json({
      success: true,
      data: {
        resources: result.resources,
        total: result.count,
        pagination: {
          page,
          limit,
          totalItems: result.count,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
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
