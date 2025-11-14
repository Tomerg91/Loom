/**
 * Resource Library API Routes - Main Endpoints
 *
 * GET  /api/resources - List coach's library resources with filtering
 * POST /api/resources - Upload new resource to library
 *
 * @module api/resources
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getResourceLibraryService } from '@/lib/services/resource-library-service';
import { createClient } from '@/lib/supabase/server';
import {
  sanitizeError,
  unauthorizedError,
  forbiddenError,
  validationError,
} from '@/lib/utils/api-errors';
import { validateUploadedFile } from '@/lib/utils/file-validation';
import type { ResourceListParams } from '@/types/resources';
import {
  isLegacyResourceCategory,
  isResourceCategory,
  normalizeResourceCategory,
  RESOURCE_CATEGORY_VALUES,
  LEGACY_RESOURCE_CATEGORY_VALUES,
} from '@/types/resources';

/**
 * Zod schema for GET /api/resources query parameters
 */
const getResourcesQuerySchema = z.object({
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
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).optional(), // For backward compatibility
  sortBy: z
    .enum(['created_at', 'filename', 'file_size', 'view_count', 'download_count'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/resources
 *
 * Get library resources for the authenticated coach with optional filtering
 *
 * Query Parameters:
 * - category: Filter by resource category
 * - tags: Filter by tags (comma-separated)
 * - search: Search in filename and description
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - offset: Pagination offset (for backward compatibility)
 * - sortBy: Sort field (created_at, filename, file_size, view_count, download_count)
 * - sortOrder: Sort direction (asc, desc)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     resources: ResourceLibraryItem[],
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

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      const { response, statusCode } = forbiddenError(
        'Only coaches can access the resource library.'
      );
      return NextResponse.json(response, { status: statusCode });
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    };

    const validation = getResourcesQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      const { response, statusCode } = validationError(
        'Invalid query parameters',
        validation.error.errors
      );
      return NextResponse.json(response, { status: statusCode });
    }

    const { category, tags, search, page, limit, offset, sortBy, sortOrder } =
      validation.data;

    // Build filters
    const filters: ResourceListParams = {
      category: category ? normalizeResourceCategory(category) : undefined,
      tags: tags?.split(',').filter(Boolean) || undefined,
      search,
      page,
      limit,
      offset,
      sortBy,
      sortOrder,
    };

    // Get resources using service
    const service = getResourceLibraryService();
    const result = await service.getResources(user.id, filters);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(result.data.total / limit);

    return NextResponse.json({
      success: true,
      data: {
        resources: result.data.resources,
        total: result.data.total,
        pagination: {
          page,
          limit,
          totalItems: result.data.total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'GET /api/resources',
      userMessage: 'Failed to fetch resources. Please try again.',
    });
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * POST /api/resources
 *
 * Upload a new resource to the library
 *
 * Request Body (FormData):
 * - file: File to upload
 * - category: Resource category
 * - tags: JSON array of tags
 * - description: Optional description
 * - addToCollection: Optional collection ID
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     resource: ResourceLibraryItem
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  let errorMetadata: { category?: string; hasFile: boolean } = {
    hasFile: false,
  };

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

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      const { response, statusCode } = forbiddenError(
        'Only coaches can upload resources.'
      );
      return NextResponse.json(response, { status: statusCode });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;
    errorMetadata = {
      category: category || undefined,
      hasFile: !!file,
    };
    const tagsString = formData.get('tags') as string;
    const description = formData.get('description') as string | null;
    const addToCollection = formData.get('addToCollection') as string | null;

    // Validate required fields
    if (!file) {
      const { response, statusCode } = validationError('File is required.');
      return NextResponse.json(response, { status: statusCode });
    }

    if (!category) {
      const { response, statusCode } = validationError('Category is required.');
      return NextResponse.json(response, { status: statusCode });
    }

    // Validate file (MIME type, size, extension, sanitize filename)
    const fileValidation = validateUploadedFile(file);
    if (!fileValidation.valid) {
      const { response, statusCode } = validationError(
        fileValidation.error || 'Invalid file'
      );
      return NextResponse.json(response, { status: statusCode });
    }

    // Parse tags
    let tags: string[] = [];
    if (tagsString) {
      try {
        tags = JSON.parse(tagsString);
        if (!Array.isArray(tags)) {
          throw new Error('Tags must be an array');
        }
      } catch {
        const { response, statusCode } = validationError(
          'Invalid tags format. Tags must be a JSON array.'
        );
        return NextResponse.json(response, { status: statusCode });
      }
    }

    // Upload resource using service
    const service = getResourceLibraryService();
    const result = await service.uploadResource(file, user.id, {
      category,
      tags,
      description: description || undefined,
      addToCollection: addToCollection || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          resource: result.data,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'POST /api/resources',
      userMessage: 'Failed to upload resource. Please try again.',
      metadata: errorMetadata,
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
