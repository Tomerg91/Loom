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
    if (!session?.user || session.user.role !== 'coach') {
      return ApiResponseHelper.forbidden('Coach access required');
    }

    const coachId = session.user.id;
    const supabase = createServerClient();

    // Calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Fetch session statistics
    const { data: sessionStats } = await supabase
      .from('sessions')
      .select('status, scheduled_at, client_id')
      .eq('coach_id', coachId);

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

    // For now, we'll use configurable values for rating and revenue
    // TODO: In a real implementation, these would come from ratings and payments tables
    const averageRating = getDefaultCoachRating();
    const totalRevenue = completedSessions * getSessionRate(); // Using configurable session rate

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

    return ApiResponseHelper.success(stats);

  } catch (error) {
    console.error('Coach stats API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch coach statistics');
  }
}