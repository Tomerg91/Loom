import { NextRequest, NextResponse } from 'next/server';

import {
  createAuthenticatedSupabaseClient,
  propagateCookies,
} from '@/lib/api/auth-client';
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  HTTP_STATUS,
  handlePreflight,
} from '@/lib/api/utils';
import { NotificationService } from '@/lib/database/notifications';
import { rateLimit } from '@/lib/security/rate-limit';

// GET /api/notifications - List notifications with pagination and filters
export const GET = withErrorHandling(
  rateLimit(
    150,
    60000
  )(
    // 150 requests per minute
    async (request: NextRequest) => {
      // Use authenticated client helper for cookie handling
      const { client: supabase, response: authResponse } =
        createAuthenticatedSupabaseClient(request, new NextResponse());

      // Get current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        const errorResponse = createErrorResponse(
          'Authentication required',
          HTTP_STATUS.UNAUTHORIZED
        );
        return propagateCookies(authResponse, errorResponse);
      }

      const { searchParams } = request.nextUrl;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const sortBy = searchParams.get('sortBy') || 'created_at';
      const sortOrder =
        (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
      const type = searchParams.get('type');
      const unreadOnly = searchParams.get('unreadOnly') === 'true';

      const offset = (page - 1) * limit;

      // Pass authenticated client to NotificationService
      const notificationService = new NotificationService(true, supabase);

      // Fetch notifications and counts
      const [notifications, total, unreadCount] = await Promise.all([
        notificationService.getNotificationsPaginated({
          userId: session.user.id,
          limit,
          offset,
          sortBy,
          sortOrder,
          isRead: unreadOnly ? false : undefined,
          type: type || undefined,
        }),
        notificationService.getNotificationsCount({
          userId: session.user.id,
          isRead: unreadOnly ? false : undefined,
          type: type || undefined,
        }),
        notificationService.getUnreadCount(session.user.id),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      const successResponse = createSuccessResponse({
        data: notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          unreadCount,
          hasNext,
          hasPrev,
        },
      });

      return propagateCookies(authResponse, successResponse);
    }
  )
);

// POST /api/notifications - Create new notification
export const POST = withErrorHandling(
  rateLimit(
    150,
    60000
  )(
    // 150 requests per minute
    async (request: NextRequest) => {
      // Use authenticated client helper for cookie handling
      const { client: supabase, response: authResponse } =
        createAuthenticatedSupabaseClient(request, new NextResponse());

      // Get current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        const errorResponse = createErrorResponse(
          'Authentication required',
          HTTP_STATUS.UNAUTHORIZED
        );
        return propagateCookies(authResponse, errorResponse);
      }

      // Fetch user profile to check role
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      // Check if user has permission to create notifications (admin or coach)
      if (
        !userProfile ||
        (userProfile.role !== 'admin' && userProfile.role !== 'coach')
      ) {
        const errorResponse = createErrorResponse(
          'Access denied. Required role: admin or coach',
          HTTP_STATUS.FORBIDDEN
        );
        return propagateCookies(authResponse, errorResponse);
      }

      const body = await request.json();

      // Pass authenticated client to NotificationService
      const notificationService = new NotificationService(true, supabase);

      const notification = await notificationService.createNotificationFromApi({
        userId: body.userId,
        type: body.type,
        title: body.title,
        content: body.message,
        scheduledFor: body.scheduledFor,
        metadata: body.data,
      });

      if (!notification) {
        const errorResponse = createErrorResponse(
          'Failed to create notification',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
        return propagateCookies(authResponse, errorResponse);
      }

      const successResponse = createSuccessResponse(
        notification,
        'Notification created successfully',
        HTTP_STATUS.CREATED
      );
      return propagateCookies(authResponse, successResponse);
    }
  )
);

// OPTIONS /api/notifications - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}
