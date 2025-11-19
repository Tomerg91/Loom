import { NextRequest, NextResponse } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
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
  // Use authenticated client to handle token refresh and cookie propagation
  const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(request, new NextResponse());

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[/api/coach/stats] Authentication failed:', authError);
      return propagateCookies(authResponse, ApiResponseHelper.unauthorized('Authentication required'));
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[/api/coach/stats] Failed to fetch user profile:', profileError);
      return propagateCookies(authResponse, ApiResponseHelper.unauthorized('User profile not found'));
    }

    if (profile.role !== 'coach') {
      console.error('[/api/coach/stats] Authorization failed: User is not a coach', {
        userId: user.id,
        role: profile.role
      });
      return propagateCookies(authResponse, ApiResponseHelper.forbidden(`Coach access required. Current role: ${profile.role}`));
    }

    const coachId = user.id;

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
      return propagateCookies(authResponse, ApiResponseHelper.success(stats));
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

    return propagateCookies(authResponse, ApiResponseHelper.success(stats));

  } catch (error) {
    console.error('Coach stats API error:', error);

    if (error instanceof ApiError) {
      return propagateCookies(authResponse, ApiResponseHelper.error(error.code, error.message));
    }

    return propagateCookies(authResponse, ApiResponseHelper.internalError('Failed to fetch coach statistics'));
  }
}