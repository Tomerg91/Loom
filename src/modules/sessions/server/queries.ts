/**
 * @fileoverview Server-side data access helpers for the session scheduling
 * workflows. The service aggregates Supabase queries and normalizes the
 * responses into the lightweight DTOs consumed by the API layer and React
 * Query hooks.
 */

import type { PostgrestError } from '@supabase/supabase-js';

import { HTTP_STATUS } from '@/lib/api/utils';
import type {
  CoachDashboardActivityItem,
  CoachDashboardAgendaItem,
  CoachDashboardSnapshot,
  CoachDashboardSnapshotClient,
  CoachDashboardSnapshotStats,
  CoachDashboardSummary,
} from '@/modules/dashboard/types';
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
    options: SessionCalendarOptions = {}
  ): Promise<SessionCalendarEntry[]> {
    const supabase = createClient();
    const limit = options.limit ?? DEFAULT_LIMIT;

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
          coach:coach_id(first_name,last_name,email),
          client:client_id(first_name,last_name,email)
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
    handlePostgrestError(error);

    const rows = (data ?? []) as unknown as SessionRow[];
    return rows.map(mapSessionRow);
  }

  async listRequests(
    actor: SessionSchedulerActor
  ): Promise<SessionRequestSummary[]> {
    const supabase = createClient();

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
          coach:coach_id(first_name,last_name,email),
          client:client_id(first_name,last_name,email),
          requester:requested_by(first_name,last_name,email)
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
    handlePostgrestError(error);

    const rows = (data ?? []) as unknown as SessionRequestRow[];
    return rows.map(mapRequestRow);
  }

  async createRequest(
    actor: SessionSchedulerActor,
    input: SessionSchedulingRequest
  ): Promise<SessionMutationResult> {
    const supabase = createClient();

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
            coach:coach_id(first_name,last_name,email),
            client:client_id(first_name,last_name,email)
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
            coach:coach_id(first_name,last_name,email),
            client:client_id(first_name,last_name,email),
            requester:requested_by(first_name,last_name,email)
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
          coach:coach_id(first_name,last_name,email),
          client:client_id(first_name,last_name,email),
          requester:requested_by(first_name,last_name,email)
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
    input: SessionUpdatePayload
  ): Promise<SessionMutationResult> {
    if (actor.role === 'client') {
      throw new SessionSchedulerError(
        'Only coaches or admins can modify sessions.',
        HTTP_STATUS.FORBIDDEN
      );
    }

    const supabase = createClient();
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
          coach:coach_id(first_name,last_name,email),
          client:client_id(first_name,last_name,email)
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

interface CoachDashboardSummaryRpcPayload {
  agenda?: SessionRow[] | null;
  activity?: Array<{
    id: string;
    type: CoachDashboardActivityItem['type'];
    description: string;
    timestamp: string;
    client_name?: string | null;
  }> | null;
  snapshot?: {
    stats?: SnapshotStatsPayload | null;
    clients?: Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      status: CoachDashboardSnapshotClient['status'] | null;
      next_session?: string | null;
      last_session?: string | null;
    }> | null;
  } | null;
  generated_at?: string | null;
}

export interface LoadDashboardSummaryOptions {
  /** Date used to determine the agenda window. Defaults to `new Date()`. */
  referenceDate?: Date;
  /** Maximum number of agenda items returned. */
  agendaLimit?: number;
  /** Maximum number of activity entries returned. */
  activityLimit?: number;
  /** Maximum number of clients surfaced in the snapshot widget. */
  clientLimit?: number;
}

const DEFAULT_AGENDA_LIMIT = 10;
const DEFAULT_ACTIVITY_LIMIT = 6;
const DEFAULT_CLIENT_LIMIT = 12;

type SnapshotStatsPayload = Partial<
  CoachDashboardSnapshotStats & {
    total_sessions: number;
    completed_sessions: number;
    upcoming_sessions: number;
    total_clients: number;
    active_clients: number;
  }
>;

const deriveClientDisplayName = (
  client: Pick<CoachDashboardSnapshotClient, 'firstName' | 'lastName' | 'email'>
) => {
  const parts = [client.firstName, client.lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }

  return client.email ?? '';
};

const mapAgendaEntry = (
  entry: SessionCalendarEntry
): CoachDashboardAgendaItem => ({
  id: entry.id,
  title: entry.title,
  scheduledAt: entry.scheduledAt,
  durationMinutes: entry.durationMinutes,
  status: entry.status,
  meetingUrl: entry.meetingUrl,
  clientId: entry.clientId,
  clientName: entry.clientName ?? null,
});

const mapSnapshotClient = (
  client: CoachDashboardSnapshotClient
): CoachDashboardSnapshotClient => ({
  id: client.id,
  firstName: client.firstName,
  lastName: client.lastName,
  email: client.email,
  status: client.status,
  nextSession: client.nextSession ?? null,
  lastSession: client.lastSession ?? null,
});

