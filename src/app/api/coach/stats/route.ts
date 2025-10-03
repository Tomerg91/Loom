import { NextRequest } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionRate, getDefaultCoachRating } from '@/lib/config/analytics-constants';

interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalClients: number;
  activeClients: number;
  thisWeekSessions: number;
  averageRating: number;
  totalRevenue: number;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify authentication and get user
    const session = await authService.getSession();

    console.log('[/api/coach/stats] Auth check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      timestamp: new Date().toISOString()
    });

    if (!session?.user) {
      console.error('[/api/coach/stats] No session or user found');
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    if (session.user.role !== 'coach') {
      console.error('[/api/coach/stats] User is not a coach:', {
        userId: session.user.id,
        role: session.user.role
      });
      return ApiResponseHelper.forbidden(`Coach access required. Current role: ${session.user.role}`);
    }

    const coachId = session.user.id;
    const supabase = createServerClient();

    console.log('[/api/coach/stats] Fetching stats for coach:', coachId);

    // Calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Fetch session statistics
    const { data: sessionStats, error: sessionError } = await supabase
      .from('sessions')
      .select('id, status, scheduled_at, client_id')
      .eq('coach_id', coachId);

    if (sessionError) {
      console.error('[/api/coach/stats] Error fetching sessions:', sessionError);
    }

    console.log('[/api/coach/stats] Sessions query result:', {
      count: sessionStats?.length || 0,
      hasError: !!sessionError,
      error: sessionError?.message
    });

    const totalSessions = sessionStats?.length || 0;
    const completedSessions = sessionStats?.filter(s => s.status === 'completed').length || 0;
    const upcomingSessions = sessionStats?.filter(s => 
      s.status === 'scheduled' && new Date(s.scheduled_at) > now
    ).length || 0;
    
    const thisWeekSessions = sessionStats?.filter(s => 
      new Date(s.scheduled_at) >= startOfWeek && new Date(s.scheduled_at) <= now
    ).length || 0;

    // Calculate unique clients
    const uniqueClientIds = new Set(sessionStats?.map(s => s.client_id) || []);
    const totalClients = uniqueClientIds.size;

    // Calculate active clients (had a session in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const recentClientIds = new Set(
      sessionStats?.filter(s => 
        new Date(s.scheduled_at) >= thirtyDaysAgo && 
        (s.status === 'completed' || s.status === 'scheduled')
      ).map(s => s.client_id) || []
    );
    const activeClients = recentClientIds.size;

    // Calculate real revenue from session rates
    // Use default session rate (coach_profiles table doesn't exist in current schema)
    const sessionRate = getSessionRate();
    const totalRevenue = completedSessions * sessionRate;

    // Calculate real average rating from session reflections
    let averageRating = 0;
    if (completedSessions > 0) {
      const completedSessionIds = sessionStats
        ?.filter(s => s.status === 'completed')
        .map(s => s.id) || [];
      
      if (completedSessionIds.length > 0) {
        const { data: reflections } = await supabase
          .from('reflections')
          .select('mood_rating')
          .in('session_id', completedSessionIds)
          .not('mood_rating', 'is', null);
        
        if (reflections && reflections.length > 0) {
          const validRatings = reflections.filter(r => r.mood_rating != null && r.mood_rating > 0);
          if (validRatings.length > 0) {
            averageRating = validRatings.reduce((sum, r) => sum + (r.mood_rating || 0), 0) / validRatings.length;
            averageRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal
          }
        }
      }
    }
    
    // Fallback to configured default if no ratings available
    if (averageRating === 0) {
      averageRating = getDefaultCoachRating();
    }

    const stats: DashboardStats = {
      totalSessions,
      completedSessions,
      upcomingSessions,
      totalClients,
      activeClients,
      thisWeekSessions,
      averageRating,
      totalRevenue,
    };

    console.log('[/api/coach/stats] Returning stats:', stats);

    return ApiResponseHelper.success(stats);

  } catch (error) {
    console.error('Coach stats API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch coach statistics');
  }
}