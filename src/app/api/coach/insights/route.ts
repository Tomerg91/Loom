import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionRate } from '@/lib/config/analytics-constants';
import { z } from 'zod';

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
    const supabase = await createServerClient();
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
    let reflections: any[] = [];
    
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
    const moodRatings = reflections.filter(r => r.mood_rating != null).map(r => r.mood_rating);
    const averageMoodRating = moodRatings.length > 0 
      ? Math.round((moodRatings.reduce((sum, rating) => sum + rating, 0) / moodRatings.length) * 10) / 10 
      : 0;

    // Calculate average progress rating
    const progressRatings = reflections.filter(r => r.progress_rating != null).map(r => r.progress_rating);
    const averageProgressRating = progressRatings.length > 0 
      ? Math.round((progressRatings.reduce((sum, rating) => sum + rating, 0) / progressRatings.length) * 10) / 10 
      : 0;

    // Generate session metrics for charts (daily aggregation)
    const sessionMetrics = [];
    const dailySessions = new Map();

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
      const dayData = dailySessions.get(date);
      dayData.total++;
      if (session.status === 'completed') dayData.completed++;
      if (session.status === 'cancelled') dayData.cancelled++;
    });

    // Convert to array and sort by date
    const sortedMetrics = Array.from(dailySessions.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    // Fill in missing dates with zero values
    const startDate = new Date(start);
    const endDate = new Date(end);
    const filledMetrics = [];
    
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
    const clientProgress = [];
    const clientMap = new Map();

    sessions?.forEach(session => {
      const clientId = session.client_id;
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
      
      const clientData = clientMap.get(clientId);
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
      if (clientData) {
        // This is a simplified calculation - in a real app you'd want more sophisticated aggregation
        if (reflection.mood_rating) {
          clientData.averageMood = reflection.mood_rating;
        }
        if (reflection.progress_rating) {
          clientData.averageProgress = reflection.progress_rating;
        }
      }
    });

    const clientProgressArray = Array.from(clientMap.values()).slice(0, 10); // Limit to top 10 clients

    // Calculate revenue using centralized session rate configuration
    const sessionRate = getSessionRate(user.id);
    const estimatedRevenue = completedSessions * sessionRate;

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