import { NextRequest } from 'next/server';

import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  requireAuth,
  HTTP_STATUS,
  handlePreflight
} from '@/lib/api/utils';
import { NotificationService } from '@/lib/database/notifications';
import { rateLimit } from '@/lib/security/rate-limit';

// GET /api/notifications - List notifications with pagination and filters
export const GET = withErrorHandling(
  rateLimit(150, 60000)( // 150 requests per minute
    requireAuth(async (user, request: NextRequest, context: { params: Promise<{}> }) => {
      const { searchParams } = request.nextUrl;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const sortBy = searchParams.get('sortBy') || 'created_at';
      const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
      const type = searchParams.get('type');
      const unreadOnly = searchParams.get('unreadOnly') === 'true';

      const offset = (page - 1) * limit;

      const notificationService = new NotificationService(true);

      // Fetch notifications and counts
      const [notifications, total, unreadCount] = await Promise.all([
        notificationService.getNotificationsPaginated({
          userId: user.id,
          limit,
          offset,
          sortBy,
          sortOrder,
          isRead: unreadOnly ? false : undefined,
          type: type || undefined,
        }),
        notificationService.getNotificationsCount({
          userId: user.id,
          isRead: unreadOnly ? false : undefined,
          type: type || undefined,
        }),
        notificationService.getUnreadCount(user.id),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return createSuccessResponse({
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
    })
  )
);

// POST /api/notifications - Create new notification
export const POST = withErrorHandling(
  rateLimit(150, 60000)( // 150 requests per minute
    requireAuth(async (user, request: NextRequest, context: { params: Promise<{}> }) => {
      // Check if user has permission to create notifications (admin or coach)
      if (user.role !== 'admin' && user.role !== 'coach') {
        return createErrorResponse(
          'Access denied. Required role: admin or coach',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const body = await request.json();
      const notificationService = new NotificationService(true);

      const notification = await notificationService.createNotificationFromApi({
        userId: body.userId,
        type: body.type,
        title: body.title,
        content: body.message,
        scheduledFor: body.scheduledFor,
        metadata: body.data,
      });

      if (!notification) {
        return createErrorResponse('Failed to create notification', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }

      return createSuccessResponse(notification, 'Notification created successfully', HTTP_STATUS.CREATED);
    })
  )
);

// OPTIONS /api/notifications - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}