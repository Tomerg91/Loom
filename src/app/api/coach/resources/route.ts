import { NextRequest, NextResponse } from 'next/server';

import {
  getCoachLibraryResources,
  createResource,
  type ResourceListParams,
  type CreateResourceData,
} from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

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
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
    };

    // Fetch resources
    const resources = await getCoachLibraryResources(user.id, filters);

    return NextResponse.json({
      success: true,
      data: resources,
      count: resources.length,
    });
  } catch (error) {
    logger.error('Failed to fetch coach resources', error);
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

/**
 * POST /api/coach/resources
 * Create a new resource
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const resourceData: CreateResourceData = {
      title: body.title,
      description: body.description,
      type: body.type,
      url: body.url,
      thumbnail_url: body.thumbnail_url,
      tags: body.tags,
      category: body.category,
      duration_minutes: body.duration_minutes,
    };

    // Validate required fields
    if (!resourceData.title || !resourceData.type || !resourceData.url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: title, type, url',
        },
        { status: 400 }
      );
    }

    // Create resource
    const resource = await createResource(user.id, resourceData);

    return NextResponse.json({
      success: true,
      data: resource,
      message: 'Resource created successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create resource', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create resource',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
