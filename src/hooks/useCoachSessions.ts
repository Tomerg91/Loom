/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/modules/platform/supabase/client';
import type { Session } from '@/types';

interface DatabaseUserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
}

export const useCoachSessions = (coachId: string) => {
  return useQuery({
    queryKey: ['sessions', coachId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select(`
            id,
            coach_id,
            client_id,
            title,
            description,
            scheduled_at,
            duration_minutes,
            status,
            type,
            meeting_url,
            notes,
            created_at,
            updated_at,
            coach:users!sessions_coach_id_fkey(id, email, first_name, last_name, avatar_url),
            client:users!sessions_client_id_fkey(id, email, first_name, last_name, avatar_url),
            session_ratings(id, rating, review),
            session_action_items(id, description, completed),
            session_goals(id, title, status)
          `)
          .eq('coach_id', coachId)
          .order('scheduled_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch coach sessions:', {
            coachId,
            error: error.message,
            details: error.details,
          });
          throw new Error(`Failed to load sessions: ${error.message}`);
        }

        // Transform database response to match Session type
        const sessions: Session[] = (data || []).map((row: any) => {
          // Get the highest rating from session ratings, or 0 if none
          const ratings = (row.session_ratings as any[] | null) || [];
          const rating = ratings.length > 0
            ? Math.max(...ratings.map((r: any) => r.rating))
            : 0;

          return {
            id: row.id,
            coachId: row.coach_id,
            clientId: row.client_id,
            title: row.title,
            description: row.description ?? undefined,
            scheduledAt: row.scheduled_at,
            duration: row.duration_minutes,
            durationMinutes: row.duration_minutes,
            status: row.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show',
            sessionType: row.type as 'video' | 'phone' | 'in-person' | undefined,
            meetingUrl: row.meeting_url ?? undefined,
            notes: row.notes ?? undefined,
            rating,
            // Store action item descriptions as strings
            actionItems: ((row.session_action_items as any[] | null) || []).map((item: any) => item.description),
            // Store goal titles as strings
            goals: ((row.session_goals as any[] | null) || []).map((goal: any) => goal.title),
            createdAt: row.created_at ?? new Date().toISOString(),
            updatedAt: row.updated_at ?? new Date().toISOString(),
            coach: {
              id: row.coach?.id || '',
              email: row.coach?.email || '',
              firstName: row.coach?.first_name || '',
              lastName: row.coach?.last_name || '',
              avatarUrl: row.coach?.avatar_url
            },
            client: {
              id: row.client?.id || '',
              email: row.client?.email || '',
              firstName: row.client?.first_name || '',
              lastName: row.client?.last_name || '',
              avatarUrl: row.client?.avatar_url
            }
          };
        });

        return sessions;
      } catch (err) {
        console.error('Unexpected error in useCoachSessions:', err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCoachClients = (coachId: string) => {
  return useQuery({
    queryKey: ['clients', coachId],
    queryFn: async () => {
      try {
        // Get unique clients from sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('client_id')
          .eq('coach_id', coachId);

        if (sessionsError) {
          console.error('Failed to fetch sessions for client list:', {
            coachId,
            error: sessionsError.message,
            details: sessionsError.details,
          });
          throw new Error(`Failed to load client list: ${sessionsError.message}`);
        }

        const clientIds = [...new Set(sessionsData?.map((s: { client_id: string }) => s.client_id) || [])];

        if (clientIds.length === 0) return [];

        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, phone, avatar_url')
          .in('id', clientIds);

        if (error) {
          console.error('Failed to fetch client data:', {
            coachId,
            clientIds: clientIds.length,
            error: error.message,
            details: error.details,
          });
          throw new Error(`Failed to load clients: ${error.message}`);
        }

        // Transform to match CoachClient interface structure
        return (data as DatabaseUserRow[] || []).map((user) => ({
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone ?? undefined,
          avatar: user.avatar_url ?? undefined,
          status: 'active' as const,
          totalSessions: 0,
          completedSessions: 0,
          averageRating: 0,
        }));
      } catch (err) {
        console.error('Unexpected error in useCoachClients:', err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
