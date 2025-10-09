/**
 * Resource Collections API Routes
 *
 * GET  /api/resources/collections - List coach's collections
 * POST /api/resources/collections - Create new collection
 *
 * @module api/resources/collections
 */

import { NextRequest, NextResponse } from 'next/server';

import { getResourceLibraryService } from '@/lib/services/resource-library-service';
import { createClient } from '@/lib/supabase/server';
import { createCollectionSchema, validateData } from '@/lib/validations/resources';
import type { CreateCollectionRequest } from '@/types/resources';

/**
 * GET /api/resources/collections
 *
 * Get all collections for the authenticated coach
 *
 * Query Parameters:
 * - includeArchived: Include archived collections (default: false)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     collections: ResourceCollection[]
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
        { success: false, error: 'Only coaches can access collections' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Get collections using service
    const service = getResourceLibraryService();
    const result = await service.getCollections(user.id, includeArchived);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        collections: result.data,
      },
    });
  } catch (error) {
    console.error('GET /api/resources/collections error:', error);
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
 * POST /api/resources/collections
 *
 * Create a new collection
 *
 * Request Body:
 * {
 *   name: string,
 *   description?: string,
 *   icon?: string,
 *   resourceIds?: string[]
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
        { success: false, error: 'Only coaches can create collections' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateData(createCollectionSchema, body);

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

    const data = validation.data as CreateCollectionRequest;

    // Create collection using service
    const service = getResourceLibraryService();
    const result = await service.createCollection(user.id, data);

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
          collection: result.data,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/resources/collections error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
