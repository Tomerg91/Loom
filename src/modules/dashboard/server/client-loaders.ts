/**
 * @fileoverview Server-side data loader powering the client dashboard.
 * Aggregates Supabase queries into a single payload so server prefetching and
 * client refetches share a consistent implementation.
 */

import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import {
  type ClientGoalPriority,
  type ClientGoalProgress,
  type ClientGoalStatus,
  type ClientOverviewData,
  type ClientOverviewSession,
  type ClientOverviewSummary,
  type ClientOverviewTask,
} from '@/modules/dashboard/types';
import { createClient } from '@/modules/platform/supabase/server';
import type { TaskPriority, TaskStatus } from '@/modules/tasks/types/task';
import type { SessionStatus } from '@/types';

/** Default maximum rows retrieved for list widgets. */
const DEFAULT_LIST_LIMIT = 5;

interface SessionRow {
  id: string;
  title: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  status: SessionStatus | null;
  coach_id: string | null;
  meeting_url: string | null;
}

interface TaskRow {
  id: string;
  title: string | null;
  due_date: string | null;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  coach_id: string | null;
}

interface GoalRow {
  id: string;
  title: string | null;
  status: ClientGoalStatus | null;
  progress_percentage: number | null;
  priority: ClientGoalPriority | null;
  target_date: string | null;
}

interface CoachRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface FetchClientOverviewOptions {
  upcomingLimit?: number;
  taskLimit?: number;
  goalLimit?: number;
  /** Optional reference date to make tests deterministic. */
  referenceDate?: Date;
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

function formatCoachName(coach: CoachRow | undefined): string {
  if (!coach) {
    return 'Coach';
  }

  const parts = [coach.first_name, coach.last_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }

  return coach.email ?? 'Coach';
}

function mapSessions(
  rows: SessionRow[] | null,
  coaches: Map<string, CoachRow>
): ClientOverviewSession[] {
  if (!rows) {
    return [];
  }

  return rows.map(row => {
    const coach = row.coach_id ? coaches.get(row.coach_id) : undefined;

    return {
      id: row.id,
      title: row.title ?? 'Upcoming session',
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes ?? null,
      status: (row.status ?? 'scheduled') as SessionStatus,
      coachId: row.coach_id,
      coachName: formatCoachName(coach),
      meetingUrl: row.meeting_url ?? null,
    } satisfies ClientOverviewSession;
  });
}

function mapTasks(
  rows: TaskRow[] | null,
  coaches: Map<string, CoachRow>
): ClientOverviewTask[] {
  if (!rows) {
    return [];
  }

  return rows.map(row => {
    const coach = row.coach_id ? coaches.get(row.coach_id) : undefined;

    return {
      id: row.id,
      title: row.title ?? 'Task',
      dueDate: row.due_date,
      status: (row.status ?? 'PENDING') as TaskStatus,
      priority: (row.priority ?? 'MEDIUM') as TaskPriority,
      coachId: row.coach_id,
      coachName: coach ? formatCoachName(coach) : null,
    } satisfies ClientOverviewTask;
  });
}

function mapGoals(rows: GoalRow[] | null): ClientGoalProgress[] {
  if (!rows) {
    return [];
  }

  return rows.map(row => ({
    id: row.id,
    title: row.title ?? 'Goal',
    status: (row.status ?? 'active') as ClientGoalStatus,
    progressPercentage: Math.min(
      Math.max(row.progress_percentage ?? 0, 0),
      100
    ),
    priority: (row.priority ?? 'medium') as ClientGoalPriority,
    targetDate: row.target_date,
  }));
}

/**
 * Aggregates core dashboard data for the supplied client.
 */
export async function fetchClientOverviewData(
  clientId: string,
  options: FetchClientOverviewOptions = {}
): Promise<ClientOverviewData> {
  if (!clientId) {
    throw new Error('Client identifier is required to load dashboard data');
  }

  const supabase = createClient();
  const now = options.referenceDate ?? new Date();
  const nowIso = now.toISOString();
  const upcomingLimit = options.upcomingLimit ?? DEFAULT_LIST_LIMIT;
  const taskLimit = options.taskLimit ?? DEFAULT_LIST_LIMIT;
  const goalLimit = options.goalLimit ?? DEFAULT_LIST_LIMIT;

  const [
    upcomingSessionsResponse,
    activeTaskCountResponse,
    taskListResponse,
    goalsResponse,
    activeGoalsCountResponse,
    completedGoalsCountResponse,
  ] = await Promise.all([
    supabase
      .from('sessions')
      .select(
        'id, title, scheduled_at, duration_minutes, status, coach_id, meeting_url'
      )
      .eq('client_id', clientId)
      .gte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(upcomingLimit),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .is('archived_at', null)
      .neq('status', 'COMPLETED'),
    supabase
      .from('tasks')
      .select('id, title, due_date, status, priority, coach_id')
      .eq('client_id', clientId)
      .is('archived_at', null)
      .neq('status', 'COMPLETED')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(taskLimit),
    supabase
      .from('client_goals')
      .select('id, title, status, progress_percentage, priority, target_date')
      .eq('client_id', clientId)
      .order('target_date', { ascending: true, nullsFirst: false })
      .limit(goalLimit),
    supabase
      .from('client_goals')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'active'),
    supabase
      .from('client_goals')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'completed'),
  ]);

  const upcomingSessions = assertNoError<SessionRow[] | null>(
    upcomingSessionsResponse,
    'Unable to load upcoming sessions'
  );
  const tasks = assertNoError<TaskRow[] | null>(
    taskListResponse,
    'Unable to load tasks'
  );
  const goals = assertNoError<GoalRow[] | null>(
    goalsResponse,
    'Unable to load goals'
  );

  if (activeTaskCountResponse.error) {
    throw new Error(
      `Unable to count active tasks: ${activeTaskCountResponse.error.message}`
    );
  }

  if (activeGoalsCountResponse.error) {
    throw new Error(
      `Unable to count active goals: ${activeGoalsCountResponse.error.message}`
    );
  }

  if (completedGoalsCountResponse.error) {
    throw new Error(
      `Unable to count completed goals: ${completedGoalsCountResponse.error.message}`
    );
  }

  const coachIds = new Set<string>();
  upcomingSessions?.forEach(session => {
    if (session.coach_id) {
      coachIds.add(session.coach_id);
    }
  });
  tasks?.forEach(task => {
    if (task.coach_id) {
      coachIds.add(task.coach_id);
    }
  });

  let coaches = new Map<string, CoachRow>();
  if (coachIds.size > 0) {
    const coachResponse = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', Array.from(coachIds));

    const coachRows = assertNoError<CoachRow[] | null>(
      coachResponse,
      'Unable to load coach profiles'
    );

    if (coachRows) {
      coaches = new Map(coachRows.map(row => [row.id, row] as const));
    }
  }

  const sessionEntries = mapSessions(upcomingSessions, coaches);
  const taskEntries = mapTasks(tasks, coaches);
  const goalEntries = mapGoals(goals);

  const summary: ClientOverviewSummary = {
    upcomingSessions: sessionEntries.length,
    activeTasks: activeTaskCountResponse.count ?? taskEntries.length,
    goalsInProgress:
      activeGoalsCountResponse.count ??
      goalEntries.filter(goal => goal.status === 'active').length,
    completedGoals:
      completedGoalsCountResponse.count ??
      goalEntries.filter(goal => goal.status === 'completed').length,
  };

  const payload: ClientOverviewData = {
    summary,
    upcomingSessions: sessionEntries,
    tasks: taskEntries,
    goals: goalEntries,
    generatedAt: nowIso,
  };

  return payload;
}
