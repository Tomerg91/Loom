/**
 * Resource Collections API Routes - Individual Collection
 *
 * GET    /api/resources/collections/[id] - Get collection with resources
 * PUT    /api/resources/collections/[id] - Update collection
 * DELETE /api/resources/collections/[id] - Delete collection
 *
 * @module api/resources/collections/[id]
 */

import { NextRequest, NextResponse } from 'next/server';

import { getResourceLibraryService } from '@/lib/services/resource-library-service';
import { createClient } from '@/lib/supabase/server';
import { updateCollectionSchema, validateData } from '@/lib/validations/resources';
import type { UpdateCollectionRequest } from '@/types/resources';

/**
 * GET /api/resources/collections/[id]
 *
 * Get a collection with all its resources
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     collection: ResourceCollection & { resources: ResourceLibraryItem[] }
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

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only coaches can access collections' },
        { status: 403 }
      );
    }

    const collectionId = params.id;

    // Get collection using service
    const service = getResourceLibraryService();
    const result = await service.getCollection(collectionId, user.id);

    if (!result.success) {
      const status = result.error === 'Collection not found' ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        collection: result.data,
      },
    });
  } catch (error) {
    console.error('GET /api/resources/collections/[id] error:', error);
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
 * PUT /api/resources/collections/[id]
 *
 * Update collection metadata or reorder resources
 *
 * Request Body:
 * {
 *   name?: string,
 *   description?: string,
 *   icon?: string,
 *   resourceOrder?: string[] // Array of resource IDs in new order
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     collection: ResourceCollection
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
        { success: false, error: 'Only coaches can update collections' },
        { status: 403 }
      );
    }

    const collectionId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validation = validateData(updateCollectionSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.errors.errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data as UpdateCollectionRequest;

    // Update collection using service
    const service = getResourceLibraryService();
    const result = await service.updateCollection(collectionId, user.id, data);

    if (!result.success) {
      const status = result.error === 'Collection not found' ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        collection: result.data,
      },
    });
  } catch (error) {
    console.error('PUT /api/resources/collections/[id] error:', error);
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
 * DELETE /api/resources/collections/[id]
 *
 * Delete a collection (resources remain, just unlinked)
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
        { success: false, error: 'Only coaches can delete collections' },
        { status: 403 }
      );
    }

    const collectionId = params.id;

    // Delete collection using service
    const service = getResourceLibraryService();
    const result = await service.deleteCollection(collectionId, user.id);

    if (!result.success) {
      const status = result.error === 'Collection not found' ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('DELETE /api/resources/collections/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
