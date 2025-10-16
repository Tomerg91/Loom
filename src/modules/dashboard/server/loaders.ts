/**
 * @fileoverview Server-side data loaders powering the coach dashboard.
 *
 * The loaders aggregate Supabase queries into a single payload so React Query
 * can hydrate with a single cache key while the UI renders distinct widgets.
 */

import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import type {
  CoachOverviewClientProgress,
  CoachOverviewData,
  CoachOverviewSession,
  CoachOverviewSummary,
  CoachOverviewTask,
} from '@/modules/dashboard/types';
import { createClient } from '@/modules/platform/supabase/server';
import type { TaskPriority, TaskStatus } from '@/modules/tasks/types/task';
import type { SessionStatus } from '@/types';

/** Default number of rows retrieved for list widgets. */
const DEFAULT_LIST_LIMIT = 5;

/** Helper describing the shape returned from the sessions table. */
interface SessionRow {
  id: string;
  title: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  status: SessionStatus | null;
  client_id: string | null;
  meeting_url: string | null;
}

/** Helper describing the shape returned from the tasks table. */
interface TaskRow {
  id: string;
  title: string | null;
  client_id: string | null;
  due_date: string | null;
  status: TaskStatus | null;
  priority: TaskPriority | null;
}

interface ClientRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface TaskStatusRow {
  client_id: string | null;
  status: TaskStatus | null;
}

interface SessionHistoryRow {
  client_id: string | null;
  scheduled_at: string | null;
  status: SessionStatus | null;
}

export interface FetchCoachOverviewOptions {
  upcomingLimit?: number;
  taskLimit?: number;
  /**
   * Optional reference time used for deterministic testing. Defaults to the
   * current time.
   */
  referenceDate?: Date;
}

/** Formats a client name while gracefully handling incomplete profiles. */
function formatClientName(
  client: ClientRow | undefined,
  fallbackEmail?: string | null
): string {
  if (!client) {
    return fallbackEmail ?? 'Client';
  }

  const parts = [client.first_name, client.last_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }

  return client.email ?? fallbackEmail ?? 'Client';
}

/** Converts raw Supabase rows into presentation-friendly session entries. */
function mapSessions(
  rows: SessionRow[] | null,
  clients: Map<string, ClientRow>
): CoachOverviewSession[] {
  if (!rows) {
    return [];
  }

  return rows.map(row => {
    const client = row.client_id ? clients.get(row.client_id) : undefined;

    return {
      id: row.id,
      title: row.title ?? 'Untitled session',
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes ?? null,
      status: (row.status ?? 'scheduled') as SessionStatus,
      clientId: row.client_id,
      clientName: formatClientName(client),
      meetingUrl: row.meeting_url ?? null,
    } satisfies CoachOverviewSession;
  });
}

/** Converts task rows into a condensed summary structure. */
function mapTasks(
  rows: TaskRow[] | null,
  clients: Map<string, ClientRow>
): CoachOverviewTask[] {
  if (!rows) {
    return [];
  }

  return rows.map(row => {
    const client = row.client_id ? clients.get(row.client_id) : undefined;

    return {
      id: row.id,
      title: row.title ?? 'Untitled task',
      clientId: row.client_id,
      clientName: formatClientName(client),
      dueDate: row.due_date,
      status: (row.status ?? 'PENDING') as TaskStatus,
      priority: (row.priority ?? 'MEDIUM') as TaskPriority,
    } satisfies CoachOverviewTask;
  });
}

/** Builds per-client progress metrics derived from task/session history. */
function buildClientProgress(
  clients: Map<string, ClientRow>,
  tasks: TaskStatusRow[] | null,
  sessions: SessionHistoryRow[] | null
): CoachOverviewClientProgress[] {
  const taskGroups = new Map<string, { total: number; completed: number }>();

  tasks?.forEach(task => {
    if (!task.client_id) {
      return;
    }

    const current = taskGroups.get(task.client_id) ?? {
      total: 0,
      completed: 0,
    };
    current.total += 1;
    if (task.status === 'COMPLETED') {
      current.completed += 1;
    }
    taskGroups.set(task.client_id, current);
  });

  const sessionLookup = new Map<string, string | null>();
  sessions?.forEach(session => {
    if (!session.client_id) {
      return;
    }

    const existing = sessionLookup.get(session.client_id);
    if (!existing) {
      sessionLookup.set(session.client_id, session.scheduled_at);
      return;
    }

    if (
      session.scheduled_at &&
      (!existing ||
        new Date(session.scheduled_at).getTime() > new Date(existing).getTime())
    ) {
      sessionLookup.set(session.client_id, session.scheduled_at);
    }
  });

  return Array.from(clients.entries()).map(([clientId, client]) => {
    const taskStats = taskGroups.get(clientId) ?? { total: 0, completed: 0 };
    const activeTasks = Math.max(taskStats.total - taskStats.completed, 0);

    const completionRate =
      taskStats.total > 0
        ? Math.round((taskStats.completed / taskStats.total) * 100)
        : null;

    return {
      clientId,
      clientName: formatClientName(client),
      clientEmail: client.email ?? undefined,
      lastSessionAt: sessionLookup.get(clientId) ?? null,
      activeTasks,
      completionRate,
    } satisfies CoachOverviewClientProgress;
  });
}

