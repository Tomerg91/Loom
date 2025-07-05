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

// POST /api/notifications/[id]/read - Mark notification as read
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  const notificationService = new NotificationService(true);
  const success = await notificationService.markSingleAsRead(params.id, user.id);

  if (!success) {
    return createErrorResponse('Failed to mark notification as read', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return createSuccessResponse({ message: 'Notification marked as read' });
});

// OPTIONS /api/notifications/[id]/read - Handle CORS preflight
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