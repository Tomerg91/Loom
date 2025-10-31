import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

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
      // Fetch session metrics
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, status, scheduled_at, client_id')
        .eq('coach_id', coachId);

      // Get unique client IDs from sessions
      const clientIds = [...new Set(sessions?.map(s => s.client_id).filter(Boolean) || [])];

      // Fetch client data
      const { data: clients } = clientIds.length > 0
        ? await supabase
            .from('users')
            .select('id, created_at, status')
            .in('id', clientIds)
        : { data: [] };

      // Fetch ratings
      const { data: ratings } = await supabase
        .from('session_ratings')
        .select('rating, review')
        .eq('coach_id', coachId);

      // Fetch goals
      const { data: goals } = await supabase
        .from('client_goals')
        .select('title, status')
        .eq('coach_id', coachId);

      // Calculate metrics
      const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
      const totalSessions = sessions?.length || 0;
      const clientCount = clients?.length || 0;

      // Calculate retention rate (active clients / total clients who had sessions)
      const activeClients = clients?.filter(c => c.status === 'active').length || 0;
      const clientRetentionRate = clientCount > 0 ? (activeClients / clientCount) * 100 : 0;

      // Calculate goal achievement rate
      const achievedGoals = goals?.filter(g => g.status === 'completed').length || 0;
      const goalAchievement = goals && goals.length > 0 ? (achievedGoals / goals.length) * 100 : 0;

      // Calculate average rating
      const averageRating = ratings && ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      // Estimate revenue (you may need to adjust this based on your pricing model)
      const revenue = completedSessions * 100; // $100 per session

      // Most common goals
      const goalCounts: Record<string, number> = {};
      goals?.forEach(g => {
        goalCounts[g.title] = (goalCounts[g.title] || 0) + 1;
      });

      const mostCommonGoals = Object.entries(goalCounts)
        .map(([goal, count]) => ({ goal, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const feedback = ratings?.map(r => ({
        clientId: 'unknown',
        rating: r.rating,
        comment: r.review || '',
      })) || [];

      return {
        totalSessions,
        completedSessions,
        clientCount,
        clientRetentionRate: Math.round(clientRetentionRate),
        goalAchievement: Math.round(goalAchievement),
        averageRating: Math.round(averageRating * 10) / 10,
        revenue,
        mostCommonGoals,
        feedback,
      };
    },
  });
};
