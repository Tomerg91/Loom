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
import { sanitizeError, unauthorizedError, forbiddenError, notFoundError } from '@/lib/utils/api-errors';

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
      const { response, statusCode } = unauthorizedError();
      return NextResponse.json(response, { status: statusCode });
    }

    // Verify user is a coach
    const userRole = user.user_metadata?.role;
    if (userRole !== 'coach' && userRole !== 'admin') {
      const { response, statusCode } = forbiddenError('Only coaches can access analytics.');
      return NextResponse.json(response, { status: statusCode });
    }

    const searchParams = request.nextUrl.searchParams;
    const resourceId = searchParams.get('resourceId');

    const service = getResourceLibraryService();

    if (resourceId) {
      // Get analytics for specific resource
      const result = await service.getResourceAnalytics(resourceId, user.id);

      if (!result.success) {
        if (result.error === 'Resource not found') {
          const { response, statusCode } = notFoundError('Resource');
          return NextResponse.json(response, { status: statusCode });
        }
        const { response, statusCode } = sanitizeError(new Error(result.error), {
          context: 'GET /api/resources/analytics',
          userMessage: 'Failed to fetch resource analytics. Please try again.',
          metadata: { resourceId, userId: user.id },
        });
        return NextResponse.json(response, { status: statusCode });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      // Get library-wide analytics
      const result = await service.getLibraryAnalytics(user.id);

      if (!result.success) {
        const { response, statusCode } = sanitizeError(new Error(result.error), {
          context: 'GET /api/resources/analytics',
          userMessage: 'Failed to fetch library analytics. Please try again.',
          metadata: { userId: user.id },
        });
        return NextResponse.json(response, { status: statusCode });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'GET /api/resources/analytics',
      userMessage: 'Failed to fetch analytics. Please try again later.',
      metadata: { userId: 'analytics' },
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
