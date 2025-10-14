/**
 * Resource Library API Routes - Share with All Clients
 *
 * POST /api/resources/[id]/share-all-clients - Share resource with all current clients
 *
 * @module api/resources/[id]/share-all-clients
 */

import { NextRequest, NextResponse } from 'next/server';

import { getResourceLibraryService } from '@/lib/services/resource-library-service';
import { createClient } from '@/lib/supabase/server';
import { sanitizeError, unauthorizedError, forbiddenError, notFoundError, validationError } from '@/lib/utils/api-errors';
import type { ShareAllClientsRequest } from '@/types/resources';

/**
 * POST /api/resources/[id]/share-all-clients
 *
 * Share a resource with all current clients of the coach
 *
 * Request Body:
 * {
 *   permission: 'view' | 'download',
 *   expiresAt?: string (ISO date),
 *   message?: string
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     sharedCount: number,
 *     shares: ResourceShare[]
 *   }
 * }
 */
export async function POST(
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
      const { response, statusCode } = forbiddenError('Only coaches can share resources.');
      return NextResponse.json(response, { status: statusCode });
    }

    const resourceId = params.id;

    // Parse request body
    const body = await request.json() as ShareAllClientsRequest;

    // Validate required fields
    if (!body.permission) {
      const { response, statusCode } = validationError('Permission is required.');
      return NextResponse.json(response, { status: statusCode });
    }

    if (!['view', 'download'].includes(body.permission)) {
      const { response, statusCode } = validationError('Permission must be either "view" or "download".');
      return NextResponse.json(response, { status: statusCode });
    }

    // Validate expiration date if provided
    if (body.expiresAt) {
      const expiresDate = new Date(body.expiresAt);
      if (isNaN(expiresDate.getTime())) {
        const { response, statusCode } = validationError('Invalid expiration date format.');
        return NextResponse.json(response, { status: statusCode });
      }

      if (expiresDate <= new Date()) {
        const { response, statusCode } = validationError('Expiration date must be in the future.');
        return NextResponse.json(response, { status: statusCode });
      }
    }

    // Share resource using service
    const service = getResourceLibraryService();
    const result = await service.shareWithAllClients(resourceId, user.id, body);

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
        sharedCount: result.data.summary.usersSharedWith,
        shares: result.data.shares,
      },
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'POST /api/resources/[id]/share-all-clients',
      userMessage: 'Failed to share resource with clients. Please try again.',
      metadata: { resourceId: params.id },
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
