import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: goalId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this goal
    const { data: goal } = await supabase
      .from('client_goals')
      .select('id')
      .eq('id', goalId)
      .or(`client_id.eq.${user.id},coach_id.eq.${user.id}`)
      .single();

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, targetDate } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create milestone
    const { data: milestone, error } = await supabase
      .from('goal_milestones')
      .insert({
        goal_id: goalId,
        title,
        description,
        target_date: targetDate,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating milestone:', error);
      return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
    }

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    console.error('Milestone POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
