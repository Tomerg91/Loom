import { NextRequest, NextResponse } from 'next/server';

import {
  getResourceById,
  updateResource,
  deleteResource,
  type UpdateResourceData,
} from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coach/resources/[id]
 * Get a single resource by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch resource
    const resource = await getResourceById(id);

    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Verify ownership (coaches can only see their own resources)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role === 'coach' && resource.coach_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    logger.error('Failed to fetch resource', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch resource',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/coach/resources/[id]
 * Update a resource
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const updateData: UpdateResourceData = {
      title: body.title,
      description: body.description,
      type: body.type,
      url: body.url,
      thumbnail_url: body.thumbnail_url,
      tags: body.tags,
      category: body.category,
      duration_minutes: body.duration_minutes,
    };

    // Update resource
    const resource = await updateResource(id, user.id, updateData);

    return NextResponse.json({
      success: true,
      data: resource,
      message: 'Resource updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update resource', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update resource',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/coach/resources/[id]
 * Delete a resource
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Delete resource
    await deleteResource(id, user.id);

    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete resource', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete resource',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
