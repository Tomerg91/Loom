/**
 * Resource Library API Routes - Share with All Clients
 *
 * POST /api/resources/[id]/share-all-clients - Share resource with all current clients
 *
 * @module api/resources/[id]/share-all-clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResourceLibraryService } from '@/lib/services/resource-library-service';
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
        { success: false, error: 'Only coaches can share resources' },
        { status: 403 }
      );
    }

    const resourceId = params.id;

    // Parse request body
    const body = await request.json() as ShareAllClientsRequest;

    // Validate required fields
    if (!body.permission) {
      return NextResponse.json(
        { success: false, error: 'Permission is required' },
        { status: 400 }
      );
    }

    if (!['view', 'download'].includes(body.permission)) {
      return NextResponse.json(
        { success: false, error: 'Invalid permission type' },
        { status: 400 }
      );
    }

    // Validate expiration date if provided
    if (body.expiresAt) {
      const expiresDate = new Date(body.expiresAt);
      if (isNaN(expiresDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid expiration date' },
          { status: 400 }
        );
      }

      if (expiresDate <= new Date()) {
        return NextResponse.json(
          { success: false, error: 'Expiration date must be in the future' },
          { status: 400 }
        );
      }
    }

    // Share resource using service
    const service = getResourceLibraryService();
    const result = await service.shareWithAllClients(resourceId, user.id, body);

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
        sharedCount: result.data.summary.usersSharedWith,
        shares: result.data.shares,
      },
    });
  } catch (error) {
    console.error('POST /api/resources/[id]/share-all-clients error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
