/**
 * @fileoverview Server-side data access helpers for the session scheduling
 * workflows. The service aggregates Supabase queries and normalizes the
 * responses into the lightweight DTOs consumed by the API layer and React
 * Query hooks.
 */

import type { PostgrestError } from '@supabase/supabase-js';

import { HTTP_STATUS } from '@/lib/api/utils';
import { createClient } from '@/modules/platform/supabase/server';
import type {
  SessionCalendarEntry,
  SessionMutationResult,
  SessionRequestStatus,
  SessionRequestSummary,
  SessionSchedulingRequest,
  SessionUpdatePayload,
} from '@/modules/sessions/types';

export type SessionSchedulerActorRole = 'coach' | 'client' | 'admin';

export interface SessionSchedulerActor {
  id: string;
  role: SessionSchedulerActorRole;
}

export interface SessionCalendarOptions {
  start?: string;
  end?: string;
  limit?: number;
}

interface SessionRow {
  id: string;
  coach_id: string;
  client_id: string;
  title: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  meeting_url: string | null;
  timezone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  coach?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  client?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface SessionRequestRow {
  id: string;
  coach_id: string;
  client_id: string;
  session_id: string | null;
  requested_by: string;
  requested_at: string;
  scheduled_at: string;
  duration_minutes: number;
  status: SessionRequestStatus;
  title: string | null;
  timezone: string | null;
  meeting_url: string | null;
  notes: string | null;
  reschedule_reason: string | null;
  coach?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  client?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  requester?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

const DEFAULT_LIMIT = 50;

const mapName = (
  value?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null
): string | null => {
  if (!value) {
    return null;
  }

  const parts = [value.first_name, value.last_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }

  return value.email ?? null;
};

const mapSessionRow = (row: SessionRow): SessionCalendarEntry => ({
  id: row.id,
  coachId: row.coach_id,
  clientId: row.client_id,
  title: row.title ?? 'Coaching session',
  scheduledAt: row.scheduled_at,
  durationMinutes: row.duration_minutes,
  status: row.status as SessionCalendarEntry['status'],
  meetingUrl: row.meeting_url,
  timezone: row.timezone,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  coachName: mapName(row.coach),
  clientName: mapName(row.client),
});

const mapRequestRow = (row: SessionRequestRow): SessionRequestSummary => ({
  id: row.id,
  coachId: row.coach_id,
  clientId: row.client_id,
  sessionId: row.session_id,
  requestedBy: row.requested_by,
  requestedAt: row.requested_at,
  scheduledAt: row.scheduled_at,
  durationMinutes: row.duration_minutes,
  status: row.status,
  title: row.title,
  timezone: row.timezone,
  meetingUrl: row.meeting_url,
  notes: row.notes,
  rescheduleReason: row.reschedule_reason,
  coachName: mapName(row.coach),
  clientName: mapName(row.client),
  requesterName: mapName(row.requester),
});

const toDatabaseSessionPayload = (
  input: SessionSchedulingRequest,
  coachId: string
) => ({
  coach_id: coachId,
  client_id: input.clientId,
  title: input.title,
  scheduled_at: input.scheduledAt,
  duration_minutes: input.durationMinutes,
  status: 'scheduled',
  meeting_url: input.meetingUrl ?? null,
  timezone: input.timezone ?? null,
  notes: input.notes ?? null,
});

const toDatabaseRequestPayload = (
  input: SessionSchedulingRequest,
  coachId: string,
  requestedBy: string,
  status: SessionRequestStatus,
  sessionId: string | null
) => ({
  coach_id: coachId,
  client_id: input.clientId,
  session_id: sessionId,
  requested_by: requestedBy,
  scheduled_at: input.scheduledAt,
  duration_minutes: input.durationMinutes,
  status,
  title: input.title,
  timezone: input.timezone ?? null,
  meeting_url: input.meetingUrl ?? null,
  notes: input.notes ?? null,
});

const handlePostgrestError = (error: PostgrestError | null) => {
  if (!error) {
    return;
  }

  throw new SessionSchedulerError(
    error.message ?? 'Unexpected database error',
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    error
  );
};

export class SessionSchedulerError extends Error {
  status: number;
  cause?: unknown;

  constructor(
    message: string,
    status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    cause?: unknown
  ) {
    super(message);
    this.name = 'SessionSchedulerError';
    this.status = status;
    this.cause = cause;
  }
}

export class SessionSchedulerService {
  async listCalendar(
    actor: SessionSchedulerActor,
    options: SessionCalendarOptions = {},
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<SessionCalendarEntry[]> {
    const supabase = supabaseClient ?? createClient();
    const limit = options.limit ?? DEFAULT_LIMIT;

    try {
      let query = supabase
        .from('sessions')
        .select(
          `
            id,
            coach_id,
            client_id,
            title,
            scheduled_at,
            duration_minutes,
            status,
            meeting_url,
            timezone,
            notes,
            created_at,
            updated_at,
            coach:users!coach_id(first_name,last_name,email),
            client:users!client_id(first_name,last_name,email)
          `
        )
        .order('scheduled_at', { ascending: true })
        .limit(limit);

      if (actor.role === 'coach') {
        query = query.eq('coach_id', actor.id);
      } else if (actor.role === 'client') {
        query = query.eq('client_id', actor.id);
      }

      if (options.start) {
        query = query.gte('scheduled_at', options.start);
      }
      if (options.end) {
        query = query.lte('scheduled_at', options.end);
      }

      const { data, error } = await query;

      if (error) {
        console.error('SessionScheduler.listCalendar query error:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          actor,
          options
        });
      }

      handlePostgrestError(error);

      if (!data) {
        console.warn('SessionScheduler.listCalendar returned null data, returning empty array');
        return [];
      }

      if (!Array.isArray(data)) {
        console.error('SessionScheduler.listCalendar data is not an array:', typeof data, data);
        throw new SessionSchedulerError(
          'Invalid response from database: expected array',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      const rows = data as unknown as SessionRow[];
      return rows.map(mapSessionRow);
    } catch (error) {
      console.error('SessionScheduler.listCalendar unexpected error:', error);
      if (error instanceof SessionSchedulerError) {
        throw error;
      }
      throw new SessionSchedulerError(
        'Failed to fetch calendar sessions',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  async listRequests(
    actor: SessionSchedulerActor,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<SessionRequestSummary[]> {
    const supabase = supabaseClient ?? createClient();

    try {
      let query = supabase
        .from('session_requests')
        .select(
          `
            id,
            coach_id,
            client_id,
            session_id,
            requested_by,
            requested_at,
            scheduled_at,
            duration_minutes,
            status,
            title,
            timezone,
            meeting_url,
            notes,
            reschedule_reason,
            coach:users!coach_id(first_name,last_name,email),
            client:users!client_id(first_name,last_name,email),
            requester:users!requested_by(first_name,last_name,email)
          `
        )
        .order('requested_at', { ascending: false })
        .limit(DEFAULT_LIMIT);

      if (actor.role === 'coach') {
        query = query.eq('coach_id', actor.id);
      } else if (actor.role === 'client') {
        query = query.eq('client_id', actor.id);
      } else {
        query = query.eq('requested_by', actor.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('SessionScheduler.listRequests query error:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          actor
        });
      }

      handlePostgrestError(error);

      if (!data) {
        console.warn('SessionScheduler.listRequests returned null data, returning empty array');
        return [];
      }

      if (!Array.isArray(data)) {
        console.error('SessionScheduler.listRequests data is not an array:', typeof data, data);
        throw new SessionSchedulerError(
          'Invalid response from database: expected array',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      const rows = data as unknown as SessionRequestRow[];
      return rows.map(mapRequestRow);
    } catch (error) {
      console.error('SessionScheduler.listRequests unexpected error:', error);
      if (error instanceof SessionSchedulerError) {
        throw error;
      }
      throw new SessionSchedulerError(
        'Failed to fetch session requests',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  async createRequest(
    actor: SessionSchedulerActor,
    input: SessionSchedulingRequest,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<SessionMutationResult> {
    const supabase = supabaseClient ?? createClient();

    const coachId = actor.role === 'coach' ? actor.id : input.coachId;
    if (!coachId) {
      throw new SessionSchedulerError(
        'A coach must be provided when scheduling a session.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (actor.role === 'coach' || actor.role === 'admin') {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert([toDatabaseSessionPayload(input, coachId)])
        .select(
          `
            id,
            coach_id,
            client_id,
            title,
            scheduled_at,
            duration_minutes,
            status,
            meeting_url,
            timezone,
            notes,
            created_at,
            updated_at,
            coach:users!coach_id(first_name,last_name,email),
            client:users!client_id(first_name,last_name,email)
          `
        )
        .single();

      handlePostgrestError(sessionError);
      if (!sessionData) {
        throw new SessionSchedulerError('Failed to create session record.');
      }

      const { data: requestData, error: requestError } = await supabase
        .from('session_requests')
        .insert([
          toDatabaseRequestPayload(
            input,
            coachId,
            actor.id,
            'approved',
            sessionData.id
          ),
        ])
        .select(
          `
            id,
            coach_id,
            client_id,
            session_id,
            requested_by,
            requested_at,
            scheduled_at,
            duration_minutes,
            status,
            title,
            timezone,
            meeting_url,
            notes,
            reschedule_reason,
            coach:users!coach_id(first_name,last_name,email),
            client:users!client_id(first_name,last_name,email),
            requester:users!requested_by(first_name,last_name,email)
          `
        )
        .single();

      handlePostgrestError(requestError);

      const typedSession = sessionData as unknown as SessionRow;
      const typedRequest = requestData as unknown as SessionRequestRow | null;

      return {
        success: true,
        session: mapSessionRow(typedSession),
        request: typedRequest ? mapRequestRow(typedRequest) : undefined,
      };
    }

    const { data, error } = await supabase
      .from('session_requests')
      .insert([
        toDatabaseRequestPayload(input, coachId, actor.id, 'pending', null),
      ])
      .select(
        `
          id,
          coach_id,
          client_id,
          session_id,
          requested_by,
          requested_at,
          scheduled_at,
          duration_minutes,
          status,
          title,
          timezone,
          meeting_url,
          notes,
          reschedule_reason,
          coach:users!coach_id(first_name,last_name,email),
          client:users!client_id(first_name,last_name,email),
          requester:users!requested_by(first_name,last_name,email)
        `
      )
      .single();

    handlePostgrestError(error);

    const typedRequest = data as unknown as SessionRequestRow | null;

    return {
      success: true,
      request: typedRequest ? mapRequestRow(typedRequest) : undefined,
    };
  }

  async updateSession(
    actor: SessionSchedulerActor,
    sessionId: string,
    input: SessionUpdatePayload,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<SessionMutationResult> {
    if (actor.role === 'client') {
      throw new SessionSchedulerError(
        'Only coaches or admins can modify sessions.',
        HTTP_STATUS.FORBIDDEN
      );
    }

    const supabase = supabaseClient ?? createClient();
    const updates: Record<string, unknown> = {};

    if (input.status) {
      updates.status = input.status;
    }
    if (input.scheduledAt) {
      updates.scheduled_at = input.scheduledAt;
    }
    if (input.durationMinutes) {
      updates.duration_minutes = input.durationMinutes;
    }
    if (input.meetingUrl !== undefined) {
      updates.meeting_url = input.meetingUrl;
    }
    if (input.timezone !== undefined) {
      updates.timezone = input.timezone;
    }
    if (input.notes !== undefined) {
      updates.notes = input.notes;
    }

    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .select(
        `
          id,
          coach_id,
          client_id,
          title,
          scheduled_at,
          duration_minutes,
          status,
          meeting_url,
          timezone,
          notes,
          created_at,
          updated_at,
          coach:users!coach_id(first_name,last_name,email),
          client:users!client_id(first_name,last_name,email)
        `
      )
      .single();

    handlePostgrestError(error);
    if (!data) {
      throw new SessionSchedulerError(
        'Session not found.',
        HTTP_STATUS.NOT_FOUND
      );
    }

    const typedSession = data as unknown as SessionRow;

    if (input.requestId) {
      const { error: requestError } = await supabase
        .from('session_requests')
        .update({
          status: 'approved',
          session_id: data.id,
          reschedule_reason: input.rescheduleReason ?? null,
          scheduled_at: updates.scheduled_at ?? data.scheduled_at,
          duration_minutes: updates.duration_minutes ?? data.duration_minutes,
        })
        .eq('id', input.requestId);

      handlePostgrestError(requestError);
    } else if (input.rescheduleReason) {
      const { error: historyError } = await supabase
        .from('session_requests')
        .insert([
          {
            coach_id: data.coach_id,
            client_id: data.client_id,
            session_id: data.id,
            requested_by: actor.id,
            scheduled_at: data.scheduled_at,
            duration_minutes: data.duration_minutes,
            status: 'approved',
            title: data.title,
            timezone: data.timezone,
            meeting_url: data.meeting_url,
            notes: input.notes ?? data.notes,
            reschedule_reason: input.rescheduleReason,
          },
        ]);

      handlePostgrestError(historyError);
    }

    return {
      success: true,
      session: mapSessionRow(typedSession),
    };
  }
}
