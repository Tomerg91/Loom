/**
 * Resource Library API Routes - Client Access
 *
 * GET /api/resources/client - Get resources shared with the authenticated client
 *
 * @module api/resources/client
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getClientSharedResources } from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
import {
  sanitizeError,
  unauthorizedError,
  forbiddenError,
  validationError,
} from '@/lib/utils/api-errors';
import {
  isResourceCategory,
  normalizeResourceCategory,
  type ResourceListParams,
  RESOURCE_CATEGORY_VALUES,
  LEGACY_RESOURCE_CATEGORY_VALUES,
} from '@/types/resources';

/**
 * Zod schema for GET /api/resources/client query parameters
 */
const getClientResourcesQuerySchema = z.object({
  category: z
    .string()
    .refine(
      (val) =>
        RESOURCE_CATEGORY_VALUES.includes(val as never) ||
        LEGACY_RESOURCE_CATEGORY_VALUES.includes(val as never),
      { message: 'Invalid category' }
    )
    .optional(),
  tags: z.string().optional(),
  search: z.string().optional(),
  coach: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z
    .enum(['created_at', 'filename', 'file_size', 'view_count', 'download_count'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

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
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Sort field
 * - sortOrder: Sort direction (asc, desc)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     resources: ClientResourceItem[],
 *     total: number,
 *     pagination: PaginationMetadata
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const { response, statusCode } = unauthorizedError();
      return NextResponse.json(response, { status: statusCode });
    }

    // Verify user is a client
    const userRole = user.user_metadata?.role;
    if (userRole !== 'client') {
      const { response, statusCode } = forbiddenError(
        'Only clients can access shared resources.'
      );
      return NextResponse.json(response, { status: statusCode });
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags') || undefined,
      search: searchParams.get('search') || undefined,
      coach: searchParams.get('coach') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    };

    const validation = getClientResourcesQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      const { response, statusCode } = validationError(
        'Invalid query parameters',
        validation.error.errors
      );
      return NextResponse.json(response, { status: statusCode });
    }

    const { category, tags, search, coach, page, limit, sortBy, sortOrder } =
      validation.data;

    // Build filters
    const filters: ResourceListParams = {
      category: category ? normalizeResourceCategory(category) : undefined,
      tags: tags?.split(',').filter(Boolean) || undefined,
      search,
      sortBy,
      sortOrder,
      coachId: coach,
    };

    // Get shared resources (note: this currently fetches all and filters in memory)
    const allResources = await getClientSharedResources(user.id, filters);

    // Filter by coach if specified
    const filteredResources = coach
      ? allResources.filter(r => r.sharedBy.id === coach)
      : allResources;

    // Apply pagination in memory (since getClientSharedResources doesn't support it yet)
    const total = filteredResources.length;
    const offset = (page - 1) * limit;
    const paginatedResources = filteredResources.slice(offset, offset + limit);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        resources: paginatedResources,
        total,
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
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
