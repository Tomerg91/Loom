import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/auth';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api/types';
import { getCachedData, CacheKeys, CacheTTL } from '@/lib/performance/cache';

export interface SessionWidget {
  id: string;
  coachName: string;
  clientName: string;
  coachAvatar?: string;
  clientAvatar?: string;
  date: string;
  duration: number;
  topic: string;
  rating?: number;
  notes?: string;
  keyInsights: string[];
  actionItems: string[];
  status: 'completed' | 'upcoming' | 'cancelled';
}

export interface SessionsResponse {
  sessions: SessionWidget[];
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  cancelledSessions: number;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SessionsResponse>>> {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const timeframe = searchParams.get('timeframe'); // 'upcoming', 'past', 'all'
    
    // Create cache key for session widget data
    const paramsKey = JSON.stringify({ limit, status, timeframe });
    const cacheKey = CacheKeys.sessionWidget(user.id, paramsKey);
    
    const response = await getCachedData(
      cacheKey,
      async () => {
        const supabase = await createClient();
        let query = supabase
          .from('sessions')
          .select(`
            id,
            title,
            scheduled_at,
            duration_minutes,
            status,
            notes,
            coach:coach_id(first_name, last_name, avatar_url),
            client:client_id(first_name, last_name, avatar_url)
          `);

        // Filter based on user role
        if (user.role === 'coach') {
          query = query.eq('coach_id', user.id);
        } else if (user.role === 'client') {
          query = query.eq('client_id', user.id);
        } else if (user.role === 'admin') {
          // Admin can see all sessions - no additional filter needed
        }

        // Apply status filter
        if (status) {
          query = query.eq('status', status);
        }

        // Apply timeframe filter
        const now = new Date().toISOString();
        if (timeframe === 'upcoming') {
          query = query.gte('scheduled_at', now);
        } else if (timeframe === 'past') {
          query = query.lt('scheduled_at', now);
        }

        // Order by scheduled_at
        query = query.order('scheduled_at', { ascending: timeframe === 'upcoming' });

        const { data: sessions, error: sessionsError } = await query.limit(limit);

        if (sessionsError) throw sessionsError;

        // Get session-related data for enhanced information
        const sessionIds = sessions?.map(s => s.id) || [];
        
        // Batch fetch related data for better performance
        const [notes, reflections] = await Promise.all([
          supabase
            .from('coach_notes')
            .select('session_id, content, title')
            .in('session_id', sessionIds),
          supabase
            .from('reflections')
            .select('session_id, mood_rating, insights')
            .in('session_id', sessionIds)
        ]);

        // Transform data to match widget interface
        const transformedSessions: SessionWidget[] = (sessions || []).map(session => {
      const coach = session.coach as any;
      const client = session.client as any;
      const sessionNotes = notes?.data?.filter((n: any) => (n.sessionId || n.session_id) === session.id) || [];
      const sessionReflections = reflections?.data?.filter((r: any) => (r.sessionId || r.session_id) === session.id) || [];

      // Extract insights from notes
      const keyInsights: string[] = [];
      const actionItems: string[] = [];

      sessionNotes.forEach((note: any) => {
        if (note.title?.toLowerCase().includes('insight') || note.content?.toLowerCase().includes('insight')) {
          // Extract insights from note content
          const insights = extractInsights(note.content);
          keyInsights.push(...insights);
        }
        if (note.title?.toLowerCase().includes('action') || note.content?.toLowerCase().includes('next steps')) {
          // Extract action items from note content
          const actions = extractActionItems(note.content);
          actionItems.push(...actions);
        }
      });

      // Add insights from reflections
      sessionReflections.forEach((reflection: any) => {
        if (reflection.insights) {
          keyInsights.push(reflection.insights);
        }
      });

      // Calculate average mood rating as session rating
      const moodRatings = sessionReflections.map((r: any) => r.mood_rating).filter((rating): rating is number => rating !== null && rating !== undefined);
      const averageRating = moodRatings.length > 0 
        ? Math.round(moodRatings.reduce((sum: number, rating: number) => sum + rating, 0) / moodRatings.length)
        : undefined;

      // Determine session status based on scheduled time and current status
      let sessionStatus: 'completed' | 'upcoming' | 'cancelled' = session.status as any;
      if (session.status === 'scheduled') {
        const scheduledTime = new Date(session.scheduled_at);
        const now = new Date();
        
        if (scheduledTime > now) {
          sessionStatus = 'upcoming';
        } else {
          // Past scheduled sessions should be marked as completed if they have notes/content
          sessionStatus = (sessionNotes.length > 0 || sessionReflections.length > 0) ? 'completed' : 'upcoming';
        }
      }

      return {
        id: session.id,
        coachName: coach ? `${coach.firstName || coach.first_name || ''} ${coach.lastName || coach.last_name || ''}`.trim() : 'Unknown Coach',
        clientName: client ? `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim() : 'Unknown Client',
        coachAvatar: coach?.avatar_url,
        clientAvatar: client?.avatar_url,
        date: session.scheduled_at,
        duration: session.duration_minutes,
        topic: session.title,
        rating: averageRating,
        notes: session.notes || undefined,
        keyInsights: keyInsights.slice(0, 3), // Limit to top 3 insights
        actionItems: actionItems.slice(0, 3), // Limit to top 3 action items
        status: sessionStatus
      };
    });

        // Calculate summary statistics
        const totalSessions = transformedSessions.length;
        const completedSessions = transformedSessions.filter(s => s.status === 'completed').length;
        const upcomingSessions = transformedSessions.filter(s => s.status === 'upcoming').length;
        const cancelledSessions = transformedSessions.filter(s => s.status === 'cancelled').length;

        return {
          sessions: transformedSessions,
          totalSessions,
          completedSessions,
          upcomingSessions,
          cancelledSessions
        };
      },
      CacheTTL.DASHBOARD
    );

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions data' },
      { status: 500 }
    );
  }
}

// Helper function to extract insights from text
function extractInsights(text: string): string[] {
  if (!text) return [];
  
  const insights: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 20) { // Only meaningful lines
      // Look for bullet points, numbered lists, or sentences that might be insights
      if (trimmedLine.match(/^[-•*]\s+/) || trimmedLine.match(/^\d+\.\s+/) || trimmedLine.includes('realized') || trimmedLine.includes('discovered')) {
        insights.push(trimmedLine.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''));
      }
    }
  }
  
  return insights.slice(0, 5); // Return max 5 insights
}

// Helper function to extract action items from text
function extractActionItems(text: string): string[] {
  if (!text) return [];
  
  const actionItems: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 10) { // Only meaningful lines
      // Look for action-oriented language
      if (trimmedLine.match(/^[-•*]\s+/) || 
          trimmedLine.match(/^\d+\.\s+/) || 
          trimmedLine.toLowerCase().includes('will') || 
          trimmedLine.toLowerCase().includes('should') ||
          trimmedLine.toLowerCase().includes('next') ||
          trimmedLine.toLowerCase().includes('action')) {
        actionItems.push(trimmedLine.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''));
      }
    }
  }
  
  return actionItems.slice(0, 5); // Return max 5 action items
}