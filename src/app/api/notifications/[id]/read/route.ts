import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { NotificationService } from '@/lib/database/notifications';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import { setSupabaseCookieStore } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/notifications/[id]/read - Mark notification as read
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const cookieStore = cookies();
  setSupabaseCookieStore(cookieStore);
  
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
  const success = await notificationService.markSingleAsRead(id, authUser.id);

  if (!success) {
    return createErrorResponse('Failed to mark notification as read', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return createSuccessResponse({ message: 'Notification marked as read' });
});

// OPTIONS /api/notifications/[id]/read - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const cookieStore = cookies();
  setSupabaseCookieStore(cookieStore);
  return createCorsResponse(request);
}