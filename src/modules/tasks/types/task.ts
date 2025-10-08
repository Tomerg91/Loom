/**
 * @fileoverview Zod schemas and DTO definitions for the task domain API.
 * These types provide a shared contract between route handlers, services,
 * and client-side consumers when creating, updating, and retrieving tasks.
 */
import { z } from 'zod';

import { recurrenceRuleSchema } from './recurrence';

const taskPriorityTuple = ['LOW', 'MEDIUM', 'HIGH'] as const;
type TaskPriorityTuple = typeof taskPriorityTuple;
export type TaskPriority = TaskPriorityTuple[number];
export const taskPriorityValues: readonly TaskPriority[] = [
  ...taskPriorityTuple,
];

const taskStatusTuple = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'OVERDUE',
] as const;
type TaskStatusTuple = typeof taskStatusTuple;
export type TaskStatus = TaskStatusTuple[number];
export const taskStatusValues: readonly TaskStatus[] = [...taskStatusTuple];

/**
 * Utility schema that converts ISO-8601 strings into native JavaScript Date
 * instances. The API accepts ISO strings and service layers operate on Date
 * objects so downstream database helpers can work with native types.
 */
const isoDateStringSchema = z
  .string()
  .datetime({ message: 'Value must be an ISO-8601 date string' });

const uuidSchema = z.string().uuid({ message: 'Value must be a valid UUID' });

/**
 * Schema describing the body accepted by the collection POST handler.
 */
const taskPrioritySchema = z.enum(taskPriorityTuple);

const taskStatusSchema = z.enum(taskStatusTuple);

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or fewer')
    .optional(),
  clientId: uuidSchema,
  coachId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  priority: taskPrioritySchema.default('MEDIUM').optional(),
  visibilityToCoach: z.boolean().optional(),
  dueDate: isoDateStringSchema.optional(),
  recurrenceRule: recurrenceRuleSchema.nullable().optional(),
});

/**
 * Schema describing the payload accepted by the item PATCH handler.
 */
export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be 200 characters or fewer')
      .optional(),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or fewer')
      .nullable()
      .optional(),
    categoryId: uuidSchema.nullish(),
    priority: taskPrioritySchema.optional(),
    visibilityToCoach: z.boolean().optional(),
    dueDate: isoDateStringSchema.optional(),
    archivedAt: isoDateStringSchema.nullable().optional(),
    status: taskStatusSchema.optional(),
    recurrenceRule: recurrenceRuleSchema.nullable().optional(),
  })
  .refine(payload => payload !== null && Object.keys(payload).length > 0, {
    message: 'At least one property must be provided for an update',
  });

const booleanFromQuery = z
  .union([z.literal('true'), z.literal('false')])
  .optional()
  .transform(value => (value === undefined ? undefined : value === 'true'));

/**
 * Schema describing the supported query parameters for list retrieval.
 */
export const taskListQuerySchema = z.object({
  coachId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  status: z.array(taskStatusSchema).optional(),
  priority: z.array(taskPrioritySchema).optional(),
  includeArchived: booleanFromQuery,
  search: z
    .string()
    .max(120, 'Search must be 120 characters or fewer')
    .optional(),
  dueDateFrom: isoDateStringSchema.optional(),
  dueDateTo: isoDateStringSchema.optional(),
  sort: z.enum(['dueDate', 'createdAt']).default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskListQueryInput = z.infer<typeof taskListQuerySchema>;

/**
 * DTO describing a task instance returned to API consumers.
 */
export interface TaskInstanceDto {
  id: string;
  taskId: string;
  scheduledDate: string | null;
  dueDate: string;
  status: TaskStatus;
  completionPercentage: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO describing task metadata returned to API consumers.
 */
export interface TaskDto {
  id: string;
  coachId: string;
  clientId: string;
  category?: {
    id: string;
    label: string;
    colorHex: string;
  } | null;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  visibilityToCoach: boolean;
  dueDate?: string | null;
  recurrenceRule?: unknown;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  instances: TaskInstanceDto[];
}

/**
 * Response envelope used by the list endpoint.
 */
export interface TaskListResponse {
  data: TaskDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
