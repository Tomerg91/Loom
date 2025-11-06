import { NextRequest, NextResponse } from 'next/server';

import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema } from '@/lib/api/validation';
import { getCoachSchedule } from '@/lib/database/availability';
import { createCorsResponse } from '@/lib/security/cors';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/coaches/[id]/schedule - Get coach's weekly availability schedule
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
    request,
    new NextResponse()
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    const errorResponse = createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
    return propagateCookies(authResponse, errorResponse);
  }

  const { id: coachId } = await params;

  // Validate UUID format
  const validationResult = uuidSchema.safeParse(coachId);
  if (!validationResult.success) {
    const errorResponse = createErrorResponse('Invalid coach ID format', HTTP_STATUS.BAD_REQUEST);
    return propagateCookies(authResponse, errorResponse);
  }

  // Verify user is the coach or has appropriate access
  if (user.id !== coachId) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'client') {
      const errorResponse = createErrorResponse('Forbidden', HTTP_STATUS.FORBIDDEN);
      return propagateCookies(authResponse, errorResponse);
    }
  }

  try {
    const schedule = await getCoachSchedule(coachId);
    const successResponse = createSuccessResponse({ data: schedule });
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    logger.error('Error fetching coach schedule:', error);
    const errorResponse = createErrorResponse(
      'Failed to fetch schedule',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return propagateCookies(authResponse, errorResponse);
  }
});

// OPTIONS /api/coaches/[id]/schedule - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}