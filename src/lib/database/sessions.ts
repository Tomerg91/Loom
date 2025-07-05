import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import type { Session, SessionStatus } from '@/types';
import type { Database } from '@/types/supabase';

// API-specific interfaces
interface GetSessionsOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  coachId?: string;
  clientId?: string;
  from?: string;
  to?: string;
}

interface GetSessionsCountOptions {
  status?: string;
  coachId?: string;
  clientId?: string;
  from?: string;
  to?: string;
}

interface CreateSessionData {
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  coachId: string;
  clientId: string;
  meetingUrl?: string;
}

interface UpdateSessionData {
  title?: string;
  description?: string;
  scheduledAt?: string;
  duration?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  meetingUrl?: string;
  notes?: string;
}

export class SessionService {
  private supabase: ReturnType<typeof createServerClient> | ReturnType<typeof createClient>;

  constructor(isServer = true) {
    this.supabase = isServer ? createServerClient() : createClient();
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        *,
        coach:users!sessions_coach_id_fkey(*),
        client:users!sessions_client_id_fkey(*)
      `)
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching session:', error);
      return null;
    }

    return this.mapDatabaseSessionToSession(data);
  }

  /**
   * Create new session
   */
  async createSession(sessionData: {
    coachId: string;
    clientId: string;
    title: string;
    description?: string;
    scheduledAt: Date;
    durationMinutes?: number;
  }): Promise<Session | null> {
    const { data, error } = await this.supabase
      .rpc('create_session', {
        coach_id: sessionData.coachId,
        client_id: sessionData.clientId,
        title: sessionData.title,
        description: sessionData.description || undefined,
        scheduled_at: sessionData.scheduledAt.toISOString(),
        duration_minutes: sessionData.durationMinutes || 60,
      });

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    return this.getSession(data);
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    const updateData: Record<string, unknown> = {};
    
    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.scheduledAt) updateData.scheduled_at = updates.scheduledAt;
    if (updates.durationMinutes) updateData.duration_minutes = updates.durationMinutes;
    if (updates.status) updateData.status = updates.status;
    if (updates.meetingUrl !== undefined) updateData.meeting_url = updates.meetingUrl;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select(`
        *,
        coach:users!sessions_coach_id_fkey(*),
        client:users!sessions_client_id_fkey(*)
      `)
      .single();

    if (error) {
      console.error('Error updating session:', error);
      return null;
    }

    return this.mapDatabaseSessionToSession(data);
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<boolean> {
    const { error } = await this.supabase
      .from('sessions')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session status:', error);
      return false;
    }

    return true;
  }

  /**
   * Get upcoming sessions for a user
   */
  async getUpcomingSessions(userId: string): Promise<Session[]> {
    const { data, error } = await this.supabase
      .rpc('get_upcoming_sessions', { user_id: userId });

    if (error) {
      console.error('Error fetching upcoming sessions:', error);
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
      .select(`
        *,
        coach:users!sessions_coach_id_fkey(*),
        client:users!sessions_client_id_fkey(*)
      `)
      .eq('coach_id', coachId)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching coach sessions:', error);
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
      .select(`
        *,
        coach:users!sessions_coach_id_fkey(*),
        client:users!sessions_client_id_fkey(*)
      `)
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching client sessions:', error);
      return [];
    }

    return data.map(this.mapDatabaseSessionToSession);
  }

  /**
   * Get sessions between coach and client
   */
  async getSessionsBetweenUsers(coachId: string, clientId: string): Promise<Session[]> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        *,
        coach:users!sessions_coach_id_fkey(*),
        client:users!sessions_client_id_fkey(*)
      `)
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions between users:', error);
      return [];
    }

    return data.map(this.mapDatabaseSessionToSession);
  }

  /**
   * Cancel session
   */
  async cancelSession(sessionId: string): Promise<boolean> {
    return this.updateSessionStatus(sessionId, 'cancelled');
  }

  /**
   * Complete session
   */
  async completeSession(sessionId: string, notes?: string): Promise<boolean> {
    const updates: Record<string, unknown> = {
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updates.notes = notes;
    }

    const { error } = await this.supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) {
      console.error('Error completing session:', error);
      return false;
    }

    return true;
  }

  /**
   * Check if time slot is available
   */
  async isTimeSlotAvailable(
    coachId: string, 
    startTime: Date, 
    durationMinutes = 60
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('is_time_slot_available', {
        coach_id: coachId,
        start_time: startTime.toISOString(),
        duration_minutes: durationMinutes,
      });

    if (error) {
      console.error('Error checking time slot availability:', error);
      return false;
    }

    return data;
  }

  /**
   * Get available time slots for a coach on a specific date
   */
  async getAvailableTimeSlots(
    coachId: string, 
    date: Date, 
    slotDuration = 60
  ): Promise<{ startTime: string; endTime: string; isAvailable: boolean }[]> {
    const { data, error } = await this.supabase
      .rpc('get_available_time_slots', {
        coach_id: coachId,
        target_date: date.toISOString().split('T')[0], // Convert to date string
        slot_duration: slotDuration,
      });

    if (error) {
      console.error('Error fetching available time slots:', error);
      return [];
    }

    return data.map((slot: unknown) => ({
      startTime: (slot as { start_time: string }).start_time,
      endTime: (slot as { end_time: string }).end_time,
      isAvailable: (slot as { is_available: boolean }).is_available,
    }));
  }

  /**
   * Search sessions by title or description
   */
  async searchSessions(
    query: string, 
    userId?: string, 
    status?: SessionStatus
  ): Promise<Session[]> {
    let queryBuilder = this.supabase
      .from('sessions')
      .select(`
        *,
        coach:users!sessions_coach_id_fkey(*),
        client:users!sessions_client_id_fkey(*)
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

    if (userId) {
      queryBuilder = queryBuilder.or(`coach_id.eq.${userId},client_id.eq.${userId}`);
    }

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    queryBuilder = queryBuilder.order('scheduled_at', { ascending: false });

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error searching sessions:', error);
      return [];
    }

    return data.map(this.mapDatabaseSessionToSession);
  }

  /**
   * Map database session to application session type
   */
  private mapDatabaseSessionToSession(dbSession: Database['public']['Tables']['sessions']['Row'] & {
    coach?: Database['public']['Tables']['users']['Row'];
    client?: Database['public']['Tables']['users']['Row'];
  }): Session {
    return {
      id: dbSession.id,
      coachId: dbSession.coach_id,
      clientId: dbSession.client_id,
      title: dbSession.title,
      description: dbSession.description || '',
      scheduledAt: dbSession.scheduled_at,
      duration: dbSession.duration_minutes,
      durationMinutes: dbSession.duration_minutes,
      status: dbSession.status as SessionStatus,
      meetingUrl: dbSession.meeting_url || '',
      notes: dbSession.notes || '',
      createdAt: dbSession.created_at,
      updatedAt: dbSession.updated_at,
      coach: dbSession.coach ? {
        id: dbSession.coach.id,
        email: dbSession.coach.email,
        firstName: dbSession.coach.first_name || '',
        lastName: dbSession.coach.last_name || '',
        avatarUrl: dbSession.coach.avatar_url || '',
      } : {
        id: '',
        email: '',
        firstName: 'Unknown',
        lastName: 'Coach',
        avatarUrl: '',
      },
      client: dbSession.client ? {
        id: dbSession.client.id,
        email: dbSession.client.email,
        firstName: dbSession.client.first_name || '',
        lastName: dbSession.client.last_name || '',
        avatarUrl: dbSession.client.avatar_url || '',
      } : {
        id: '',
        email: '',
        firstName: 'Unknown',
        lastName: 'Client',
        avatarUrl: '',
      },
    };
  }

  /**
   * Map RPC session result to application session type
   */
  private mapRpcSessionToSession(rpcSession: unknown): Session {
    const session = rpcSession as {
      id: string;
      title: string;
      scheduled_at: string;
      duration_minutes: number;
      status: SessionStatus;
      coach_name: string;
      client_name: string;
      meeting_url: string;
    };

    return {
      id: session.id,
      coachId: '', // Not provided in RPC result
      clientId: '', // Not provided in RPC result
      duration: session.duration_minutes,
      title: session.title,
      description: '',
      scheduledAt: session.scheduled_at,
      durationMinutes: session.duration_minutes,
      status: session.status,
      meetingUrl: session.meeting_url || '',
      notes: '',
      createdAt: '',
      updatedAt: '',
      coach: {
        id: '',
        email: '',
        firstName: session.coach_name.split(' ')[0] || '',
        lastName: session.coach_name.split(' ')[1] || '',
        avatarUrl: '',
      },
      client: {
        id: '',
        email: '',
        firstName: session.client_name.split(' ')[0] || '',
        lastName: session.client_name.split(' ')[1] || '',
        avatarUrl: '',
      },
    };
  }

  /**
   * Get sessions with pagination and filtering (for API)
   */
  async getSessionsPaginated(options: GetSessionsOptions): Promise<Session[]> {
    let query = this.supabase
      .from('sessions')
      .select(`
        *,
        coach:users!sessions_coach_id_fkey(*),
        client:users!sessions_client_id_fkey(*)
      `);

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show');
    }
    if (options.coachId) {
      query = query.eq('coach_id', options.coachId);
    }
    if (options.clientId) {
      query = query.eq('client_id', options.clientId);
    }
    if (options.from) {
      query = query.gte('scheduled_at', options.from);
    }
    if (options.to) {
      query = query.lte('scheduled_at', options.to);
    }

    // Apply sorting
    const sortBy = options.sortBy || 'scheduled_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sessions with pagination:', error);
      return [];
    }

    return data.map(this.mapDatabaseSessionToSession);
  }

  /**
   * Get total count of sessions (for API pagination)
   */
  async getSessionsCount(options: GetSessionsCountOptions): Promise<number> {
    let query = this.supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show');
    }
    if (options.coachId) {
      query = query.eq('coach_id', options.coachId);
    }
    if (options.clientId) {
      query = query.eq('client_id', options.clientId);
    }
    if (options.from) {
      query = query.gte('scheduled_at', options.from);
    }
    if (options.to) {
      query = query.lte('scheduled_at', options.to);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting sessions:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get session by ID (for API)
   */
  async getSessionById(sessionId: string): Promise<Session | null> {
    return this.getSession(sessionId);
  }

  /**
   * Create session (for API)
   */
  async createSessionFromApi(sessionData: CreateSessionData): Promise<Session | null> {
    const { data, error } = await this.supabase
      .from('sessions')
      .insert({
        title: sessionData.title,
        description: sessionData.description,
        scheduled_at: sessionData.scheduledAt,
        duration_minutes: sessionData.duration,
        coach_id: sessionData.coachId,
        client_id: sessionData.clientId,
        meeting_url: sessionData.meetingUrl,
        status: 'scheduled',
      })
      .select(`
        *,
        coach:users!sessions_coach_id_fkey(*),
        client:users!sessions_client_id_fkey(*)
      `)
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    return this.mapDatabaseSessionToSession(data);
  }

  /**
   * Update session (for API)
   */
  async updateSessionFromApi(sessionId: string, updates: UpdateSessionData): Promise<Session | null> {
    const updateData: Record<string, unknown> = {};
    
    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.scheduledAt) updateData.scheduled_at = updates.scheduledAt;
    if (updates.duration) updateData.duration_minutes = updates.duration;
    if (updates.status) updateData.status = updates.status;
    if (updates.meetingUrl !== undefined) updateData.meeting_url = updates.meetingUrl;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select(`
        *,
        coach:users!sessions_coach_id_fkey(*),
        client:users!sessions_client_id_fkey(*)
      `)
      .single();

    if (error) {
      console.error('Error updating session:', error);
      return null;
    }

    return this.mapDatabaseSessionToSession(data);
  }

  /**
   * Delete session (for API)
   */
  async deleteSessionFromApi(sessionId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      return false;
    }

    return true;
  }
}

// Export individual functions for API usage
const sessionService = new SessionService(true);

export const getSessionsPaginated = (options: GetSessionsOptions) => sessionService.getSessionsPaginated(options);
export const getSessionsCount = (options: GetSessionsCountOptions) => sessionService.getSessionsCount(options);
export const getSessionById = (sessionId: string) => sessionService.getSessionById(sessionId);
export const createSession = (sessionData: CreateSessionData) => sessionService.createSessionFromApi(sessionData);
export const updateSession = (sessionId: string, updates: UpdateSessionData) => sessionService.updateSessionFromApi(sessionId, updates);
export const deleteSession = (sessionId: string) => sessionService.deleteSessionFromApi(sessionId);