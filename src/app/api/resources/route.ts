/**
 * Resource Library API Routes - Main Endpoints
 *
 * GET  /api/resources - List coach's library resources with filtering
 * POST /api/resources - Upload new resource to library
 *
 * @module api/resources
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResourceLibraryService } from '@/lib/services/resource-library-service';
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only coaches can access library resources' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: ResourceListParams = {
      category: searchParams.get('category') as any || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
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
    console.error('GET /api/resources error:', error);
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
        { success: false, error: 'Only coaches can upload library resources' },
        { status: 403 }
      );
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
      return NextResponse.json(
        { success: false, error: 'File is required' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category is required' },
        { status: 400 }
      );
    }

    // Parse tags
    let tags: string[] = [];
    if (tagsString) {
      try {
        tags = JSON.parse(tagsString);
        if (!Array.isArray(tags)) {
          throw new Error('Tags must be an array');
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid tags format (must be JSON array)' },
          { status: 400 }
        );
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
    console.error('POST /api/resources error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
