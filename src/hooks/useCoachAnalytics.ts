/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/modules/platform/supabase/client';
import { getSessionPrice } from '@/config/pricing';

export interface AnalyticsMetrics {
  totalSessions: number;
  completedSessions: number;
  clientCount: number;
  clientRetentionRate: number;
  goalAchievement: number;
  averageRating: number;
  revenue: number;
  mostCommonGoals: Array<{ goal: string; count: number }>;
  feedback: Array<{ clientId: string; rating: number; comment: string }>;
}

export const useCoachAnalytics = (coachId: string) => {
  return useQuery({
    queryKey: ['analytics', coachId],
    queryFn: async () => {
      try {
        // Fetch all session data with related ratings and goals in a single optimized query
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select(`
            id,
            status,
            scheduled_at,
            client_id,
            type,
            users!sessions_client_id_fkey(id, created_at, status),
            session_ratings(id, rating, review),
            client_goals(id, title, status)
          `)
          .eq('coach_id', coachId)
          .order('scheduled_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch coach analytics:', {
            coachId,
            error: error.message,
            details: error.details,
          });
          throw new Error(`Failed to load analytics: ${error.message}`);
        }

        const sessionData = (sessions as any[] || []);

        // Calculate metrics from the single query result
        const completedSessions = sessionData.filter(s => s.status === 'completed').length;
        const totalSessions = sessionData.length;

        // Get unique clients from sessions
        const uniqueClients = new Map<string, any>();
        sessionData.forEach((session: any) => {
          if (session.client_id && session.users && !uniqueClients.has(session.client_id)) {
            uniqueClients.set(session.client_id, session.users);
          }
        });
        const clientCount = uniqueClients.size;

        // Calculate retention rate (active clients / total clients who had sessions)
        const activeClients = Array.from(uniqueClients.values()).filter(
          (c: any) => c?.status === 'active'
        ).length;
        const clientRetentionRate = clientCount > 0 ? (activeClients / clientCount) * 100 : 0;

        // Collect all ratings from all sessions
        const allRatings = sessionData
          .flatMap((s: any) => s.session_ratings || [])
          .map((r: any) => r.rating);

        // Calculate average rating
        const averageRating = allRatings.length > 0
          ? Math.round((allRatings.reduce((sum: number, r: number) => sum + r, 0) / allRatings.length) * 10) / 10
          : 0;

        // Collect all goals from all sessions and calculate achievement
        const allGoals = sessionData.flatMap((s: any) => s.client_goals || []);
        const achievedGoals = allGoals.filter((g: any) => g.status === 'completed').length;
        const goalAchievement = allGoals.length > 0 ? (achievedGoals / allGoals.length) * 100 : 0;

        // Calculate revenue based on session type and completion status
        const revenue = sessionData
          .filter((s: any) => s.status === 'completed')
          .reduce((total: number, session: any) => {
            const price = getSessionPrice(session.type);
            return total + price;
          }, 0);

        // Most common goals
        const goalCounts: Record<string, number> = {};
        allGoals.forEach((g: any) => {
          goalCounts[g.title] = (goalCounts[g.title] || 0) + 1;
        });

        const mostCommonGoals = Object.entries(goalCounts)
          .map(([goal, count]) => ({ goal, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Build feedback from ratings
        const feedback = sessionData
          .flatMap((session: any) =>
            (session.session_ratings || []).map((r: any) => ({
              clientId: session.client_id,
              rating: r.rating,
              comment: r.review || '',
            }))
          );

        return {
          totalSessions,
          completedSessions,
          clientCount,
          clientRetentionRate: Math.round(clientRetentionRate),
          goalAchievement: Math.round(goalAchievement),
          averageRating,
          revenue,
          mostCommonGoals,
          feedback,
        };
      } catch (err) {
        console.error('Unexpected error in useCoachAnalytics:', err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
