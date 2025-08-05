import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { uuidSchema } from '@/lib/api/validation';
import { getCoachAvailability, setCoachAvailability } from '@/lib/database/availability';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

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
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id: coachId } = await params;
  
  // Validate UUID format
  const validationResult = uuidSchema.safeParse(coachId);
  if (!validationResult.success) {
    return createErrorResponse('Invalid coach ID format', HTTP_STATUS.BAD_REQUEST);
  }

  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date');
  const duration = parseInt(searchParams.get('duration') || '60');
  const detailed = searchParams.get('detailed') === 'true';

  if (!date) {
    return createErrorResponse('Date parameter is required', HTTP_STATUS.BAD_REQUEST);
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return createErrorResponse('Invalid date format. Use YYYY-MM-DD', HTTP_STATUS.BAD_REQUEST);
  }

  // Validate duration
  if (duration < 15 || duration > 480) {
    return createErrorResponse('Duration must be between 15 and 480 minutes', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const timeSlots = await getCoachAvailability(coachId, date, duration, detailed);
    return createSuccessResponse(timeSlots);
  } catch (error) {
    console.error('Error fetching coach availability:', error);
    return createErrorResponse(
      'Failed to fetch availability',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

// POST /api/coaches/[id]/availability - Set coach availability
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
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

  // Verify user is the coach or has admin rights
  if (user.id !== coachId) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return createErrorResponse('Forbidden', HTTP_STATUS.FORBIDDEN);
    }
  }

  try {
    const body = await request.json();
    const validatedData = setAvailabilitySchema.parse(body);

    const success = await setCoachAvailability(coachId, validatedData.slots, validatedData.timezone);
    
    if (!success) {
      return createErrorResponse('Failed to set availability', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    return createSuccessResponse({ 
      message: 'Availability updated successfully',
      data: validatedData.slots 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('Validation error', HTTP_STATUS.BAD_REQUEST);
    }

    console.error('Error in availability POST:', error);
    return createErrorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// OPTIONS /api/coaches/[id]/availability - Handle CORS preflight
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