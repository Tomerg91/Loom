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
import { sanitizeError, unauthorizedError, forbiddenError, notFoundError, validationError } from '@/lib/utils/api-errors';
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
      const { response, statusCode } = unauthorizedError();
      return NextResponse.json(response, { status: statusCode });
    }

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      const { response, statusCode } = forbiddenError('Only coaches can access collections.');
      return NextResponse.json(response, { status: statusCode });
    }

    const collectionId = params.id;

    // Get collection using service
    const service = getResourceLibraryService();
    const result = await service.getCollection(collectionId, user.id);

    if (!result.success) {
      if (result.error === 'Collection not found') {
        const { response, statusCode } = notFoundError('Collection');
        return NextResponse.json(response, { status: statusCode });
      }
      const { response, statusCode } = sanitizeError(new Error(result.error), {
        context: 'GET /api/resources/collections/[id]',
        userMessage: 'Failed to fetch collection. Please try again.',
        metadata: { collectionId, userId: user.id },
      });
      return NextResponse.json(response, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
      data: {
        collection: result.data,
      },
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'GET /api/resources/collections/[id]',
      userMessage: 'Failed to fetch collection. Please try again later.',
      metadata: { collectionId: params.id },
    });
    return NextResponse.json(response, { status: statusCode });
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
      const { response, statusCode } = unauthorizedError();
      return NextResponse.json(response, { status: statusCode });
    }

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      const { response, statusCode } = forbiddenError('Only coaches can update collections.');
      return NextResponse.json(response, { status: statusCode });
    }

    const collectionId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validation = validateData(updateCollectionSchema, body);

    if (!validation.success) {
      const { response, statusCode } = validationError('Validation failed. Please check your input.');
      return NextResponse.json({ ...response, details: validation.errors.errors }, { status: statusCode });
    }

    const data = validation.data as UpdateCollectionRequest;

    // Update collection using service
    const service = getResourceLibraryService();
    const result = await service.updateCollection(collectionId, user.id, data);

    if (!result.success) {
      if (result.error === 'Collection not found') {
        const { response, statusCode } = notFoundError('Collection');
        return NextResponse.json(response, { status: statusCode });
      }
      const { response, statusCode } = sanitizeError(new Error(result.error), {
        context: 'PUT /api/resources/collections/[id]',
        userMessage: 'Failed to update collection. Please try again.',
        metadata: { collectionId, userId: user.id },
      });
      return NextResponse.json(response, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
      data: {
        collection: result.data,
      },
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'PUT /api/resources/collections/[id]',
      userMessage: 'Failed to update collection. Please try again later.',
      metadata: { collectionId: params.id },
    });
    return NextResponse.json(response, { status: statusCode });
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
      const { response, statusCode } = unauthorizedError();
      return NextResponse.json(response, { status: statusCode });
    }

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      const { response, statusCode } = forbiddenError('Only coaches can delete collections.');
      return NextResponse.json(response, { status: statusCode });
    }

    const collectionId = params.id;

    // Delete collection using service
    const service = getResourceLibraryService();
    const result = await service.deleteCollection(collectionId, user.id);

    if (!result.success) {
      if (result.error === 'Collection not found') {
        const { response, statusCode } = notFoundError('Collection');
        return NextResponse.json(response, { status: statusCode });
      }
      const { response, statusCode } = sanitizeError(new Error(result.error), {
        context: 'DELETE /api/resources/collections/[id]',
        userMessage: 'Failed to delete collection. Please try again.',
        metadata: { collectionId, userId: user.id },
      });
      return NextResponse.json(response, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'DELETE /api/resources/collections/[id]',
      userMessage: 'Failed to delete collection. Please try again later.',
      metadata: { collectionId: params.id },
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
