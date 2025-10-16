/**
 * @fileoverview Session module task type aliases that wrap the core task
 * module DTOs. The sessions module consumes task data for agenda planning
 * without exposing the broader task service internals.
 */
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

export type SessionTask = TaskDto;
export type SessionTaskInstance = TaskInstanceDto;
export type SessionTaskListResponse = CoreTaskListResponse;
export type SessionTaskPriority = TaskPriority;
export type SessionTaskStatus = TaskStatus;

export type SessionCreateTaskInput = CoreCreateTaskInput;
export type SessionUpdateTaskInput = CoreUpdateTaskInput;
export type SessionTaskListQueryInput = CoreTaskListQueryInput;
