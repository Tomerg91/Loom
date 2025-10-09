/**
 * Resource Progress Tracking API Route
 *
 * POST /api/resources/[id]/progress - Track client progress on a resource
 *
 * @module api/resources/[id]/progress
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  getResourceById,
  trackResourceProgress,
} from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resourceId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validation = validateData(trackProgressSchema, body);

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
    console.error('POST /api/resources/[id]/progress error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
