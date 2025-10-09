/**
 * Resource Analytics API Route
 *
 * GET /api/resources/analytics - Get library-wide analytics for coach
 *
 * @module api/resources/analytics
 */

import { NextRequest, NextResponse } from 'next/server';

import { getResourceLibraryService } from '@/lib/services/resource-library-service';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/resources/analytics
 *
 * Get overall library analytics for the authenticated coach
 *
 * Query Parameters:
 * - resourceId: Get analytics for a specific resource (optional)
 *
 * Returns:
 * {
 *   success: true,
 *   data: LibraryAnalytics | ResourceAnalytics
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
        { success: false, error: 'Only coaches can access analytics' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const resourceId = searchParams.get('resourceId');

    const service = getResourceLibraryService();

    if (resourceId) {
      // Get analytics for specific resource
      const result = await service.getResourceAnalytics(resourceId, user.id);

      if (!result.success) {
        const status = result.error === 'Resource not found' ? 404 : 400;
        return NextResponse.json(
          { success: false, error: result.error },
          { status }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      // Get library-wide analytics
      const result = await service.getLibraryAnalytics(user.id);

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
    }
  } catch (error) {
    console.error('GET /api/resources/analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
