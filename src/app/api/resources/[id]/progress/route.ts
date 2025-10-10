/**
 * Resource Progress Tracking API Route
 *
 * POST /api/resources/[id]/progress - Track client progress on a resource
 *
 * @module api/resources/[id]/progress
 */

import { NextRequest, NextResponse } from 'next/server';

import { getResourceById, trackResourceProgress } from '@/lib/database/resources';
import { trackResourceProgress } from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
import { sanitizeError, unauthorizedError, validationError } from '@/lib/utils/api-errors';
import { trackProgressSchema, validateData } from '@/lib/validations/resources';
import type { ResourceLibraryItem } from '@/types/resources';

/**
 * POST /api/resources/[id]/progress
 *
 * Track client progress on a resource (viewed, completed, accessed)
 *
 * Request Body:
 * {
 *   action: 'viewed' | 'completed' | 'accessed'
 * }
 *
 * Returns:
 * {
 *   success: true
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const resourceId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validation = validateData(trackProgressSchema, body);

    if (!validation.success) {
      const { response, statusCode } = validationError('Invalid progress tracking data. Action must be one of: viewed, completed, accessed.');
      return NextResponse.json(response, { status: statusCode });
    }

    const { action } = validation.data;

    // Ensure the user has access to this resource before tracking progress
    let resource: ResourceLibraryItem | null;
    try {
      resource = await getResourceById(resourceId, user.id);
    } catch (error) {
      if (error instanceof Error && error.message === 'Access denied') {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
      throw error;
    }

    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Track progress
    await trackResourceProgress(resourceId, user.id, action);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'POST /api/resources/[id]/progress',
      userMessage: 'Failed to track progress. Please try again.',
      metadata: { resourceId: params.id },
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
