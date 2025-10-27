import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch quick actions (e.g., pending tasks)
    const { data: actionsData, error: actionsError } = await supabase
      .from('actions')
      .select('id, title, count')
      .eq('user_id', user.id)
      .limit(4);

    // Fetch statistics (e.g., active clients, upcoming sessions)
    const { data: statsData, error: statsError } = await supabase
      .from('user_stats')
      .select('active_clients, upcoming_sessions')
      .eq('user_id', user.id)
      .single();

    if (actionsError || statsError) {
      return NextResponse.json(
        { error: 'Failed to fetch summary' },
        { status: 500 }
      );
    }

    const summary = {
      actions: actionsData || [],
      stats: statsData || { active_clients: 0, upcoming_sessions: 0 },
    };

    // Cache for 30 seconds
    const response = NextResponse.json(summary);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return response;
  } catch (error) {
    console.error('Dashboard summary API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
