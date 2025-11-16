import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('client_goals')
      .select(
        `
        *,
        goal_milestones (*)
      `
      )
      .order('created_at', { ascending: false });

    // Filter based on user role
    if (clientId) {
      // Coach requesting specific client's goals
      query = query.eq('client_id', clientId).eq('coach_id', user.id);
    } else {
      // User requesting their own goals (as client or coach)
      query = query.or(`client_id.eq.${user.id},coach_id.eq.${user.id}`);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: goals, error } = await query;

    if (error) {
      console.error('Error fetching goals:', error);
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
    }

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Goals GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, targetDate, priority, clientId, coachId } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Determine client_id and coach_id
    let finalClientId = clientId || user.id;
    let finalCoachId = coachId;

    // If coach is creating, they must specify client
    if (!finalCoachId) {
      // User is a client creating their own goal - need to find their coach
      const { data: sessions } = await supabase
        .from('sessions')
        .select('coach_id')
        .eq('client_id', finalClientId)
        .limit(1)
        .single();

      if (sessions?.coach_id) {
        finalCoachId = sessions.coach_id;
      }
    }

    if (!finalCoachId) {
      return NextResponse.json(
        { error: 'Coach ID is required. Client must have at least one session with a coach.' },
        { status: 400 }
      );
    }

    // Create goal
    const { data: goal, error } = await supabase
      .from('client_goals')
      .insert({
        client_id: finalClientId,
        coach_id: finalCoachId,
        title,
        description,
        category,
        target_date: targetDate,
        priority: priority || 'medium',
        status: 'active',
        progress_percentage: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('Goals POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