function assertNoError<T>(
  response: PostgrestSingleResponse<T>,
  message: string
): T {
  if (response.error) {
    throw new Error(`${message}: ${response.error.message}`);
  }

  return response.data as T;
}

/**
 * Aggregates core dashboard data for the supplied coach.
 */
export async function fetchCoachOverviewData(
  coachId: string,
  options: FetchCoachOverviewOptions = {}
): Promise<CoachOverviewData> {
  if (!coachId) {
    throw new Error('Coach identifier is required to load dashboard data');
  }

  const supabase = createClient();
  const now = options.referenceDate ?? new Date();
  const nowIso = now.toISOString();
  const upcomingLimit = options.upcomingLimit ?? DEFAULT_LIST_LIMIT;
  const taskLimit = options.taskLimit ?? DEFAULT_LIST_LIMIT;

  const [
    upcomingSessionsResponse,
    taskHighlightsResponse,
    overdueCountResponse,
    taskStatusesResponse,
    sessionHistoryResponse,
  ] = await Promise.all([
    supabase
      .from('sessions')
      .select(
        'id, title, scheduled_at, duration_minutes, status, client_id, meeting_url'
      )
      .eq('coach_id', coachId)
      .gte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(upcomingLimit),
    supabase
      .from('tasks')
      .select('id, title, client_id, due_date, status, priority')
      .eq('coach_id', coachId)
      .is('archived_at', null)
      .neq('status', 'COMPLETED')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(taskLimit),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .is('archived_at', null)
      .neq('status', 'COMPLETED')
      .lt('due_date', nowIso),
    supabase
      .from('tasks')
      .select('client_id, status')
      .eq('coach_id', coachId)
      .is('archived_at', null),
    supabase
      .from('sessions')
      .select('client_id, scheduled_at, status')
      .eq('coach_id', coachId)
      .order('scheduled_at', { ascending: false })
      .limit(50),
  ]);

  const upcomingSessions = assertNoError<SessionRow[] | null>(
    upcomingSessionsResponse,
    'Unable to load upcoming sessions'
  );
  const taskHighlights = assertNoError<TaskRow[] | null>(
    taskHighlightsResponse,
    'Unable to load task highlights'
  );
  const taskStatuses = assertNoError<TaskStatusRow[] | null>(
    taskStatusesResponse,
    'Unable to load task statistics'
  );
  const sessionHistory = assertNoError<SessionHistoryRow[] | null>(
    sessionHistoryResponse,
    'Unable to load session history'
  );

  if (overdueCountResponse.error) {
    throw new Error(
      `Unable to count overdue tasks: ${overdueCountResponse.error.message}`
    );
  }

  const clientIds = new Set<string>();
  upcomingSessions?.forEach(session => {
    if (session.client_id) {
      clientIds.add(session.client_id);
    }
  });
  taskHighlights?.forEach(task => {
    if (task.client_id) {
      clientIds.add(task.client_id);
    }
  });
  taskStatuses?.forEach(task => {
    if (task.client_id) {
      clientIds.add(task.client_id);
    }
  });
  sessionHistory?.forEach(session => {
    if (session.client_id) {
      clientIds.add(session.client_id);
    }
  });

  let clients = new Map<string, ClientRow>();
  if (clientIds.size > 0) {
    const clientResponse = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', Array.from(clientIds));

    const clientRows = assertNoError<ClientRow[] | null>(
      clientResponse,
      'Unable to load client profiles'
    );

    if (clientRows) {
      clients = new Map(clientRows.map(row => [row.id, row] as const));
    }
  }

  const upcomingSessionEntries = mapSessions(upcomingSessions, clients);
  const taskHighlightEntries = mapTasks(taskHighlights, clients);
  const clientProgressEntries = buildClientProgress(
    clients,
    taskStatuses,
    sessionHistory
  );

  const summary: CoachOverviewSummary = {
    totalClients: clients.size,
    activeTasks:
      taskStatuses?.filter(task => task.status !== 'COMPLETED').length ?? 0,
    overdueTasks: overdueCountResponse.count ?? 0,
    upcomingSessions: upcomingSessionEntries.length,
  };

  const payload: CoachOverviewData = {
    summary,
    upcomingSessions: upcomingSessionEntries,
    taskHighlights: taskHighlightEntries,
    clientProgress: clientProgressEntries.sort((a, b) =>
      a.clientName.localeCompare(b.clientName)
    ),
    generatedAt: nowIso,
  };

  return payload;
}
