/**
 * Resource Library API Routes - Main Endpoints
 *
 * GET  /api/resources - List coach's library resources with filtering
 * POST /api/resources - Upload new resource to library
 *
 * @module api/resources
 */

import { NextRequest, NextResponse } from 'next/server';

import { getResourceLibraryService } from '@/lib/services/resource-library-service';
import { createClient } from '@/lib/supabase/server';
import { sanitizeError, unauthorizedError, forbiddenError, validationError } from '@/lib/utils/api-errors';
import { validateUploadedFile } from '@/lib/utils/file-validation';
import type { ResourceListParams } from '@/types/resources';

/**
 * GET /api/resources
 *
 * Get library resources for the authenticated coach with optional filtering
 *
 * Query Parameters:
 * - category: Filter by resource category
 * - tags: Filter by tags (comma-separated)
 * - search: Search in filename and description
 * - sortBy: Sort field (created_at, filename, file_size, view_count, download_count)
 * - sortOrder: Sort direction (asc, desc)
 * - limit: Max results to return
 * - offset: Pagination offset
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     resources: ResourceLibraryItem[],
 *     total: number
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

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      const { response, statusCode } = forbiddenError('Only coaches can access the resource library.');
      return NextResponse.json(response, { status: statusCode });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;

    // Helper to validate sortBy parameter
    const sortByParam = searchParams.get('sortBy');
    const validSortFields = ['created_at', 'filename', 'file_size', 'view_count', 'download_count'] as const;
    const sortBy = sortByParam && validSortFields.includes(sortByParam as typeof validSortFields[number])
      ? (sortByParam as ResourceListParams['sortBy'])
      : 'created_at';

    // Helper to validate sortOrder parameter
    const sortOrderParam = searchParams.get('sortOrder');
    const sortOrder = sortOrderParam === 'asc' || sortOrderParam === 'desc'
      ? sortOrderParam
      : 'desc';

    const filters: ResourceListParams = {
      category: searchParams.get('category') as ResourceListParams['category'] | null || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      search: searchParams.get('search') || undefined,
      sortBy,
      sortOrder,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
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

    return NextResponse.json({
      success: true,
      data: result.data,
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
  const errorMetadata: { category?: string; hasFile: boolean } = {
    hasFile: false,
  };

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
      const { response, statusCode } = forbiddenError('Only coaches can upload resources.');
      return NextResponse.json(response, { status: statusCode });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;
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
      const { response, statusCode } = validationError(fileValidation.error || 'Invalid file');
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
        const { response, statusCode } = validationError('Invalid tags format. Tags must be a JSON array.');
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
      metadata: { category, hasFile: !!file },
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
