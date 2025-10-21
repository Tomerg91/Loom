import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { authService } from '@/lib/services/auth-service';
import { createServerClient } from '@/lib/supabase/server';

interface ClientStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalReflections: number;
  thisWeekSessions: number;
  averageMoodRating: number;
  goalsAchieved: number;
  currentStreak: number;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify authentication and get user
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    if (session.user.role !== 'client' && session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden(`Client access required. Current role: ${session.user.role}`);
    }

    const userId = session.user.id;
    const supabase = createServerClient();

    // Calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Fetch session statistics
    const { data: sessionStats } = await supabase
      .from('sessions')
      .select('status, scheduled_at')
      .eq('client_id', userId);

    const totalSessions = sessionStats?.length || 0;
    const completedSessions = sessionStats?.filter(s => s.status === 'completed').length || 0;
    const upcomingSessions = sessionStats?.filter(s => 
      s.status === 'scheduled' && new Date(s.scheduled_at) > now
    ).length || 0;
    
    const thisWeekSessions = sessionStats?.filter(s => 
      new Date(s.scheduled_at) >= startOfWeek && new Date(s.scheduled_at) <= now
    ).length || 0;

    // Fetch reflection statistics
    const { data: reflectionStats } = await supabase
      .from('reflections')
      .select('mood_rating')
      .eq('client_id', userId);

    const totalReflections = reflectionStats?.length || 0;
    const moodRatings = reflectionStats?.filter(r => r.mood_rating != null && typeof r.mood_rating === 'number').map(r => r.mood_rating as number) || [];
    const averageMoodRating = moodRatings.length > 0 
      ? Math.round((moodRatings.reduce((sum, rating) => sum + rating, 0) / moodRatings.length) * 10) / 10
      : 0;

    // Calculate current streak (consecutive weeks with at least one session)
    let currentStreak = 0;
    const weeksBack = 12; // Check last 12 weeks
    
    for (let i = 0; i < weeksBack; i++) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(startOfWeek.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const hasSessionThisWeek = sessionStats?.some(s => {
        const sessionDate = new Date(s.scheduled_at);
        return sessionDate >= weekStart && sessionDate <= weekEnd && s.status === 'completed';
      });

      if (hasSessionThisWeek) {
        currentStreak++;
      } else if (i > 0) { // Don't break on current week if no sessions yet
        break;
      }
    }

    // Calculate goals achieved based on actual data and calculated streak
    // For now, we'll derive from session completion and reflection consistency
    // In the future, this should come from a dedicated goals table
    const sessionGoals = completedSessions; // 1 point per session
    const reflectionConsistencyBonus = reflectionStats && reflectionStats.length >= completedSessions * 0.5 
      ? Math.floor(completedSessions * 0.3) // 30% bonus for good reflection habits
      : 0;
    const streakBonus = currentStreak >= 4 ? 2 : 0; // Bonus for maintaining 4+ week streak
    
    const goalsAchieved = sessionGoals + reflectionConsistencyBonus + streakBonus;

    const stats: ClientStats = {
      totalSessions,
      completedSessions,
      upcomingSessions,
      totalReflections,
      thisWeekSessions,
      averageMoodRating,
      goalsAchieved,
      currentStreak,
    };

    return ApiResponseHelper.success(stats);

  } catch (error) {
    console.error('Client stats API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch client statistics');
  }
}