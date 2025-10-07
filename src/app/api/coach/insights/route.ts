import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCoachSessionRate } from '@/lib/coach-dashboard/coach-profile';
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
    end: now.toISOString()
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
      return NextResponse.json({ error: 'Only coaches can access insights' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const { timeRange } = insightsQuerySchema.parse({
      timeRange: searchParams.get('timeRange') || '30d'
    });

    const { start, end } = getTimeRange(timeRange);

    // Get comprehensive session data with client information
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        status,
        created_at,
        client_id,
        users!inner(
          id,
          first_name,
          last_name,
          email,
          created_at
        )
      `)
      .eq('coach_id', user.id)
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)
      .order('scheduled_at', { ascending: true });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch session data' }, { status: 500 });
    }

    const sessionIds = sessions?.map((session) => session.id) ?? [];

    // Get coach notes for insights
    const { data: notes, error: notesError } = await supabase
      .from('coach_notes')
      .select('id, client_id, created_at, privacy_level')
      .eq('coach_id', user.id)
      .gte('created_at', start)
      .lte('created_at', end);

    if (notesError) {
      console.error('Error fetching notes:', notesError);
    }

    // Get client reflections for mood/progress insights
    const clientIds = [...new Set(sessions?.map(s => s.client_id) || [])];
    type ReflectionRow = {
      client_id: string;
      mood_rating: number | null;
      progress_rating: number | null;
      created_at: string;
    };
    let reflections: ReflectionRow[] = [];

    if (clientIds.length > 0) {
      const { data: reflectionsData, error: reflectionsError } = await supabase
        .from('reflections')
        .select('client_id, mood_rating, progress_rating, created_at')
        .in('client_id', clientIds)
        .gte('created_at', start)
        .lte('created_at', end);

      if (!reflectionsError) {
        reflections = reflectionsData || [];
      }
    }

    let feedbackResult: { data: { session_id: string; overall_rating: number | null }[] | null; error: unknown | null } = { data: [], error: null };
    let ratingsResult: { data: { session_id: string; rating: number | null }[] | null; error: unknown | null } = { data: [], error: null };

    if (sessionIds.length > 0) {
      [feedbackResult, ratingsResult] = await Promise.all([
        supabase
          .from('session_feedback')
          .select('session_id, overall_rating')
          .eq('coach_id', user.id)
          .in('session_id', sessionIds),
        supabase
          .from('session_ratings')
          .select('session_id, rating')
          .eq('coach_id', user.id)
          .in('session_id', sessionIds),
      ]);
    }

    const coachRate = await getCoachSessionRate(supabase, user.id);

    if (feedbackResult.error) {
      console.warn('Error fetching session feedback for insights:', feedbackResult.error);
    }
    if (ratingsResult.error) {
      console.warn('Error fetching session ratings for insights:', ratingsResult.error);
    }

    const ratingBySession = new Map<string, number>();

    feedbackResult.data
      ?.filter((feedback) => feedback.overall_rating != null)
      .forEach((feedback) => {
        const parsed = Number(feedback.overall_rating);
        if (Number.isFinite(parsed) && parsed > 0) {
          ratingBySession.set(feedback.session_id, parsed);
        }
      });

    ratingsResult.data
      ?.filter((rating) => rating.rating != null)
      .forEach((rating) => {
        const parsed = Number(rating.rating);
        if (!ratingBySession.has(rating.session_id) && Number.isFinite(parsed) && parsed > 0) {
          ratingBySession.set(rating.session_id, parsed);
        }
      });

    const feedbackRatings = Array.from(ratingBySession.values());
    const averageFeedbackRating = feedbackRatings.length > 0
      ? Math.round(((feedbackRatings.reduce((sum, value) => sum + value, 0) / feedbackRatings.length) + Number.EPSILON) * 10) / 10
      : 0;

    // Calculate metrics
    const totalSessions = sessions?.length || 0;
    const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
    const cancelledSessions = sessions?.filter(s => s.status === 'cancelled').length || 0;
    const uniqueClients = new Set(sessions?.map(s => s.client_id)).size;
    
    // Calculate total hours coached
    const totalMinutes = sessions?.reduce((sum, session) => {
      return sum + (session.status === 'completed' ? session.duration_minutes : 0);
    }, 0) || 0;
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Calculate completion rate
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // Calculate average mood rating from client reflections
    const moodRatings = reflections
      .map(reflection => reflection.mood_rating)
      .filter((rating): rating is number => rating != null);
    const averageMoodRating = moodRatings.length > 0 
      ? Math.round((moodRatings.reduce((sum, rating) => sum + rating, 0) / moodRatings.length) * 10) / 10 
      : 0;

    // Calculate average progress rating
    const progressRatings = reflections
      .map(reflection => reflection.progress_rating)
      .filter((rating): rating is number => rating != null);
    const averageProgressRating = progressRatings.length > 0 
      ? Math.round((progressRatings.reduce((sum, rating) => sum + rating, 0) / progressRatings.length) * 10) / 10 
      : 0;

    // Generate session metrics for charts (daily aggregation)
    const dailySessions = new Map<string, { date: string; completed: number; cancelled: number; total: number }>();

    sessions?.forEach(session => {
      const date = session.scheduled_at.split('T')[0];
      if (!dailySessions.has(date)) {
        dailySessions.set(date, {
          date,
          completed: 0,
          cancelled: 0,
          total: 0
        });
      }
      const dayData = dailySessions.get(date)!;
      dayData.total++;
      if (session.status === 'completed') dayData.completed++;
      if (session.status === 'cancelled') dayData.cancelled++;
    });

    // Convert to array and sort by date
    const sortedMetrics = Array.from(dailySessions.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    // Fill in missing dates with zero values
    const startDate = new Date(start);
    const endDate = new Date(end);
    const filledMetrics: { date: string; completed: number; cancelled: number; total: number }[] = [];
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const existing = sortedMetrics.find(m => m.date === dateStr);
      filledMetrics.push(existing || {
        date: dateStr,
        completed: 0,
        cancelled: 0,
        total: 0
      });
    }

    // Calculate client progress data
    const clientMap = new Map<string, {
      id: string;
      name: string;
      sessionsCompleted: number;
      totalSessions: number;
      averageMood: number;
      averageProgress: number;
      lastSession: string | null;
    }>();

    sessions?.forEach(session => {
      const clientId = session.client_id;
      if (!clientId) {
        return;
      }
      const client = Array.isArray(session.users) ? session.users[0] : session.users;

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          id: clientId,
          name: `${client?.first_name || ''} ${client?.last_name || ''}`,
          sessionsCompleted: 0,
          totalSessions: 0,
          averageMood: 0,
          averageProgress: 0,
          lastSession: null
        });
      }
      
      const clientData = clientMap.get(clientId)!;
      clientData.totalSessions++;
      if (session.status === 'completed') {
        clientData.sessionsCompleted++;
      }
      
      if (!clientData.lastSession || new Date(session.scheduled_at) > new Date(clientData.lastSession)) {
        clientData.lastSession = session.scheduled_at;
      }
    });

    // Add reflection data to client progress
    reflections.forEach(reflection => {
      const clientData = clientMap.get(reflection.client_id);
      if (!clientData) {
        return;
      }
      // This is a simplified calculation - in a real app you'd want more sophisticated aggregation
      if (reflection.mood_rating != null) {
        clientData.averageMood = reflection.mood_rating;
      }
      if (reflection.progress_rating != null) {
        clientData.averageProgress = reflection.progress_rating;
      }
    });

    const clientProgressArray = Array.from(clientMap.values()).slice(0, 10); // Limit to top 10 clients

    // Calculate revenue using the coach profile configuration
    const estimatedRevenue = Number((completedSessions * coachRate.rate).toFixed(2));

    const insights = {
      overview: {
        totalSessions,
        completedSessions,
        cancelledSessions,
        uniqueClients,
        totalHours,
        completionRate,
        averageMoodRating,
        averageProgressRating,
        estimatedRevenue,
        revenueCurrency: coachRate.currency,
        averageFeedbackRating,
        notesCount: notes?.length || 0
      },
      sessionMetrics: filledMetrics,
      clientProgress: clientProgressArray,
      timeRange,
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      data: insights,
      success: true
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in coach insights GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}