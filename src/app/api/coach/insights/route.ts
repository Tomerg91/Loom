import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const insightsQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
});

interface TimeRange {
  start: string;
  end: string;
}

function getTimeRange(range: string): TimeRange {
  const now = new Date();
  const start = new Date();

  switch (range) {
    case '7d':
      start.setDate(now.getDate() - 7);
      break;
    case '30d':
      start.setDate(now.getDate() - 30);
      break;
    case '90d':
      start.setDate(now.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setDate(now.getDate() - 30);
  }

  return {
    start: start.toISOString(),
    end: now.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a coach
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'coach') {
      return NextResponse.json(
        { error: 'Only coaches can access insights' },
        { status: 403 }
      );
    }

    const { searchParams } = request.nextUrl;
    const { timeRange } = insightsQuerySchema.parse({
      timeRange: searchParams.get('timeRange') || '30d',
    });

    const { start, end } = getTimeRange(timeRange);

    // Use optimized RPC functions for insights data
    const [overviewResult, metricsResult, clientProgressResult, goalAnalysisResult, feedbackResult] =
      await Promise.all([
        supabase.rpc('get_coach_insights_overview', {
          p_coach_id: user.id,
          p_start_date: start,
          p_end_date: end,
        }),
        supabase.rpc('get_coach_session_metrics', {
          p_coach_id: user.id,
          p_start_date: start,
          p_end_date: end,
        }),
        supabase.rpc('get_coach_client_progress', {
          p_coach_id: user.id,
          p_start_date: start,
          p_end_date: end,
          p_limit: 10,
        }),
        supabase.rpc('get_coach_goal_analysis', {
          p_coach_id: user.id,
          p_start_date: start,
          p_end_date: end,
        }),
        supabase.rpc('get_coach_feedback_list', {
          p_coach_id: user.id,
          p_start_date: start,
          p_end_date: end,
          p_limit: 10,
          p_offset: 0,
        }),
      ]);

    if (overviewResult.error) {
      console.error('Error fetching overview:', overviewResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch insights overview' },
        { status: 500 }
      );
    }

    if (metricsResult.error) {
      console.error('Error fetching metrics:', metricsResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch session metrics' },
        { status: 500 }
      );
    }

    if (clientProgressResult.error) {
      console.error('Error fetching client progress:', clientProgressResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch client progress' },
        { status: 500 }
      );
    }

    if (goalAnalysisResult.error) {
      console.error('Error fetching goal analysis:', goalAnalysisResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch goal analysis' },
        { status: 500 }
      );
    }

    if (feedbackResult.error) {
      console.error('Error fetching feedback:', feedbackResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    // Extract data from RPC results
    const overview = overviewResult.data?.[0] || {
      total_sessions: 0,
      completed_sessions: 0,
      cancelled_sessions: 0,
      unique_clients: 0,
      total_hours: 0,
      completion_rate: 0,
      average_mood_rating: 0,
      average_progress_rating: 0,
      estimated_revenue: 0,
      revenue_currency: 'USD',
      average_feedback_rating: 0,
      client_retention_rate: 0,
      notes_count: 0,
    };

    const sessionMetrics = (metricsResult.data || []).map((row: any) => ({
      date: row.date,
      completed: Number(row.completed),
      cancelled: Number(row.cancelled),
      total: Number(row.total),
      averageRating: Number(row.average_rating),
      revenue: Number(row.revenue),
    }));

    const clientProgress = (clientProgressResult.data || []).map((row: any) => ({
      id: row.client_id,
      name: row.client_name,
      sessionsCompleted: Number(row.sessions_completed),
      totalSessions: Number(row.total_sessions),
      averageMood: Number(row.average_mood),
      averageProgress: Number(row.average_progress),
      lastSession: row.last_session,
    }));

    const goalAnalysis = goalAnalysisResult.data?.[0] || {
      total_goals: 0,
      completed_goals: 0,
      achievement_rate: 0,
      average_time_to_goal: 0,
      most_common_goals: [],
    };

    const feedback = (feedbackResult.data || []).map((row: any) => ({
      clientName: row.client_name,
      rating: Number(row.rating),
      comment: row.comment,
      date: row.date,
      sessionType: row.session_type,
    }));

    const insights = {
      overview: {
        totalSessions: Number(overview.total_sessions),
        completedSessions: Number(overview.completed_sessions),
        cancelledSessions: Number(overview.cancelled_sessions),
        uniqueClients: Number(overview.unique_clients),
        totalHours: Number(overview.total_hours),
        completionRate: Number(overview.completion_rate),
        averageMoodRating: Number(overview.average_mood_rating),
        averageProgressRating: Number(overview.average_progress_rating),
        estimatedRevenue: Number(overview.estimated_revenue),
        revenueCurrency: overview.revenue_currency,
        averageFeedbackRating: Number(overview.average_feedback_rating),
        clientRetentionRate: Number(overview.client_retention_rate),
        notesCount: Number(overview.notes_count),
      },
      sessionMetrics,
      clientProgress,
      goalAnalysis: {
        mostCommonGoals: goalAnalysis.most_common_goals || [],
        achievementRate: Number(goalAnalysis.achievement_rate),
        averageTimeToGoal: Number(goalAnalysis.average_time_to_goal),
      },
      feedback,
      timeRange,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      data: insights,
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in coach insights GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
