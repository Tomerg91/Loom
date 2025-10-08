/**
 * Resource Progress Tracking API Route
 *
 * POST /api/resources/[id]/progress - Track client progress on a resource
 *
 * @module api/resources/[id]/progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { trackResourceProgress } from '@/lib/database/resources';
import { trackProgressSchema, validateData } from '@/lib/validations/resources';

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
