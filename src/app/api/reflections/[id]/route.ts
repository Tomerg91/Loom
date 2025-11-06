import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
import { createErrorResponse, HTTP_STATUS } from '@/lib/api/utils';
import { logger } from '@/lib/logger';

const updateReflectionSchema = z.object({
  content: z.string().min(10).max(2000).optional(),
  moodRating: z.number().min(1).max(10).optional(),
  insights: z.string().max(1000).optional(),
  goalsForNextSession: z.string().max(1000).optional(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse = createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return propagateCookies(authResponse, errorResponse);
    }

    const { data: reflection, error } = await supabase
      .from('reflections')
      .select(`
        id,
        client_id,
        session_id,
        content,
        mood_rating,
        insights,
        goals_for_next_session,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('client_id', user.id)
      .single();

    if (error || !reflection) {
      const errorResponse = createErrorResponse('Reflection not found', HTTP_STATUS.NOT_FOUND);
      return propagateCookies(authResponse, errorResponse);
    }

    // Transform response
    const transformedReflection = {
      id: reflection.id,
      clientId: reflection.client_id,
      sessionId: reflection.session_id,
      content: reflection.content,
      moodRating: reflection.mood_rating,
      insights: reflection.insights,
      goalsForNextSession: reflection.goals_for_next_session,
      createdAt: reflection.created_at,
      updatedAt: reflection.updated_at,
    };

    const successResponse = NextResponse.json({ data: transformedReflection });
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    logger.error('Error in reflection GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse = createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return propagateCookies(authResponse, errorResponse);
    }

    const body = await request.json();
    const validatedData = updateReflectionSchema.parse(body);

    // Verify reflection exists and belongs to user
    const { data: existingReflection, error: fetchError } = await supabase
      .from('reflections')
      .select('id, client_id')
      .eq('id', id)
      .eq('client_id', user.id)
      .single();

    if (fetchError || !existingReflection) {
      const errorResponse = createErrorResponse('Reflection not found', HTTP_STATUS.NOT_FOUND);
      return propagateCookies(authResponse, errorResponse);
    }

    // Update reflection
    const { data: reflection, error } = await supabase
      .from('reflections')
      .update({
        content: validatedData.content,
        mood_rating: validatedData.moodRating,
        insights: validatedData.insights,
        goals_for_next_session: validatedData.goalsForNextSession,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('client_id', user.id)
      .select(`
        id,
        client_id,
        session_id,
        content,
        mood_rating,
        insights,
        goals_for_next_session,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      logger.error('Error updating reflection:', error);
      const errorResponse = createErrorResponse('Failed to update reflection', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return propagateCookies(authResponse, errorResponse);
    }

    // Transform response
    const transformedReflection = {
      id: reflection.id,
      clientId: reflection.client_id,
      sessionId: reflection.session_id,
      content: reflection.content,
      moodRating: reflection.mood_rating,
      insights: reflection.insights,
      goalsForNextSession: reflection.goals_for_next_session,
      createdAt: reflection.created_at,
      updatedAt: reflection.updated_at,
    };

    const successResponse = NextResponse.json({ data: transformedReflection });
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error in reflection PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse = createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return propagateCookies(authResponse, errorResponse);
    }

    // Verify reflection exists and belongs to user
    const { data: existingReflection, error: fetchError } = await supabase
      .from('reflections')
      .select('id')
      .eq('id', id)
      .eq('client_id', user.id)
      .single();

    if (fetchError || !existingReflection) {
      const errorResponse = createErrorResponse('Reflection not found', HTTP_STATUS.NOT_FOUND);
      return propagateCookies(authResponse, errorResponse);
    }

    // Delete reflection
    const { error } = await supabase
      .from('reflections')
      .delete()
      .eq('id', id)
      .eq('client_id', user.id);

    if (error) {
      logger.error('Error deleting reflection:', error);
      const errorResponse = createErrorResponse('Failed to delete reflection', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return propagateCookies(authResponse, errorResponse);
    }

    const successResponse = NextResponse.json({ message: 'Reflection deleted successfully' });
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    logger.error('Error in reflection DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}