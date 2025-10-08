/**
 * @fileoverview Service encapsulating Prisma-backed operations for the task
 * domain. The service mediates data validation, access control, and conversion
 * to DTOs so that API route handlers can remain thin orchestration layers.
 */
import type { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import {
  TaskPriority as TaskPriorityEnum,
  TaskStatus as TaskStatusEnum,
} from '@prisma/client';

import prisma from '@/lib/prisma';

import {
  RecurrenceService,
  RecurrenceServiceError,
} from './recurrence-service';
import type { RecurrencePlan } from '../types/recurrence';
import type {
  CreateTaskInput,
  TaskDto,
  TaskInstanceDto,
  TaskListQueryInput,
  TaskListResponse,
  UpdateTaskInput,
} from '../types/task';

/** Roles that interact with the task domain. */
type TaskActorRole = 'admin' | 'coach' | 'client';

export interface TaskActor {
  id: string;
  role: TaskActorRole;
}

interface TaskCategoryRecord {
  id: string;
  label: string;
  colorHex: string;
}

interface TaskInstanceRecord {
  id: string;
  taskId: string;
  scheduledDate: Date | null;
  dueDate: Date;
  status: TaskStatus;
  completionPercentage: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskRecord {
  id: string;
  coachId: string;
  clientId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  visibilityToCoach: boolean;
  dueDate: Date | null;
  recurrenceRule: Prisma.JsonValue | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: TaskCategoryRecord | null;
  instances: TaskInstanceRecord[];
}

const DEFAULT_INSTANCE_LIMIT = 10;

export class TaskServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string = 'TASK_SERVICE_ERROR'
  ) {
    super(message);
    this.name = 'TaskServiceError';
  }
}

const accessDenied = (message = 'Access denied') =>
  new TaskServiceError(message, 403, 'ACCESS_DENIED');
const taskNotFound = () =>
  new TaskServiceError('Task not found', 404, 'TASK_NOT_FOUND');

const ALLOWED_COACH_ROLES: TaskActorRole[] = ['coach', 'admin'];

const toDateOrNull = (value: string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return new Date(value);
};

function serializeInstance(instance: TaskInstanceRecord): TaskInstanceDto {
  return {
    id: instance.id,
    taskId: instance.taskId,
    scheduledDate: instance.scheduledDate
      ? instance.scheduledDate.toISOString()
      : null,
    dueDate: instance.dueDate.toISOString(),
    status: instance.status,
    completionPercentage: instance.completionPercentage,
    completedAt: instance.completedAt
      ? instance.completedAt.toISOString()
      : null,
    createdAt: instance.createdAt.toISOString(),
    updatedAt: instance.updatedAt.toISOString(),
  };
}

function serializeTask(task: TaskRecord): TaskDto {
  return {
    id: task.id,
    coachId: task.coachId,
    clientId: task.clientId,
    category: task.category
      ? {
          id: task.category.id,
          label: task.category.label,
          colorHex: task.category.colorHex,
        }
      : null,
    title: task.title,
    description: task.description,
    priority: task.priority,
    visibilityToCoach: task.visibilityToCoach,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    recurrenceRule: task.recurrenceRule
      ? JSON.parse(JSON.stringify(task.recurrenceRule))
      : null,
    archivedAt: task.archivedAt ? task.archivedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    instances: task.instances.map(serializeInstance),
  };
}

function buildInstanceFilters(
  filters: TaskListQueryInput
): Record<string, unknown> | undefined {
  const instanceFilters: Record<string, unknown> = {};

  if (filters.status && filters.status.length > 0) {
    instanceFilters.status = { in: [...new Set(filters.status)] };
  }

  if (filters.dueDateFrom || filters.dueDateTo) {
    const dueDateConditions: Record<string, Date> = {};
    if (filters.dueDateFrom) {
      dueDateConditions.gte = new Date(filters.dueDateFrom);
    }
    if (filters.dueDateTo) {
      dueDateConditions.lte = new Date(filters.dueDateTo);
    }
    instanceFilters.dueDate = dueDateConditions;
  }

  return Object.keys(instanceFilters).length > 0 ? instanceFilters : undefined;
}

function buildOrderBy(filters: TaskListQueryInput) {
  if (filters.sort === 'createdAt') {
    return [{ createdAt: filters.sortOrder }];
  }

  return [
    { instances: { _min: { dueDate: filters.sortOrder } } },
    { createdAt: 'desc' },
  ];
}

function resolveCoachId(actor: TaskActor, payloadCoachId?: string): string {
  if (actor.role === 'coach') {
    return actor.id;
  }

  if (actor.role === 'admin') {
    if (!payloadCoachId) {
      throw new TaskServiceError(
        'coachId is required when creating tasks as an admin',
        400,
        'COACH_ID_REQUIRED'
      );
    }
    return payloadCoachId;
  }

  throw accessDenied();
}

