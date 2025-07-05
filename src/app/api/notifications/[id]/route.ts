import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
import { NotificationService } from '@/lib/database/notifications';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/notifications/[id] - Get specific notification
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  const notificationService = new NotificationService(true);
  const notification = await notificationService.getNotification(params.id);

  if (!notification || notification.userId !== user.id) {
    return createErrorResponse('Notification not found', HTTP_STATUS.NOT_FOUND);
  }

  return createSuccessResponse(notification);
});

// DELETE /api/notifications/[id] - Delete notification
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  const notificationService = new NotificationService(true);
  const success = await notificationService.deleteNotification(params.id, user.id);

  if (!success) {
    return createErrorResponse('Failed to delete notification', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return createSuccessResponse({ message: 'Notification deleted successfully' });
});

// OPTIONS /api/notifications/[id] - Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}