const coerceSnapshotStats = (
  stats: SnapshotStatsPayload | null | undefined,
  pendingClients: number
): CoachDashboardSnapshotStats => ({
  totalSessions: stats?.totalSessions ?? stats?.total_sessions ?? 0,
  completedSessions: stats?.completedSessions ?? stats?.completed_sessions ?? 0,
  upcomingSessions: stats?.upcomingSessions ?? stats?.upcoming_sessions ?? 0,
  totalClients: stats?.totalClients ?? stats?.total_clients ?? 0,
  activeClients: stats?.activeClients ?? stats?.active_clients ?? 0,
  pendingClients,
});

const isMissingRpcFunction = (error: PostgrestError | null) =>
  Boolean(
    error?.message && /function .*coach_dashboard_summary/i.test(error.message)
  );

const mapRpcPayloadToSummary = (
  payload: CoachDashboardSummaryRpcPayload,
  referenceDate: Date
): CoachDashboardSummary => {
  const agenda = (payload.agenda ?? []).map(row =>
    mapAgendaEntry(mapSessionRow(row))
  );

  const activity: CoachDashboardActivityItem[] = (payload.activity ?? []).map(
    item => ({
      id: item.id,
      type: item.type,
      description: item.description,
      timestamp: item.timestamp,
      clientName: item.client_name ?? null,
    })
  );

  const snapshotClients: CoachDashboardSnapshotClient[] = (
    payload.snapshot?.clients ?? []
  ).map(client =>
    mapSnapshotClient({
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      status: client.status ?? 'inactive',
      nextSession: client.next_session ?? null,
      lastSession: client.last_session ?? null,
    })
  );

  const pendingClients = snapshotClients.filter(
    client => client.status === 'pending'
  ).length;

  const snapshot: CoachDashboardSnapshot = {
    stats: coerceSnapshotStats(payload.snapshot?.stats, pendingClients),
    clients: snapshotClients,
  };

  return {
    agenda,
    activity,
    snapshot,
    generatedAt: payload.generated_at ?? referenceDate.toISOString(),
  };
};

interface LoadDashboardSummaryFallbackParams {
  supabase: ReturnType<typeof createClient>;
  actor: SessionSchedulerActor;
  startOfDay: Date;
  endOfDay: Date;
  options: LoadDashboardSummaryOptions;
}

