import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema } from '@/lib/api/validation';
import { getCoachAvailability, setCoachAvailability } from '@/lib/database/availability';
import { createCorsResponse } from '@/lib/security/cors';

const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  timezone: z.string().optional(),
});

const setAvailabilitySchema = z.object({
  slots: z.array(availabilitySlotSchema),
  timezone: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/coaches/[id]/availability - Get coach availability for a specific date
// Note: This endpoint allows public (unauthenticated) access for browsing coaches
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  // Use authenticated client to handle any auth cookies if present
  const { response: authResponse } = createAuthenticatedSupabaseClient(
    request,
    new NextResponse()
  );

  const { id: coachId } = await params;

  // Validate UUID format
  const validationResult = uuidSchema.safeParse(coachId);
  if (!validationResult.success) {
    const errorResponse = createErrorResponse('Invalid coach ID format', HTTP_STATUS.BAD_REQUEST);
    return propagateCookies(authResponse, errorResponse);
  }

  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date');
  const duration = parseInt(searchParams.get('duration') || '60');
  const detailed = searchParams.get('detailed') === 'true';

  if (!date) {
    const errorResponse = createErrorResponse('Date parameter is required', HTTP_STATUS.BAD_REQUEST);
    return propagateCookies(authResponse, errorResponse);
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    const errorResponse = createErrorResponse('Invalid date format. Use YYYY-MM-DD', HTTP_STATUS.BAD_REQUEST);
    return propagateCookies(authResponse, errorResponse);
  }

  // Validate duration
  if (duration < 15 || duration > 480) {
    const errorResponse = createErrorResponse('Duration must be between 15 and 480 minutes', HTTP_STATUS.BAD_REQUEST);
    return propagateCookies(authResponse, errorResponse);
  }

  try {
    const timeSlots = await getCoachAvailability(coachId, date, duration, detailed);
    const successResponse = createSuccessResponse(timeSlots);
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    console.error('Error fetching coach availability:', error);
    const errorResponse = createErrorResponse(
      'Failed to fetch availability',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return propagateCookies(authResponse, errorResponse);
  }
});

// POST /api/coaches/[id]/availability - Set coach availability
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
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

  // Verify user is the coach or has admin rights
  if (user.id !== coachId) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      const errorResponse = createErrorResponse('Forbidden', HTTP_STATUS.FORBIDDEN);
      return propagateCookies(authResponse, errorResponse);
    }
  }

  try {
    const body = await request.json();
    const validatedData = setAvailabilitySchema.parse(body);

    const success = await setCoachAvailability(coachId, validatedData.slots, validatedData.timezone);

    if (!success) {
      const errorResponse = createErrorResponse('Failed to set availability', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return propagateCookies(authResponse, errorResponse);
    }

    const successResponse = createSuccessResponse({
      message: 'Availability updated successfully',
      data: validatedData.slots
    });
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse = createErrorResponse('Validation error', HTTP_STATUS.BAD_REQUEST);
      return propagateCookies(authResponse, errorResponse);
    }

    console.error('Error in availability POST:', error);
    const errorResponse = createErrorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    return propagateCookies(authResponse, errorResponse);
  }
});

// OPTIONS /api/coaches/[id]/availability - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}