/**
 * Resource Library Settings API Routes
 *
 * GET  /api/resources/settings - Get library settings for authenticated coach
 * PUT  /api/resources/settings - Update library settings
 *
 * @module api/resources/settings
 */

import { NextRequest, NextResponse } from 'next/server';

import { getResourceLibraryService } from '@/lib/services/resource-library-service';
import { createClient } from '@/lib/supabase/server';
import {
  sanitizeError,
  unauthorizedError,
  forbiddenError,
  validationError,
} from '@/lib/utils/api-errors';
import type { UpdateLibrarySettingsRequest } from '@/types/resources';

/**
 * GET /api/resources/settings
 *
 * Get resource library settings for the authenticated coach
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     settings: ResourceLibrarySettings
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
        'Only coaches can access library settings.'
      );
      return NextResponse.json(response, { status: statusCode });
    }

    // Get settings using service
    const service = getResourceLibraryService();
    const result = await service.getSettings(user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        settings: result.data,
      },
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'GET /api/resources/settings',
      userMessage: 'Failed to fetch library settings. Please try again.',
    });
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * PUT /api/resources/settings
 *
 * Update resource library settings
 *
 * Request Body:
 * {
 *   defaultPermission?: 'view' | 'download',
 *   autoShareNewClients?: boolean,
 *   allowClientRequests?: boolean
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     settings: ResourceLibrarySettings
 *   }
 * }
 */
export async function PUT(request: NextRequest) {
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
        'Only coaches can update library settings.'
      );
      return NextResponse.json(response, { status: statusCode });
    }

    // Parse request body
    const body = (await request.json()) as UpdateLibrarySettingsRequest;

    // Validate at least one field to update
    if (
      body.defaultPermission === undefined &&
      body.autoShareNewClients === undefined &&
      body.allowClientRequests === undefined
    ) {
      const { response, statusCode } = validationError(
        'At least one field must be provided to update.'
      );
      return NextResponse.json(response, { status: statusCode });
    }

    // Validate defaultPermission if provided
    if (
      body.defaultPermission &&
      body.defaultPermission !== 'view' &&
      body.defaultPermission !== 'download'
    ) {
      const { response, statusCode } = validationError(
        'Default permission must be "view" or "download".'
      );
      return NextResponse.json(response, { status: statusCode });
    }

    // Update settings using service
    const service = getResourceLibraryService();
    const result = await service.updateSettings(user.id, body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        settings: result.data,
      },
    });
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'PUT /api/resources/settings',
      userMessage: 'Failed to update library settings. Please try again.',
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
