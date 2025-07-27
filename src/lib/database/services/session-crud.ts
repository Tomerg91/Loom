import type { Session } from '@/types';
import { BaseSessionService, CreateSessionData, UpdateSessionData } from './base-session';

/**
 * Session CRUD operations service
 * Handles basic create, read, update, delete operations for sessions
 */
export class SessionCrudService extends BaseSessionService {
  
  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(this.getSessionSelectQuery())
      .eq('id', sessionId)
      .single();

    if (error) {
      this.logError('fetching session', error);
      return null;
    }

    return this.mapDatabaseSessionToSession(data);
  }

  /**
   * Create new session using RPC function
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
      this.logError('creating session', error);
      return null;
    }

    return this.getSession(data);
  }

  /**
   * Create session directly via insert (for API)
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
      .select(this.getSessionSelectQuery())
      .single();

    if (error) {
      this.logError('creating session from API', error);
      return null;
    }

    return this.mapDatabaseSessionToSession(data);
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
      .select(this.getSessionSelectQuery())
      .single();

    if (error) {
      this.logError('updating session', error);
      return null;
    }

    return this.mapDatabaseSessionToSession(data);
  }

  /**
   * Update session from API data format
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
      .select(this.getSessionSelectQuery())
      .single();

    if (error) {
      this.logError('updating session from API', error);
      return null;
    }

    return this.mapDatabaseSessionToSession(data);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      this.logError('deleting session', error);
      return false;
    }

    return true;
  }
}