export class TaskService {
  constructor(
    private readonly client: typeof prisma = prisma,
    private readonly recurrenceService: RecurrenceService = new RecurrenceService(
      DEFAULT_INSTANCE_LIMIT
    )
  ) {}

  private get baseInclude() {
    return {
      category: true,
      instances: {
        orderBy: { dueDate: 'asc' as const },
        take: this.recurrenceService.maxInstances,
      },
    };
  }

  public async createTask(
    actor: TaskActor,
    payload: CreateTaskInput
  ): Promise<TaskDto> {
    if (!ALLOWED_COACH_ROLES.includes(actor.role)) {
      throw accessDenied();
    }

    const coachId = resolveCoachId(actor, payload.coachId);
    const dueDateValue = payload.dueDate ? new Date(payload.dueDate) : null;
    let recurrencePlan: RecurrencePlan;
    try {
      recurrencePlan = this.recurrenceService.planInstances({
        dueDate: dueDateValue,
        recurrenceRule: payload.recurrenceRule,
      });
    } catch (error) {
      if (error instanceof RecurrenceServiceError) {
        throw new TaskServiceError(
          error.message,
          400,
          'INVALID_RECURRENCE_RULE'
        );
      }
      throw error;
    }

    const createData: Record<string, unknown> = {
      coachId,
      clientId: payload.clientId,
      title: payload.title,
      description: payload.description ?? null,
      priority: payload.priority ?? TaskPriorityEnum.MEDIUM,
      visibilityToCoach: payload.visibilityToCoach ?? true,
      dueDate:
        recurrencePlan.instances.length > 0
          ? recurrencePlan.instances[0].dueDate
          : dueDateValue,
      recurrenceRule: recurrencePlan.recurrenceRule,
    };

    if (payload.categoryId) {
      createData.category = { connect: { id: payload.categoryId } };
    }

    if (recurrencePlan.instances.length > 0) {
      createData.instances = {
        create: recurrencePlan.instances.map(instance => ({
          dueDate: instance.dueDate,
          scheduledDate: instance.scheduledDate,
          status: TaskStatusEnum.PENDING,
        })),
      };
    }

    const task = (await this.client.task.create({
      data: createData,
      include: this.baseInclude,
    })) as TaskRecord;

    return serializeTask(task);
  }

