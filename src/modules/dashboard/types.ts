/**
 * @fileoverview Shared type contracts for dashboard modules. These interfaces
 * describe the normalized data returned by server loaders and consumed by
 * React Query hooks so both server and client components can rely on a
 * consistent shape.
 */

import type { TaskPriority, TaskStatus } from '@/modules/tasks/types/task';
import type { SessionStatus } from '@/types';

/**
 * Summary metrics displayed at the top of the coach dashboard.
 */
export interface CoachOverviewSummary {
  /** Total number of unique clients assigned to the coach. */
  totalClients: number;
  /** Count of active tasks that still require attention. */
  activeTasks: number;
  /** Count of tasks that are past their due date. */
  overdueTasks: number;
  /** Count of upcoming sessions scheduled for the coach. */
  upcomingSessions: number;
}

/**
 * Normalised representation of an upcoming session entry displayed in the
 * overview widgets.
 */
export interface CoachOverviewSession {
  id: string;
  title: string;
  scheduledAt: string | null;
  durationMinutes: number | null;
  status: SessionStatus;
  clientId: string | null;
  clientName: string;
  meetingUrl: string | null;
}

/**
 * Highlights of tasks that require a coach's attention.
 */
export interface CoachOverviewTask {
  id: string;
  title: string;
  clientId: string | null;
  clientName: string;
  dueDate: string | null;
  status: TaskStatus;
  priority: TaskPriority;
}

/**
 * Aggregated metrics showing how each client is progressing.
 */
export interface CoachOverviewClientProgress {
  clientId: string;
  clientName: string;
  clientEmail?: string;
  lastSessionAt: string | null;
  activeTasks: number;
  completionRate: number | null;
}

/**
 * Primary payload returned by the coach overview server loader.
 */
export interface CoachOverviewData {
  summary: CoachOverviewSummary;
  upcomingSessions: CoachOverviewSession[];
  taskHighlights: CoachOverviewTask[];
  clientProgress: CoachOverviewClientProgress[];
  /** ISO timestamp used to communicate when the snapshot was generated. */
  generatedAt: string;
}

/** Supported status values returned by the client goals table. */
export type ClientGoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

/** Supported priority values for client goals. */
export type ClientGoalPriority = 'low' | 'medium' | 'high';

/** Summary metrics displayed at the top of the client dashboard. */
export interface ClientOverviewSummary {
  /** Count of upcoming sessions scheduled for the client. */
  upcomingSessions: number;
  /** Count of active tasks that still require action. */
  activeTasks: number;
  /** Count of goals currently in progress. */
  goalsInProgress: number;
  /** Count of goals that have been completed. */
  completedGoals: number;
}

/** Normalized representation of an upcoming client session. */
export interface ClientOverviewSession {
  id: string;
  title: string;
  scheduledAt: string | null;
  durationMinutes: number | null;
  status: SessionStatus;
  coachId: string | null;
  coachName: string;
  meetingUrl: string | null;
}

/** Snapshot of a client task awaiting completion. */
export interface ClientOverviewTask {
  id: string;
  title: string;
  dueDate: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  coachId: string | null;
  coachName: string | null;
}

/** Representation of client goal progress used in dashboard widgets. */
export interface ClientGoalProgress {
  id: string;
  title: string;
  status: ClientGoalStatus;
  progressPercentage: number;
  priority: ClientGoalPriority;
  targetDate: string | null;
}

/** Primary payload returned by the client overview server loader. */
export interface ClientOverviewData {
  summary: ClientOverviewSummary;
  upcomingSessions: ClientOverviewSession[];
  tasks: ClientOverviewTask[];
  goals: ClientGoalProgress[];
  /** ISO timestamp denoting when the snapshot was generated. */
  generatedAt: string;
}
