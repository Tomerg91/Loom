/**
 * @fileoverview Aggregates API-facing task module exports. Keeping re-exports
 * alongside the API folder allows client hooks to import DTOs without
 * depending on deeper service internals.
 */
export type { TaskDto, TaskInstanceDto, TaskListResponse } from '../types/task';
export {
  createTaskSchema,
  updateTaskSchema,
  taskListQuerySchema,
} from '../types/task';

export {
  TaskApiError,
  buildTaskListQuery,
  createProgressUpdate,
  createTask,
  fetchClientTaskList,
  fetchTask,
  fetchTaskList,
  updateTask,
} from './client';
export type { TaskListFilters } from './client';