  public async listTasks(
    actor: TaskActor,
    filters: TaskListQueryInput
  ): Promise<TaskListResponse> {
    const where: Record<string, unknown> = {};

    if (!filters.includeArchived) {
      where.archivedAt = null;
    }

    if (actor.role === 'coach') {
      where.coachId = actor.id;
    } else if (actor.role === 'client') {
      where.clientId = actor.id;
    } else if (actor.role === 'admin' && filters.coachId) {
      where.coachId = filters.coachId;
    }

    if (filters.clientId) {
      if (actor.role === 'client' && filters.clientId !== actor.id) {
        throw accessDenied();
      }
      where.clientId = filters.clientId;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.priority && filters.priority.length > 0) {
      where.priority = { in: [...new Set(filters.priority)] as TaskPriority[] };
    }

    if (filters.search) {
      const sanitized = filters.search.trim();
      if (sanitized) {
        where.OR = [
          { title: { contains: sanitized, mode: 'insensitive' } },
          { description: { contains: sanitized, mode: 'insensitive' } },
        ];
      }
    }

    const instanceFilters = buildInstanceFilters(filters);
    if (instanceFilters) {
      where.instances = { some: instanceFilters };
    }

    const skip = (filters.page - 1) * filters.pageSize;
    const take = filters.pageSize;

    const [tasks, total] = (await this.client.$transaction([
      this.client.task.findMany({
        where,
        include: this.baseInclude,
        orderBy: buildOrderBy(filters),
        skip,
        take,
      }),
      this.client.task.count({ where }),
    ])) as [TaskRecord[], number];

    const totalPages = total > 0 ? Math.ceil(total / filters.pageSize) : 0;

    return {
      data: tasks.map(serializeTask),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages,
      },
    };
  }

  public async getTaskById(taskId: string, actor: TaskActor): Promise<TaskDto> {
    const task = (await this.client.task.findUnique({
      where: { id: taskId },
      include: this.baseInclude,
    })) as TaskRecord | null;

    if (!task) {
      throw taskNotFound();
    }

    if (actor.role === 'coach' && actor.id !== task.coachId) {
      throw accessDenied();
    }

    if (actor.role === 'client' && actor.id !== task.clientId) {
      throw accessDenied();
    }

    return serializeTask(task);
  }

  public async updateTask(
    taskId: string,
    actor: TaskActor,
    payload: UpdateTaskInput
  ): Promise<TaskDto> {
    const task = (await this.client.task.findUnique({
      where: { id: taskId },
      include: {
        category: true,
        instances: {
          orderBy: { dueDate: 'asc' as const },
        },
      },
    })) as TaskRecord | null;

    if (!task) {
      throw taskNotFound();
    }

    if (actor.role === 'coach' && actor.id !== task.coachId) {
      throw accessDenied();
    }

    const updateData: Record<string, unknown> = {};

    if (payload.title !== undefined) {
      updateData.title = payload.title;
    }

    if (payload.description !== undefined) {
      updateData.description = payload.description;
    }

    if (payload.categoryId !== undefined) {
      updateData.category = payload.categoryId
        ? { connect: { id: payload.categoryId } }
        : { disconnect: true };
    }

    if (payload.priority !== undefined) {
      updateData.priority = payload.priority;
    }

    if (payload.visibilityToCoach !== undefined) {
      updateData.visibilityToCoach = payload.visibilityToCoach;
    }

    if (payload.archivedAt !== undefined) {
      updateData.archivedAt = toDateOrNull(payload.archivedAt);
    }
    let recurrencePlan: RecurrencePlan | null = null;
    let dueDateOverride: Date | null | undefined;

    if (payload.dueDate !== undefined) {
      dueDateOverride = toDateOrNull(payload.dueDate);
    }

    if (payload.recurrenceRule !== undefined || payload.dueDate !== undefined) {
      const baselineDueDate =
        dueDateOverride !== undefined
          ? dueDateOverride
          : (task.dueDate ?? task.instances[0]?.dueDate ?? null);

      try {
        recurrencePlan = this.recurrenceService.planInstances({
          dueDate: baselineDueDate,
          recurrenceRule:
            payload.recurrenceRule !== undefined
              ? payload.recurrenceRule
              : task.recurrenceRule,
        });
      } catch (error) {
        if (error instanceof RecurrenceServiceError) {
          throw new TaskServiceError(
            error.message,
            400,
            'INVALID_RECURRENCE_RULE'
          );
        }
        throw error;
      }

      updateData.dueDate =
        recurrencePlan.instances.length > 0
          ? recurrencePlan.instances[0].dueDate
          : null;
      updateData.recurrenceRule = recurrencePlan.recurrenceRule;
    }

    const hasTaskChanges = Object.keys(updateData).length > 0;
    const activeInstance = task.instances[0];
    const shouldSyncInstances = recurrencePlan !== null;
    const shouldUpdateStatus = payload.status !== undefined;

    await this.client.$transaction(async tx => {
      if (hasTaskChanges) {
        await tx.task.update({
          where: { id: taskId },
          data: updateData,
        });
      }

      if (shouldSyncInstances) {
        const plannedInstances = recurrencePlan?.instances ?? [];
        const [plannedPrimary, ...plannedRest] = plannedInstances;

        if (activeInstance) {
          if (plannedPrimary) {
            await tx.taskInstance.update({
              where: { id: activeInstance.id },
              data: {
                dueDate: plannedPrimary.dueDate,
                scheduledDate: plannedPrimary.scheduledDate,
              },
            });
          } else {
            await tx.taskInstance.delete({ where: { id: activeInstance.id } });
          }

          await tx.taskInstance.deleteMany({
            where: {
              taskId,
              id: { not: activeInstance.id },
            },
          });

          if (plannedPrimary && plannedRest.length > 0) {
            await tx.taskInstance.createMany({
              data: plannedRest.map(instance => ({
                taskId,
                dueDate: instance.dueDate,
                scheduledDate: instance.scheduledDate,
                status: TaskStatusEnum.PENDING,
              })),
            });
          }
        } else {
          await tx.taskInstance.deleteMany({ where: { taskId } });

          if (plannedInstances.length > 0) {
            await tx.taskInstance.createMany({
              data: plannedInstances.map(instance => ({
                taskId,
                dueDate: instance.dueDate,
                scheduledDate: instance.scheduledDate,
                status: TaskStatusEnum.PENDING,
              })),
            });
          }
        }
      }

      const hasPrimaryAfterSync =
        !shouldSyncInstances || (recurrencePlan?.instances.length ?? 0) > 0;

      if (activeInstance && shouldUpdateStatus && hasPrimaryAfterSync) {
        const instanceData: Record<string, unknown> = {
          status: payload.status,
        };

        instanceData.completedAt =
          payload.status === TaskStatusEnum.COMPLETED
            ? new Date()
            : payload.status === TaskStatusEnum.PENDING
              ? null
              : activeInstance.completedAt;

        await tx.taskInstance.update({
          where: { id: activeInstance.id },
          data: instanceData,
        });
      }
    });

    const updatedTask = (await this.client.task.findUnique({
      where: { id: taskId },
      include: this.baseInclude,
    })) as TaskRecord | null;

    if (!updatedTask) {
      throw taskNotFound();
    }

    return serializeTask(updatedTask);
  }
}
