import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id: goalId, milestoneId } = await params;
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
    const { title, description, targetDate, completed, notes } = body;

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (targetDate !== undefined) updateData.target_date = targetDate;
    if (notes !== undefined) updateData.notes = notes;

    if (completed !== undefined) {
      if (completed) {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }
    }

    // Update milestone
    const { data: milestone, error } = await supabase
      .from('goal_milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .eq('goal_id', goalId)
      .select()
      .single();

    if (error) {
      console.error('Error updating milestone:', error);
      return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
    }

    // If all milestones are completed, update goal progress
    const { data: allMilestones } = await supabase
      .from('goal_milestones')
      .select('completed_at')
      .eq('goal_id', goalId);

    if (allMilestones) {
      const completedCount = allMilestones.filter((m) => m.completed_at !== null).length;
      const progressPercentage = Math.round((completedCount / allMilestones.length) * 100);

      await supabase
        .from('client_goals')
        .update({ progress_percentage: progressPercentage })
        .eq('id', goalId);
    }

    return NextResponse.json({ milestone });
  } catch (error) {
    console.error('Milestone PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id: goalId, milestoneId } = await params;
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

    // Delete milestone
    const { error } = await supabase
      .from('goal_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('goal_id', goalId);

    if (error) {
      console.error('Error deleting milestone:', error);
      return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Milestone DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
