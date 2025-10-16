/**
 * @fileoverview Session module type contracts. These include task type aliases
 * that wrap the core task DTOs and dedicated interfaces describing the session
 * scheduling workflows introduced in Phase 3.
 */
import type {
  SessionRequestInput,
  SessionUpdateInput,
} from '@/modules/sessions/validators/session';
import type {
  CreateTaskInput as CoreCreateTaskInput,
  TaskDto,
  TaskInstanceDto,
  TaskListQueryInput as CoreTaskListQueryInput,
  TaskListResponse as CoreTaskListResponse,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput as CoreUpdateTaskInput,
} from '@/modules/tasks/types/task';
import type { SessionStatus } from '@/types';

export type SessionTask = TaskDto;
export type SessionTaskInstance = TaskInstanceDto;
export type SessionTaskListResponse = CoreTaskListResponse;
export type SessionTaskPriority = TaskPriority;
export type SessionTaskStatus = TaskStatus;

export type SessionCreateTaskInput = CoreCreateTaskInput;
export type SessionUpdateTaskInput = CoreUpdateTaskInput;
export type SessionTaskListQueryInput = CoreTaskListQueryInput;

export type SessionSchedulingRequest = SessionRequestInput;
export type SessionUpdatePayload = SessionUpdateInput;

export type SessionRequestStatus = 'pending' | 'approved' | 'declined';

export interface SessionRequestSummary {
  id: string;
  coachId: string;
  clientId: string;
  sessionId: string | null;
  requestedBy: string;
  requestedAt: string;
  scheduledAt: string;
  durationMinutes: number;
  status: SessionRequestStatus;
  title: string | null;
  timezone: string | null;
  meetingUrl: string | null;
  notes: string | null;
  rescheduleReason: string | null;
  coachName?: string | null;
  clientName?: string | null;
  requesterName?: string | null;
}

export interface SessionCalendarEntry {
  id: string;
  coachId: string;
  clientId: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  status: SessionStatus;
  meetingUrl: string | null;
  timezone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  coachName?: string | null;
  clientName?: string | null;
}

export interface SessionMutationResult {
  success: boolean;
  session?: SessionCalendarEntry;
  request?: SessionRequestSummary;
}
