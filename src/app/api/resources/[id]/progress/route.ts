/**
 * Resource Progress Tracking API Route
 *
 * POST /api/resources/[id]/progress - Track client progress on a resource
 *
 * @module api/resources/[id]/progress
 */

import { NextRequest, NextResponse } from 'next/server';

import { trackResourceProgress } from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
import { sanitizeError, unauthorizedError, validationError } from '@/lib/utils/api-errors';
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
