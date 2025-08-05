import type { Session } from '@/types';
import { BaseSessionService } from './base-session';

/**
 * Session participant management service
 * Handles coach and client session retrieval and participant-specific operations
 */
export class SessionParticipantsService extends BaseSessionService {

  /**
   * Get upcoming sessions for a user (coach or client)
   */
  async getUpcomingSessions(userId: string): Promise<Session[]> {
    const { data, error } = await this.supabase
      .rpc('get_upcoming_sessions', { user_id: userId });

    if (error) {
      this.logError('fetching upcoming sessions', error);
      return [];
    }

    return data.map((session: unknown) => this.mapRpcSessionToSession(session));
  }

  /**
   * Get sessions for a specific coach
   */
  async getCoachSessions(coachId: string, limit = 50): Promise<Session[]> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(this.getSessionSelectQuery())
      .eq('coach_id', coachId)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logError('fetching coach sessions', error);
      return [];
    }

    return data.map(this.mapDatabaseSessionToSession);
  }

  /**
   * Get sessions for a specific client
   */
  async getClientSessions(clientId: string, limit = 50): Promise<Session[]> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(this.getSessionSelectQuery())
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logError('fetching client sessions', error);
      return [];
    }

    return data.map(this.mapDatabaseSessionToSession);
  }

  /**
   * Get sessions between a specific coach and client
   */
  async getSessionsBetweenUsers(coachId: string, clientId: string): Promise<Session[]> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(this.getSessionSelectQuery())
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false });

    if (error) {
      this.logError('fetching sessions between users', error);
      return [];
    }

    return data.map(this.mapDatabaseSessionToSession);
  }

  /**
   * Get all clients for a coach (based on sessions)
   */
  async getCoachClients(coachId: string): Promise<{ id: string; name: string; email: string; sessionCount: number }[]> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        client:users!sessions_client_id_fkey(id, email, first_name, last_name)
      `)
      .eq('coach_id', coachId)
      .not('client', 'is', null);

    if (error) {
      this.logError('fetching coach clients', error);
      return [];
    }

    // Group by client and count sessions
    const clientMap = new Map<string, { id: string; name: string; email: string; sessionCount: number }>();

    data.forEach(session => {
      if (session.client) {
        const clientId = session.client.id;
        const existing = clientMap.get(clientId);
        
        if (existing) {
          existing.sessionCount++;
        } else {
          clientMap.set(clientId, {
            id: clientId,
            name: `${session.client.firstName || session.client.first_name || ''} ${session.client.lastName || session.client.last_name || ''}`.trim(),
            email: session.client.email,
            sessionCount: 1,
          });
        }
      }
    });

    return Array.from(clientMap.values());
  }

  /**
   * Get all coaches for a client (based on sessions)
   */
  async getClientCoaches(clientId: string): Promise<{ id: string; name: string; email: string; sessionCount: number }[]> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        coach:users!sessions_coach_id_fkey(id, email, first_name, last_name)
      `)
      .eq('client_id', clientId)
      .not('coach', 'is', null);

    if (error) {
      this.logError('fetching client coaches', error);
      return [];
    }

    // Group by coach and count sessions
    const coachMap = new Map<string, { id: string; name: string; email: string; sessionCount: number }>();

    data.forEach(session => {
      if (session.coach) {
        const coachId = session.coach.id;
        const existing = coachMap.get(coachId);
        
        if (existing) {
          existing.sessionCount++;
        } else {
          coachMap.set(coachId, {
            id: coachId,
            name: `${session.coach.firstName || session.coach.first_name || ''} ${session.coach.lastName || session.coach.last_name || ''}`.trim(),
            email: session.coach.email,
            sessionCount: 1,
          });
        }
      }
    });

    return Array.from(coachMap.values());
  }

  /**
   * Get recent sessions for a participant (coach or client)
   */
  async getRecentSessions(userId: string, limit = 10): Promise<Session[]> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(this.getSessionSelectQuery())
      .or(`coach_id.eq.${userId},client_id.eq.${userId}`)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logError('fetching recent sessions', error);
      return [];
    }

    return data.map(this.mapDatabaseSessionToSession);
  }

  /**
   * Get session history between coach and client with pagination
   */
  async getSessionHistory(
    coachId: string, 
    clientId: string, 
    limit = 20, 
    offset = 0
  ): Promise<{ sessions: Session[]; totalCount: number }> {
    // Get sessions
    const { data: sessions, error: sessionError } = await this.supabase
      .from('sessions')
      .select(this.getSessionSelectQuery())
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sessionError) {
      this.logError('fetching session history', sessionError);
      return { sessions: [], totalCount: 0 };
    }

    // Get total count
    const { count, error: countError } = await this.supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .eq('client_id', clientId);

    if (countError) {
      this.logError('counting session history', countError);
      return { sessions: sessions.map(this.mapDatabaseSessionToSession), totalCount: 0 };
    }

    return {
      sessions: sessions.map(this.mapDatabaseSessionToSession),
      totalCount: count || 0,
    };
  }

  /**
   * Get participant statistics for a user
   */
  async getParticipantStats(userId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    upcomingSessions: number;
    asCoach: number;
    asClient: number;
  }> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('status, coach_id, client_id, scheduled_at')
      .or(`coach_id.eq.${userId},client_id.eq.${userId}`);

    if (error) {
      this.logError('fetching participant statistics', error);
      return {
        totalSessions: 0,
        completedSessions: 0,
        cancelledSessions: 0,
        upcomingSessions: 0,
        asCoach: 0,
        asClient: 0,
      };
    }

    const now = new Date();
    const stats = {
      totalSessions: data.length,
      completedSessions: 0,
      cancelledSessions: 0,
      upcomingSessions: 0,
      asCoach: 0,
      asClient: 0,
    };

    data.forEach(session => {
      // Role-based counting
      if (session.coach_id === userId) {
        stats.asCoach++;
      }
      if (session.client_id === userId) {
        stats.asClient++;
      }

      // Status-based counting
      switch (session.status) {
        case 'completed':
          stats.completedSessions++;
          break;
        case 'cancelled':
          stats.cancelledSessions++;
          break;
        case 'scheduled':
        case 'in_progress':
          if (new Date(session.scheduled_at) > now) {
            stats.upcomingSessions++;
          }
          break;
      }
    });

    return stats;
  }
}