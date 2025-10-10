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
import { sanitizeError, unauthorizedError, forbiddenError, validationError } from '@/lib/utils/api-errors';
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
      const { response, statusCode } = unauthorizedError();
      return NextResponse.json(response, { status: statusCode });
    }

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      const { response, statusCode } = forbiddenError('Only coaches can access collections.');
      return NextResponse.json(response, { status: statusCode });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Get collections using service
    const service = getResourceLibraryService();
    const result = await service.getCollections(user.id, includeArchived);

    if (!result.success) {
      const { response, statusCode } = sanitizeError(new Error(result.error), {
        context: 'GET /api/resources/collections',
        userMessage: 'Failed to fetch collections. Please try again.',
        metadata: { userId: user.id },
      });
      return NextResponse.json(response, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
      data: {
        collections: result.data,
      },
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'GET /api/resources/collections',
      userMessage: 'Failed to fetch collections. Please try again later.',
      metadata: { userId: 'collections' },
    });
    return NextResponse.json(response, { status: statusCode });
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
      const { response, statusCode } = unauthorizedError();
      return NextResponse.json(response, { status: statusCode });
    }

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      const { response, statusCode } = forbiddenError('Only coaches can create collections.');
      return NextResponse.json(response, { status: statusCode });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateData(createCollectionSchema, body);

    if (!validation.success) {
      const { response, statusCode } = validationError('Validation failed. Please check your input.');
      return NextResponse.json({ ...response, details: validation.errors.errors }, { status: statusCode });
    }

    const data = validation.data as CreateCollectionRequest;

    // Create collection using service
    const service = getResourceLibraryService();
    const result = await service.createCollection(user.id, data);

    if (!result.success) {
      const { response, statusCode } = sanitizeError(new Error(result.error), {
        context: 'POST /api/resources/collections',
        userMessage: 'Failed to create collection. Please try again.',
        metadata: { userId: user.id },
      });
      return NextResponse.json(response, { status: statusCode });
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
    const { response, statusCode } = sanitizeError(error, {
      context: 'POST /api/resources/collections',
      userMessage: 'Failed to create collection. Please try again later.',
      metadata: { userId: 'create-collection' },
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
