/**
 * Resource Library API Routes - Individual Resource
 *
 * GET    /api/resources/[id] - Get single resource
 * PUT    /api/resources/[id] - Update resource metadata
 * DELETE /api/resources/[id] - Delete resource
 *
 * @module api/resources/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResourceLibraryService } from '@/lib/services/resource-library-service';
import type { UpdateResourceRequest } from '@/types/resources';

/**
 * GET /api/resources/[id]
 *
 * Get a single resource by ID
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     resource: ResourceLibraryItem
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resourceId = params.id;

    // Get resource using service
    const service = getResourceLibraryService();
    const result = await service.getResource(resourceId, user.id);

    if (!result.success) {
      const status = result.error === 'Resource not found' ? 404 : 403;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        resource: result.data,
      },
    });
  } catch (error) {
    console.error('GET /api/resources/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/resources/[id]
 *
 * Update resource metadata
 *
 * Request Body:
 * {
 *   filename?: string,
 *   description?: string,
 *   category?: ResourceCategory,
 *   tags?: string[]
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     resource: ResourceLibraryItem
 *   }
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only coaches can update resources' },
        { status: 403 }
      );
    }

    const resourceId = params.id;

    // Parse request body
    const body = await request.json() as UpdateResourceRequest;

    // Validate at least one field to update
    if (!body.filename && !body.description && !body.category && !body.tags) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update resource using service
    const service = getResourceLibraryService();
    const result = await service.updateResource(resourceId, user.id, body);

    if (!result.success) {
      const status = result.error === 'Resource not found' ? 404 :
                     result.error === 'Access denied' ? 403 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        resource: result.data,
      },
    });
  } catch (error) {
    console.error('PUT /api/resources/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/resources/[id]
 *
 * Delete a resource (also removes from collections and revokes shares)
 *
 * Returns:
 * {
 *   success: true
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only coaches can delete resources' },
        { status: 403 }
      );
    }

    const resourceId = params.id;

    // Delete resource using service
    const service = getResourceLibraryService();
    const result = await service.deleteResource(resourceId, user.id);

    if (!result.success) {
      const status = result.error === 'Resource not found' ? 404 :
                     result.error === 'Access denied' ? 403 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('DELETE /api/resources/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
