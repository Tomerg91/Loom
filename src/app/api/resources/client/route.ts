/**
 * Resource Library API Routes - Client Access
 *
 * GET /api/resources/client - Get resources shared with the authenticated client
 *
 * @module api/resources/client
 */

import { NextRequest, NextResponse } from 'next/server';

import { getClientSharedResources } from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
import { sanitizeError, unauthorizedError, forbiddenError } from '@/lib/utils/api-errors';
import type { ResourceListParams } from '@/types/resources';

/**
 * GET /api/resources/client
 *
 * Get resources shared with the authenticated client
 *
 * Query Parameters:
 * - category: Filter by resource category
 * - tags: Filter by tags (comma-separated)
 * - search: Search in filename and description
 * - coach: Filter by coach ID
 * - sortBy: Sort field
 * - sortOrder: Sort direction (asc, desc)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     resources: ClientResourceItem[]
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const { response, statusCode } = unauthorizedError();
      return NextResponse.json(response, { status: statusCode });
    }

    // Verify user is a client
    const userRole = user.user_metadata?.role;
    if (userRole !== 'client') {
      const { response, statusCode } = forbiddenError('Only clients can access shared resources.');
      return NextResponse.json(response, { status: statusCode });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: ResourceListParams = {
      category: searchParams.get('category') as any || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    };

    // Get shared resources
    const resources = await getClientSharedResources(user.id, filters);

    // Filter by coach if specified
    const coachId = searchParams.get('coach');
    const filteredResources = coachId
      ? resources.filter(r => r.sharedBy.id === coachId)
      : resources;

    return NextResponse.json({
      success: true,
      data: {
        resources: filteredResources,
      },
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'GET /api/resources/client',
      userMessage: 'Failed to fetch shared resources. Please try again later.',
      metadata: { userId: 'client' },
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
