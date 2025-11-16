import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch goal with milestones
    const { data: goal, error } = await supabase
      .from('client_goals')
      .select(
        `
        *,
        goal_milestones (*)
      `
      )
      .eq('id', id)
      .or(`client_id.eq.${user.id},coach_id.eq.${user.id}`)
      .single();

    if (error) {
      console.error('Error fetching goal:', error);
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Goal GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    const { title, description, category, targetDate, status, progressPercentage, priority } = body;

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (targetDate !== undefined) updateData.target_date = targetDate;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.progress_percentage = 100;
      }
    }
    if (progressPercentage !== undefined) updateData.progress_percentage = progressPercentage;
    if (priority !== undefined) updateData.priority = priority;

    // Update goal
    const { data: goal, error } = await supabase
      .from('client_goals')
      .update(updateData)
      .eq('id', id)
      .or(`client_id.eq.${user.id},coach_id.eq.${user.id}`)
      .select()
      .single();

    if (error) {
      console.error('Error updating goal:', error);
      return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
    }

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Goal PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete goal (milestones will be deleted via CASCADE)
    const { error } = await supabase
      .from('client_goals')
      .delete()
      .eq('id', id)
      .or(`client_id.eq.${user.id},coach_id.eq.${user.id}`);

    if (error) {
      console.error('Error deleting goal:', error);
      return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Goal DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
