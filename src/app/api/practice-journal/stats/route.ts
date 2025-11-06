import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { authService } from '@/lib/services/auth-service';
import { createServerClient } from '@/lib/supabase/server';

export interface PracticeJournalStats {
  totalEntries: number;
  entriesThisWeek: number;
  entriesThisMonth: number;
  sharedEntries: number;
  averageMood: number | null;
  averageEnergy: number | null;
  mostCommonSensations: string[];
  mostCommonEmotions: string[];
  practiceStreakDays: number;
}

// GET: Fetch practice journal statistics for current user
export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    if (session.user.role !== 'client' && session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Only clients can view their journal statistics');
    }

    const userId = session.user.id;
    const supabase = createServerClient();

    // Call the database function to get statistics
    const { data, error } = await supabase
      .rpc('get_practice_journal_stats', { user_id: userId })
      .single();

    if (error) {
      throw new ApiError('FETCH_STATS_ERROR', 'Failed to fetch practice journal statistics', 500);
    }

    // Transform the response to match our interface
    const rawData = data as {
      total_entries?: number;
      entries_this_week?: number;
      entries_this_month?: number;
      shared_entries?: number;
      average_mood?: number;
      average_energy?: number;
      most_common_sensations?: string[];
      most_common_emotions?: string[];
      practice_streak_days?: number;
    };

    const stats: PracticeJournalStats = {
      totalEntries: rawData.total_entries || 0,
      entriesThisWeek: rawData.entries_this_week || 0,
      entriesThisMonth: rawData.entries_this_month || 0,
      sharedEntries: rawData.shared_entries || 0,
      averageMood: rawData.average_mood ? parseFloat(rawData.average_mood.toFixed(1)) : null,
      averageEnergy: rawData.average_energy ? parseFloat(rawData.average_energy.toFixed(1)) : null,
      mostCommonSensations: rawData.most_common_sensations || [],
      mostCommonEmotions: rawData.most_common_emotions || [],
      practiceStreakDays: rawData.practice_streak_days || 0,
    };

    return ApiResponseHelper.success(stats);
  } catch (error) {
    console.error('Error fetching practice journal statistics:', error);
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    return ApiResponseHelper.internalError('An unexpected error occurred');
  }
}