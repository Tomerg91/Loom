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

import { getResourceLibraryService } from '@/lib/services/resource-library-service';
import { createClient } from '@/lib/supabase/server';
import { sanitizeError, unauthorizedError, forbiddenError, notFoundError, validationError } from '@/lib/utils/api-errors';
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
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const { response, statusCode } = unauthorizedError();
      return NextResponse.json(response, { status: statusCode });
    }

    const resourceId = params.id;

    // Get resource using service
    const service = getResourceLibraryService();
    const result = await service.getResource(resourceId, user.id);

    if (!result.success) {
      if (result.error === 'Resource not found') {
        const { response, statusCode } = notFoundError('Resource');
        return NextResponse.json(response, { status: statusCode });
      }
      const { response, statusCode } = forbiddenError('You do not have access to this resource.');
      return NextResponse.json(response, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
      data: {
        resource: result.data,
      },
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'GET /api/resources/[id]',
      userMessage: 'Failed to fetch resource. Please try again.',
      metadata: { resourceId: params.id },
    });
    return NextResponse.json(response, { status: statusCode });
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
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

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
      const { response, statusCode } = forbiddenError('Only coaches can update resources.');
      return NextResponse.json(response, { status: statusCode });
    }

    const resourceId = params.id;

    // Parse request body
    const body = await request.json() as UpdateResourceRequest;

    // Validate at least one field to update
    if (!body.filename && !body.description && !body.category && !body.tags) {
      const { response, statusCode } = validationError('At least one field must be provided to update.');
      return NextResponse.json(response, { status: statusCode });
    }

    // Update resource using service
    const service = getResourceLibraryService();
    const result = await service.updateResource(resourceId, user.id, body);

    if (!result.success) {
      if (result.error === 'Resource not found') {
        const { response, statusCode } = notFoundError('Resource');
        return NextResponse.json(response, { status: statusCode });
      }
      if (result.error === 'Access denied') {
        const { response, statusCode } = forbiddenError();
        return NextResponse.json(response, { status: statusCode });
      }
      const { response, statusCode } = validationError(result.error);
      return NextResponse.json(response, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
      data: {
        resource: result.data,
      },
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'PUT /api/resources/[id]',
      userMessage: 'Failed to update resource. Please try again.',
      metadata: { resourceId: params.id },
    });
    return NextResponse.json(response, { status: statusCode });
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
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

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
      const { response, statusCode } = forbiddenError('Only coaches can delete resources.');
      return NextResponse.json(response, { status: statusCode });
    }

    const resourceId = params.id;

    // Delete resource using service
    const service = getResourceLibraryService();
    const result = await service.deleteResource(resourceId, user.id);

    if (!result.success) {
      if (result.error === 'Resource not found') {
        const { response, statusCode } = notFoundError('Resource');
        return NextResponse.json(response, { status: statusCode });
      }
      if (result.error === 'Access denied') {
        const { response, statusCode } = forbiddenError();
        return NextResponse.json(response, { status: statusCode });
      }
      const { response, statusCode } = validationError(result.error);
      return NextResponse.json(response, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'DELETE /api/resources/[id]',
      userMessage: 'Failed to delete resource. Please try again.',
      metadata: { resourceId: params.id },
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
