/**
 * @fileoverview Session-specific task validation helpers. These re-export the
 * canonical task schemas so feature work inside the sessions module can
 * consume a stable contract while the core task domain continues to evolve.
 */
import {
  createTaskSchema as coreCreateTaskSchema,
  taskListQuerySchema as coreTaskListQuerySchema,
  updateTaskSchema as coreUpdateTaskSchema,
} from '@/modules/tasks/types/task';

export const sessionCreateTaskSchema = coreCreateTaskSchema;
export const sessionUpdateTaskSchema = coreUpdateTaskSchema;
export const sessionTaskListQuerySchema = coreTaskListQuerySchema;
