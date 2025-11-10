import { NextRequest } from 'next/server';

import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { NotificationService } from '@/lib/database/notifications';
import { createCorsResponse } from '@/lib/security/cors';

// POST /api/notifications/mark-all-read - Mark all notifications as read
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Authenticate user
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return createErrorResponse(
      'Authentication required',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Get authenticated user from Supabase
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return createErrorResponse(
      'Invalid authentication token',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Get user profile from database
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, role, status')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    return createErrorResponse(
      'User profile not found',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Check if user is active
  if (userProfile.status !== 'active') {
    return createErrorResponse(
      'User account is not active',
      HTTP_STATUS.FORBIDDEN
    );
  }

  const notificationService = new NotificationService(true);
  const count = await notificationService.markAsRead(authUser.id);

  return createSuccessResponse({ 
    message: `${count} notifications marked as read`,
    count 
  });
});

// OPTIONS /api/notifications/mark-all-read - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}