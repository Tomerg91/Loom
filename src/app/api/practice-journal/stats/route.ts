import { NextRequest } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
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
export async function GET(request: NextRequest): Promise<Response> {
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
      throw new ApiError(500, 'Failed to fetch practice journal statistics', { supabaseError: error });
    }

    // Transform the response to match our interface
    const stats: PracticeJournalStats = {
      totalEntries: data.total_entries || 0,
      entriesThisWeek: data.entries_this_week || 0,
      entriesThisMonth: data.entries_this_month || 0,
      sharedEntries: data.shared_entries || 0,
      averageMood: data.average_mood ? parseFloat(data.average_mood.toFixed(1)) : null,
      averageEnergy: data.average_energy ? parseFloat(data.average_energy.toFixed(1)) : null,
      mostCommonSensations: data.most_common_sensations || [],
      mostCommonEmotions: data.most_common_emotions || [],
      practiceStreakDays: data.practice_streak_days || 0,
    };

    return ApiResponseHelper.success(stats);
  } catch (error) {
    console.error('Error fetching practice journal statistics:', error);
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error);
    }
    return ApiResponseHelper.internalError('An unexpected error occurred');
  }
}