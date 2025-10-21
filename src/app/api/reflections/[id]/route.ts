import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerClient } from '@/lib/supabase/server';

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
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Reflection not found' }, { status: 404 });
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

    return NextResponse.json({ data: transformedReflection });
  } catch (error) {
    console.error('Error in reflection GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Reflection not found' }, { status: 404 });
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
      console.error('Error updating reflection:', error);
      return NextResponse.json({ error: 'Failed to update reflection' }, { status: 500 });
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

    return NextResponse.json({ data: transformedReflection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in reflection PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify reflection exists and belongs to user
    const { data: existingReflection, error: fetchError } = await supabase
      .from('reflections')
      .select('id')
      .eq('id', id)
      .eq('client_id', user.id)
      .single();

    if (fetchError || !existingReflection) {
      return NextResponse.json({ error: 'Reflection not found' }, { status: 404 });
    }

    // Delete reflection
    const { error } = await supabase
      .from('reflections')
      .delete()
      .eq('id', id)
      .eq('client_id', user.id);

    if (error) {
      console.error('Error deleting reflection:', error);
      return NextResponse.json({ error: 'Failed to delete reflection' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Reflection deleted successfully' });
  } catch (error) {
    console.error('Error in reflection DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}