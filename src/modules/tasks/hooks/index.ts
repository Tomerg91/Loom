/**
 * @fileoverview Entry point for task-specific React hooks.
 * Exposes typed React Query utilities that power the Action Items & Homework
 * feature set. Additional hooks should be re-exported here to keep consumer
 * imports stable across refactors.
 */
export {
  taskKeys,
  useCreateProgressUpdate,
  useCreateTask,
  useTask,
  useTaskList,
  useUpdateTask,
} from './queries';
export type { TaskApiError, TaskListFilters } from './queries';