async function loadDashboardSummaryFallback({
  supabase,
  actor,
  startOfDay,
  endOfDay,
  options,
}: LoadDashboardSummaryFallbackParams): Promise<CoachDashboardSummary> {
  const agendaLimit = options.agendaLimit ?? DEFAULT_AGENDA_LIMIT;
  const activityLimit = options.activityLimit ?? DEFAULT_ACTIVITY_LIMIT;
  const clientLimit = options.clientLimit ?? DEFAULT_CLIENT_LIMIT;

  const startIso = startOfDay.toISOString();
  const endIso = endOfDay.toISOString();
  const now = new Date();

  const agendaQuery = supabase
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
        coach:coach_id(first_name,last_name,email),
        client:client_id(first_name,last_name,email)
      `
    )
    .eq('coach_id', actor.id)
    .gte('scheduled_at', startIso)
    .lte('scheduled_at', endIso)
    .order('scheduled_at', { ascending: true })
    .limit(agendaLimit);

  const sessionsQuery = supabase
    .from('sessions')
    .select(
      `
        id,
        coach_id,
        client_id,
        status,
        scheduled_at,
        created_at,
        updated_at,
        meeting_url,
        client:client_id(id,first_name,last_name,email,status)
      `
    )
    .eq('coach_id', actor.id)
    .order('scheduled_at', { ascending: false })
    .limit(200);

  const [agendaResponse, sessionsResponse] = await Promise.all([
    agendaQuery,
    sessionsQuery,
  ]);

  handlePostgrestError(agendaResponse.error);
  handlePostgrestError(sessionsResponse.error);

  const agendaRows = (agendaResponse.data ?? []) as unknown as SessionRow[];
  type SessionWithClientRow = SessionRow & {
    client:
      | {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          status?: string | null;
        }
      | Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          status?: string | null;
        }>
      | null;
  };

  const rawSessionRows = (sessionsResponse.data ??
    []) as unknown as SessionWithClientRow[];
  const sessionRows = rawSessionRows.map(row => ({
    ...row,
    client: Array.isArray(row.client) ? (row.client[0] ?? null) : row.client,
  }));

  const agenda = agendaRows.map(row => mapAgendaEntry(mapSessionRow(row)));

  const activity: CoachDashboardActivityItem[] = [];

  sessionRows.forEach(row => {
    const client = row.client;
    const name = client
      ? deriveClientDisplayName({
          firstName: client.first_name,
          lastName: client.last_name,
          email: client.email,
        })
      : null;

    if (row.status === 'completed') {
      activity.push({
        id: `session_completed_${row.id}`,
        type: 'session_completed',
        description: name
          ? `Completed session with ${name}`
          : 'Completed coaching session',
        timestamp: row.updated_at,
        clientName: name,
      });
      return;
    }

    if (row.status === 'scheduled') {
      activity.push({
        id: `session_scheduled_${row.id}`,
        type: 'session_scheduled',
        description: name
          ? `New session scheduled with ${name}`
          : 'New session scheduled',
        timestamp: row.created_at,
        clientName: name,
      });
    }
  });

  activity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (activity.length > activityLimit) {
    activity.splice(activityLimit);
  }

  const clientById = new Map<
    string,
    CoachDashboardSnapshotClient & { totalSessions: number }
  >();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  sessionRows.forEach(row => {
    if (!row.client_id || !row.client) {
      return;
    }

    const clientId = row.client_id;
    const scheduledAt = new Date(row.scheduled_at);
    const existing = clientById.get(clientId);
    const baseStatus = (row.client.status ?? '').toLowerCase();
    const initialStatus: CoachDashboardSnapshotClient['status'] =
      baseStatus === 'pending' || baseStatus === 'invited'
        ? 'pending'
        : 'inactive';

    if (!existing) {
      clientById.set(clientId, {
        id: clientId,
        firstName: row.client.first_name,
        lastName: row.client.last_name,
        email: row.client.email,
        status: initialStatus,
        nextSession:
          row.status === 'scheduled' && scheduledAt > now
            ? row.scheduled_at
            : null,
        lastSession: row.status === 'completed' ? row.scheduled_at : null,
        totalSessions: 1,
      });
      return;
    }

    existing.totalSessions += 1;

    if (row.status === 'scheduled' && scheduledAt > now) {
      if (
        !existing.nextSession ||
        scheduledAt < new Date(existing.nextSession)
      ) {
        existing.nextSession = row.scheduled_at;
      }
    }

    if (row.status === 'completed') {
      if (
        !existing.lastSession ||
        scheduledAt > new Date(existing.lastSession)
      ) {
        existing.lastSession = row.scheduled_at;
      }
    }

    if (existing.status !== 'pending' && scheduledAt >= thirtyDaysAgo) {
      existing.status = 'active';
    }
  });

  const snapshotEntries = Array.from(clientById.values());

  snapshotEntries.sort((a, b) => {
    if (a.nextSession && b.nextSession) {
      return (
        new Date(a.nextSession).getTime() - new Date(b.nextSession).getTime()
      );
    }
    if (a.nextSession) {
      return -1;
    }
    if (b.nextSession) {
      return 1;
    }
    return deriveClientDisplayName(a).localeCompare(deriveClientDisplayName(b));
  });

  const snapshotClients = snapshotEntries
    .slice(0, clientLimit)
    .map(({ totalSessions: _totalSessions, ...client }) =>
      mapSnapshotClient(client)
    );

  const stats: CoachDashboardSnapshotStats = {
    totalSessions: sessionRows.length,
    completedSessions: sessionRows.filter(row => row.status === 'completed')
      .length,
    upcomingSessions: sessionRows.filter(
      row => row.status === 'scheduled' && new Date(row.scheduled_at) > now
    ).length,
    totalClients: clientById.size,
    activeClients: Array.from(clientById.values()).filter(
      client => client.status === 'active'
    ).length,
    pendingClients: Array.from(clientById.values()).filter(
      client => client.status === 'pending'
    ).length,
  };

  return {
    agenda,
    activity,
    snapshot: { stats, clients: snapshotClients },
    generatedAt: now.toISOString(),
  };
}

export async function loadDashboardSummary(
  actor: SessionSchedulerActor,
  options: LoadDashboardSummaryOptions = {}
): Promise<CoachDashboardSummary> {
  if (actor.role !== 'coach') {
    throw new SessionSchedulerError(
      'Only coaches can load the dashboard summary.',
      HTTP_STATUS.FORBIDDEN
    );
  }

  const supabase = createClient();
  const referenceDate = options.referenceDate ?? new Date();
  const startOfDay = new Date(referenceDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(referenceDate);
  endOfDay.setHours(23, 59, 59, 999);

  const agendaLimit = options.agendaLimit ?? DEFAULT_AGENDA_LIMIT;
  const activityLimit = options.activityLimit ?? DEFAULT_ACTIVITY_LIMIT;
  const clientLimit = options.clientLimit ?? DEFAULT_CLIENT_LIMIT;

  const rpcResponse = await supabase.rpc('coach_dashboard_summary', {
    coach_id: actor.id,
    start_at: startOfDay.toISOString(),
    end_at: endOfDay.toISOString(),
    agenda_limit: agendaLimit,
    activity_limit: activityLimit,
    client_limit: clientLimit,
  });

  if (rpcResponse.error && !isMissingRpcFunction(rpcResponse.error)) {
    throw new SessionSchedulerError(
      'Failed to load coach dashboard summary.',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      rpcResponse.error
    );
  }

  if (rpcResponse.data) {
    return mapRpcPayloadToSummary(
      (rpcResponse.data ?? {}) as CoachDashboardSummaryRpcPayload,
      referenceDate
    );
  }

  return loadDashboardSummaryFallback({
    supabase,
    actor,
    startOfDay,
    endOfDay,
    options,
  });
}
