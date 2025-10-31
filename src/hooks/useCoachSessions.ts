import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/modules/platform/supabase/client';
import type { Session } from '@/types';

interface DatabaseSessionRow {
  id: string;
  coach_id: string;
  client_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  type: string;
  meeting_url: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  coach?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  client?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

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
          client:users!sessions_client_id_fkey(id, email, first_name, last_name, avatar_url)
        `)
        .eq('coach_id', coachId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      // Transform database response to match Session type
      const sessions: Session[] = (data as DatabaseSessionRow[] || []).map((row) => ({
        id: row.id,
        coachId: row.coach_id,
        clientId: row.client_id,
        title: row.title,
        description: row.description ?? undefined,
        scheduledAt: row.scheduled_at,
        duration: row.duration_minutes,
        durationMinutes: row.duration_minutes,
        status: row.status,
        sessionType: row.type as 'video' | 'phone' | 'in-person' | undefined,
        meetingUrl: row.meeting_url ?? undefined,
        notes: row.notes ?? undefined,
        rating: 0,
        actionItems: [],
        goals: [],
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
      }));

      return sessions;
    },
  });
};

export const useCoachClients = (coachId: string) => {
  return useQuery({
    queryKey: ['clients', coachId],
    queryFn: async () => {
      // Get unique clients from sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('client_id')
        .eq('coach_id', coachId);

      if (sessionsError) throw sessionsError;

      const clientIds = [...new Set(sessionsData?.map((s: { client_id: string }) => s.client_id) || [])];

      if (clientIds.length === 0) return [];

      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, avatar_url')
        .in('id', clientIds);

      if (error) throw error;

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
    },
  });
};
