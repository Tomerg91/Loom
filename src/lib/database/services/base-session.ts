import { createClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server';
import type { Session, SessionStatus } from '@/types';
import type { Database } from '@/types/supabase';

// API-specific interfaces
export interface GetSessionsOptions {
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

export interface GetSessionsCountOptions {
  status?: string;
  coachId?: string;
  clientId?: string;
  from?: string;
  to?: string;
}

export interface CreateSessionData {
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  coachId: string;
  clientId: string;
  meetingUrl?: string;
}

export interface UpdateSessionData {
  title?: string;
  description?: string;
  scheduledAt?: string;
  duration?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  meetingUrl?: string;
  notes?: string;
}

export type DatabaseSession = Database['public']['Tables']['sessions']['Row'] & {
  coach?: Database['public']['Tables']['users']['Row'];
  client?: Database['public']['Tables']['users']['Row'];
};

/**
 * Base session service with shared utilities and data mapping functions
 */
export abstract class BaseSessionService {
  protected supabase: unknown;

  constructor(isServer = true) {
    this.supabase = isServer ? createServerClient() : createClient();
  }

  /**
   * Map database session to application session type
   */
  protected mapDatabaseSessionToSession(dbSession: DatabaseSession): Session {
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
  protected mapRpcSessionToSession(rpcSession: unknown): Session {
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
   * Standard query for selecting sessions with user relations
   */
  protected getSessionSelectQuery() {
    return `
      *,
      coach:users!sessions_coach_id_fkey(*),
      client:users!sessions_client_id_fkey(*)
    `;
  }

  /**
   * Log error with consistent formatting
   */
  protected logError(operation: string, error: unknown) {
    console.error(`Error ${operation}:`, error);
  }
}