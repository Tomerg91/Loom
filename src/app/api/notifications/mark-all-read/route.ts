import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
import { NotificationService } from '@/lib/database/notifications';

// POST /api/notifications/mark-all-read - Mark all notifications as read
export const POST = withErrorHandling(async () => {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  const notificationService = new NotificationService(true);
  const count = await notificationService.markAsRead(user.id);

  return createSuccessResponse({ 
    message: `${count} notifications marked as read`,
    count 
  });
});

// OPTIONS /api/notifications/mark-all-read - Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}