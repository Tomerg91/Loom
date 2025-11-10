import { NextRequest } from 'next/server';

import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { getCoachSessionRate } from '@/lib/coach-dashboard/coach-profile';
import { getDefaultCoachRating } from '@/lib/config/analytics-constants';
import { createClient } from '@/lib/supabase/server';

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

    // Calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    // Fetch session statistics and coach rate concurrently
    const sessionsPromise = supabase
      .from('sessions')
      .select('id, status, scheduled_at, client_id')
      .eq('coach_id', coachId);

    const [sessionsResult, coachRate] = await Promise.all([
      sessionsPromise,
      getCoachSessionRate(supabase, coachId),
    ]);

    if (sessionsResult.error) {
      console.error('[/api/coach/stats] Error fetching sessions:', sessionsResult.error);
    }

    const sessionStats = sessionsResult.data ?? [];

    console.log('[/api/coach/stats] Sessions query result:', {
      count: sessionStats.length,
      hasError: !!sessionsResult.error,
      error: sessionsResult.error?.message,
    });

    const totalSessions = sessionStats.length;
    const completedSessions = sessionStats.filter((s) => s.status === 'completed').length;
    const upcomingSessions = sessionStats.filter((s) => {
      if (s.status !== 'scheduled') return false;
      const scheduledAt = new Date(s.scheduled_at);
      return scheduledAt > now;
    }).length;

    const thisWeekSessions = sessionStats.filter((s) => {
      if (s.status === 'cancelled') return false;
      const scheduledAt = new Date(s.scheduled_at);
      return scheduledAt >= startOfWeek && scheduledAt <= endOfWeek;
    }).length;

    const uniqueClientIds = new Set(sessionStats.map((s) => s.client_id).filter(Boolean));
    const totalClients = uniqueClientIds.size;

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const recentClientIds = new Set<string>();
    sessionStats.forEach((session) => {
      if (!session.client_id) return;
      const scheduledAt = new Date(session.scheduled_at);
      if (scheduledAt >= thirtyDaysAgo && session.status !== 'cancelled') {
        recentClientIds.add(session.client_id);
      }
    });

    const activeClients = recentClientIds.size;

    // Calculate revenue using the coach's configured session rate
    const totalRevenue = Number((completedSessions * coachRate.rate).toFixed(2));

    // Calculate average rating from feedback/ratings tables
    let averageRating = 0;
    const completedSessionIds = sessionStats
      .filter((s) => s.status === 'completed')
      .map((s) => s.id);

    if (completedSessionIds.length > 0) {
      const [feedbackResult, ratingsResult] = await Promise.all([
        supabase
          .from('session_feedback')
          .select('session_id, overall_rating')
          .eq('coach_id', coachId)
          .in('session_id', completedSessionIds),
        supabase
          .from('session_ratings')
          .select('session_id, rating')
          .eq('coach_id', coachId)
          .in('session_id', completedSessionIds),
      ]);

      if (feedbackResult.error) {
        console.warn('[/api/coach/stats] Failed to load session feedback', feedbackResult.error);
      }
      if (ratingsResult.error) {
        console.warn('[/api/coach/stats] Failed to load session ratings', ratingsResult.error);
      }

      const ratingBySession = new Map<string, number>();

      feedbackResult.data
        ?.filter((feedback) => feedback.overall_rating != null)
        .forEach((feedback) => {
          const rating = Number(feedback.overall_rating);
          if (Number.isFinite(rating) && rating > 0) {
            ratingBySession.set(feedback.session_id, rating);
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

      const ratingValues = Array.from(ratingBySession.values());
      if (ratingValues.length > 0) {
        const sum = ratingValues.reduce((total, value) => total + value, 0);
        averageRating = Math.round(((sum / ratingValues.length) + Number.EPSILON) * 10) / 10;
      }
    }

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