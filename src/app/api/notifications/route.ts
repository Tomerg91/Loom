import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
import { NotificationService } from '@/lib/database/notifications';

// GET /api/notifications - List notifications with pagination and filters
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

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
      type,
    }),
    notificationService.getNotificationsCount({
      userId: user.id,
      isRead: unreadOnly ? false : undefined,
      type,
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
});

// POST /api/notifications - Create new notification
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  // Check if user has permission to create notifications (admin or coach)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'coach') {
    return createErrorResponse('Insufficient permissions', HTTP_STATUS.FORBIDDEN);
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
});

// OPTIONS /api/notifications - Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}