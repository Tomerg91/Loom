import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema } from '@/lib/api/validation';
import { getCoachSchedule } from '@/lib/database/availability';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/coaches/[id]/schedule - Get coach's weekly availability schedule
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  const { id: coachId } = await params;
  
  // Validate UUID format
  const validationResult = uuidSchema.safeParse(coachId);
  if (!validationResult.success) {
    return createErrorResponse('Invalid coach ID format', HTTP_STATUS.BAD_REQUEST);
  }

  // Verify user is the coach or has appropriate access
  if (user.id !== coachId) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'client') {
      return createErrorResponse('Forbidden', HTTP_STATUS.FORBIDDEN);
    }
  }

  try {
    const schedule = await getCoachSchedule(coachId);
    return createSuccessResponse({ data: schedule });
  } catch (error) {
    console.error('Error fetching coach schedule:', error);
    return createErrorResponse(
      'Failed to fetch schedule',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

// OPTIONS /api/coaches/[id]/schedule - Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}