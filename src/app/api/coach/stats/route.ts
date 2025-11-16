import { NextRequest } from 'next/server';

import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { createClient } from '@/lib/supabase/server';
import { queryMonitor } from '@/lib/performance/query-monitoring';

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
    // Verify authentication and get user from Authorization header
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('[/api/coach/stats] Authentication failed: No user found');
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    if (user.role !== 'coach') {
      console.error('[/api/coach/stats] Authorization failed: User is not a coach', {
        userId: user.id,
        role: user.role
      });
      return ApiResponseHelper.forbidden(`Coach access required. Current role: ${user.role}`);
    }

    const coachId = user.id;
    const supabase = createClient();

    console.log('[/api/coach/stats] Fetching stats for coach:', coachId);

    // Use the optimized RPC function for dashboard stats
    const { data: statsData, error } = await queryMonitor.trackQueryExecution(
      'Coach Dashboard Stats RPC',
      async () => {
        return await supabase.rpc('get_coach_dashboard_stats', {
          p_coach_id: coachId,
        });
      }
    );

    if (error) {
      console.error('[/api/coach/stats] Error fetching stats:', error);
      throw new ApiError('FETCH_STATS_FAILED', 'Failed to fetch coach statistics', 500);
    }

    // Extract data from RPC result (returns single row)
    const statsRow = statsData && statsData.length > 0 ? statsData[0] : null;

    if (!statsRow) {
      console.warn('[/api/coach/stats] No stats data returned for coach:', coachId);
      // Return default values
      const stats: DashboardStats = {
        totalSessions: 0,
        completedSessions: 0,
        upcomingSessions: 0,
        totalClients: 0,
        activeClients: 0,
        thisWeekSessions: 0,
        averageRating: 4.8,
        totalRevenue: 0,
      };
      return ApiResponseHelper.success(stats);
    }

    // Transform RPC result to match the expected interface
    const stats: DashboardStats = {
      totalSessions: Number(statsRow.total_sessions) || 0,
      completedSessions: Number(statsRow.completed_sessions) || 0,
      upcomingSessions: Number(statsRow.upcoming_sessions) || 0,
      totalClients: Number(statsRow.total_clients) || 0,
      activeClients: Number(statsRow.active_clients) || 0,
      thisWeekSessions: Number(statsRow.this_week_sessions) || 0,
      averageRating: Number(statsRow.average_rating) || 4.8,
      totalRevenue: Number(statsRow.total_revenue) || 0,
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