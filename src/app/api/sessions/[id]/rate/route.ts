import { NextRequest } from 'next/server';
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  HTTP_STATUS
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionById } from '@/lib/database/sessions';
import { z } from 'zod';
import { createCorsResponse } from '@/lib/security/cors';

const rateSessionSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  feedback: z.string().max(1000, 'Feedback must be less than 1000 characters').optional(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
});

// POST /api/sessions/[id]/rate - Rate a completed session
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  const sessionId = params.id;

  // Get session details
  const session = await getSessionById(sessionId);

  if (!session) {
    return createErrorResponse('Session not found', HTTP_STATUS.NOT_FOUND);
  }

  // Authorization: only the client can rate the session
  if (user.id !== session.clientId) {
    return createErrorResponse(
      'Only clients can rate sessions',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Only allow rating completed sessions
  if (session.status !== 'completed') {
    return createErrorResponse(
      'Only completed sessions can be rated',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Parse and validate request body
  const body = await request.json();
  const validatedData = rateSessionSchema.parse(body);

  // Check if session has already been rated
  const { data: existingRating } = await supabase
    .from('session_ratings')
    .select('id')
    .eq('session_id', sessionId)
    .eq('rated_by', user.id)
    .single();

  if (existingRating) {
    // Update existing rating
    const { data: updatedRating, error: updateError } = await supabase
      .from('session_ratings')
      .update({
        rating: validatedData.rating,
        feedback: validatedData.feedback,
        tags: validatedData.tags || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRating.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update rating: ${updateError.message}`);
    }

    return createSuccessResponse(
      {
        id: updatedRating.id,
        sessionId: updatedRating.session_id,
        rating: updatedRating.rating,
        feedback: updatedRating.feedback,
        tags: updatedRating.tags,
        updatedAt: updatedRating.updated_at,
      },
      'Rating updated successfully'
    );
  } else {
    // Create new rating
    const { data: newRating, error: insertError } = await supabase
      .from('session_ratings')
      .insert({
        session_id: sessionId,
        rated_by: user.id,
        coach_id: session.coachId,
        rating: validatedData.rating,
        feedback: validatedData.feedback,
        tags: validatedData.tags || [],
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create rating: ${insertError.message}`);
    }

    // Create notification for coach
    const { data: clientData } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const clientName = clientData
      ? `${clientData.first_name} ${clientData.last_name || ''}`.trim()
      : 'A client';

    const stars = '⭐'.repeat(validatedData.rating);

    await supabase.from('notifications').insert({
      user_id: session.coachId,
      type: 'session_update',
      title: 'New Session Rating',
      message: `${clientName} rated "${session.title}": ${stars} (${validatedData.rating}/5)${validatedData.feedback ? `. Feedback: ${validatedData.feedback.substring(0, 100)}${validatedData.feedback.length > 100 ? '...' : ''}` : ''}`,
      data: {
        type: 'session_rated',
        session_id: sessionId,
        rating: validatedData.rating,
        rated_by: user.id,
      },
    });

    return createSuccessResponse(
      {
        id: newRating.id,
        sessionId: newRating.session_id,
        rating: newRating.rating,
        feedback: newRating.feedback,
        tags: newRating.tags,
        createdAt: newRating.created_at,
      },
      'Session rated successfully',
      HTTP_STATUS.CREATED
    );
  }
});

// GET /api/sessions/[id]/rate - Get rating for a session
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  const sessionId = params.id;

  // Get session to verify access
  const session = await getSessionById(sessionId);

  if (!session) {
    return createErrorResponse('Session not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if user has access to this session
  if (user.id !== session.coachId && user.id !== session.clientId) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return createErrorResponse('Forbidden', HTTP_STATUS.FORBIDDEN);
    }
  }

  // Get rating
  const { data: rating, error } = await supabase
    .from('session_ratings')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error || !rating) {
    return createSuccessResponse(null, 'No rating found for this session');
  }

  return createSuccessResponse({
    id: rating.id,
    sessionId: rating.session_id,
    rating: rating.rating,
    feedback: rating.feedback,
    tags: rating.tags,
    ratedBy: rating.rated_by,
    createdAt: rating.created_at,
    updatedAt: rating.updated_at,
  });
});

// OPTIONS /api/sessions/[id]/rate - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}
