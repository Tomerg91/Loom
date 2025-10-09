/**
 * @fileoverview Service encapsulating Supabase-backed operations for the task
 * domain. The service coordinates validation, access control, recurrence
 * planning, and serialization so that API handlers can remain thin orchestration
 * layers.
 */
import { createAdminClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/types/supabase';

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
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from '../types/task';

/** Roles that interact with the task domain. */
export type TaskActorRole = 'admin' | 'coach' | 'client';

export interface TaskActor {
  id: string;
  role: TaskActorRole;
}

type SupabaseClient = ReturnType<typeof createAdminClient>;
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskCategoryRow = Database['public']['Tables']['task_categories']['Row'];
type TaskInstanceRow = Database['public']['Tables']['task_instances']['Row'];

type TaskRecord = TaskRow & {
  category?: (TaskCategoryRow | null) & { color_hex?: string | null };
  instances?: TaskInstanceRow[] | null;
};

const TASK_SELECT = `
  *,
  category:task_categories!tasks_category_id_fkey(
    id,
    label,
    color_hex
  ),
  instances:task_instances(*)
`;

const DEFAULT_INSTANCE_LIMIT = 10;

const accessDenied = (message = 'Access denied') =>
  new TaskServiceError(message, 403, 'ACCESS_DENIED');
const taskNotFound = () =>
  new TaskServiceError('Task not found', 404, 'TASK_NOT_FOUND');

const toISOStringOrNull = (value: string | null | undefined) =>
  value ? new Date(value).toISOString() : null;

const serializeInstance = (instance: TaskInstanceRow): TaskInstanceDto => ({
  id: instance.id,
  taskId: instance.task_id,
  scheduledDate: toISOStringOrNull(instance.scheduled_date),
  dueDate: new Date(instance.due_date).toISOString(),
  status: instance.status,
  completionPercentage: instance.completion_percentage,
  completedAt: toISOStringOrNull(instance.completed_at),
  createdAt: new Date(instance.created_at).toISOString(),
  updatedAt: new Date(instance.updated_at).toISOString(),
});

const serializeTask = (task: TaskRecord): TaskDto => {
  const instances = [...(task.instances ?? [])]
    .map(serializeInstance)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const category = task.category
    ? {
        id: task.category.id,
        label: task.category.label,
        colorHex: task.category.color_hex ?? '#1D7A85',
      }
    : null;

  return {
    id: task.id,
    coachId: task.coach_id,
    clientId: task.client_id,
    category,
    title: task.title,
    description: task.description,
    priority: task.priority,
    visibilityToCoach: task.visibility_to_coach,
    dueDate: toISOStringOrNull(task.due_date),
    recurrenceRule: task.recurrence_rule ?? null,
    archivedAt: toISOStringOrNull(task.archived_at),
    createdAt: new Date(task.created_at).toISOString(),
    updatedAt: new Date(task.updated_at).toISOString(),
    instances,
  };
};

const isCoachRole = (role: TaskActorRole) =>
  role === 'coach' || role === 'admin';

const ensureActorCanViewTask = (task: TaskRow, actor: TaskActor) => {
  if (actor.role === 'admin') {
    return;
  }

  if (actor.role === 'coach' && task.coach_id === actor.id) {
    return;
  }

  if (actor.role === 'client' && task.client_id === actor.id) {
    return;
  }

  throw accessDenied();
};

const resolveCoachId = (actor: TaskActor, payloadCoachId?: string): string => {
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
};

const planRecurrence = (
  recurrenceService: RecurrenceService,
  { dueDate, recurrenceRule }: { dueDate: Date | null; recurrenceRule: unknown }
): RecurrencePlan => {
  try {
    return recurrenceService.planInstances({ dueDate, recurrenceRule });
  } catch (error) {
    if (error instanceof RecurrenceServiceError) {
      throw new TaskServiceError(error.message, 400, 'RECURRENCE_INVALID');
    }
    throw error;
  }
};

const toJsonOrNull = (value: RecurrencePlan['recurrenceRule']): Json | null =>
  value ? (value as unknown as Json) : null;

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

export class TaskService {
  private clientInstance: SupabaseClient | null = null;

  constructor(
    private readonly clientFactory: () => SupabaseClient = createAdminClient,
    private readonly recurrenceService: RecurrenceService = new RecurrenceService(
      DEFAULT_INSTANCE_LIMIT
    )
  ) {}

  private getClient(): SupabaseClient {
    if (!this.clientInstance) {
      this.clientInstance = this.clientFactory();
    }

    return this.clientInstance;
  }

  public async createTask(
    actor: TaskActor,
    input: CreateTaskInput
  ): Promise<TaskDto> {
    if (!isCoachRole(actor.role)) {
      throw accessDenied();
    }

    const client = this.getClient();

    const coachId = resolveCoachId(actor, input.coachId);
    const dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (!dueDate && input.recurrenceRule) {
      throw new TaskServiceError(
        'A due date is required when specifying a recurrence rule',
        400,
        'DUE_DATE_REQUIRED'
      );
    }

    const plan = dueDate
      ? planRecurrence(this.recurrenceService, {
          dueDate,
          recurrenceRule: input.recurrenceRule ?? null,
        })
      : { recurrenceRule: null, instances: [] };

    const firstDueDate =
      plan.instances[0]?.dueDate ?? (dueDate ? new Date(dueDate) : null);

    const { data: insertedTask, error: insertError } = await client
      .from('tasks')
      .insert({
        coach_id: coachId,
        client_id: input.clientId,
        category_id: input.categoryId ?? null,
        title: input.title,
        description: input.description ?? null,
        priority: (input.priority ?? 'MEDIUM') as TaskPriority,
        status: 'PENDING' satisfies TaskStatus,
        visibility_to_coach: input.visibilityToCoach ?? true,
        due_date: firstDueDate ? firstDueDate.toISOString() : null,
        recurrence_rule: toJsonOrNull(plan.recurrenceRule),
        archived_at: null,
      })
      .select(TASK_SELECT)
      .single();

    if (insertError || !insertedTask) {
      throw new TaskServiceError(
        insertError?.message ?? 'Failed to create task',
        500,
        'TASK_CREATE_FAILED'
      );
    }

    if (plan.instances.length > 0) {
      const { error: instanceError } = await client
        .from('task_instances')
        .insert(
          plan.instances.map(instance => ({
            task_id: insertedTask.id,
            due_date: instance.dueDate.toISOString(),
            scheduled_date: instance.scheduledDate.toISOString(),
            status: 'PENDING' as TaskStatus,
            completion_percentage: 0,
          }))
        );

      if (instanceError) {
        throw new TaskServiceError(
          instanceError.message,
          500,
          'TASK_INSTANCE_CREATE_FAILED'
        );
      }
    }

    return this.getTaskById(insertedTask.id, actor);
  }

  public async listTasks(
    actor: TaskActor,
    filters: TaskListQueryInput
  ): Promise<TaskListResponse> {
    if (!isCoachRole(actor.role)) {
      throw accessDenied();
    }

    const client = this.getClient();

    const coachId = resolveCoachId(actor, filters.coachId);

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from('tasks')
      .select(TASK_SELECT, { count: 'exact' })
      .eq('coach_id', coachId);

    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority as TaskPriority[]);
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status as TaskStatus[]);
    }

    if (!filters.includeArchived) {
      query = query.is('archived_at', null);
    }

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    if (filters.dueDateFrom) {
      query = query.gte('due_date', filters.dueDateFrom);
    }

    if (filters.dueDateTo) {
      query = query.lte('due_date', filters.dueDateTo);
    }

    const ascending = filters.sortOrder !== 'desc';

    if (filters.sort === 'createdAt') {
      query = query.order('created_at', { ascending });
    } else {
      query = query
        .order('due_date', { ascending, nullsFirst: true })
        .order('created_at', { ascending: false });
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new TaskServiceError(error.message, 500, 'TASK_LIST_FAILED');
    }

    const rows = (data ?? []) as TaskRecord[];
    const tasks = rows.map(serializeTask);
    const total = count ?? tasks.length;

    return {
      data: tasks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  public async getTaskById(taskId: string, actor: TaskActor): Promise<TaskDto> {
    const task = await this.fetchTaskRecord(taskId);
    ensureActorCanViewTask(task, actor);
    return serializeTask(task as TaskRecord);
  }

  public async updateTask(
    taskId: string,
    actor: TaskActor,
    payload: UpdateTaskInput
  ): Promise<TaskDto> {
    if (!isCoachRole(actor.role)) {
      throw accessDenied();
    }

    const client = this.getClient();

    const task = await this.fetchTaskRecord(taskId);

    if (actor.role === 'coach' && task.coach_id !== actor.id) {
      throw accessDenied();
    }

    const updates: Database['public']['Tables']['tasks']['Update'] = {};

    if (payload.title !== undefined) {
      updates.title = payload.title;
    }

    if (payload.description !== undefined) {
      updates.description = payload.description ?? null;
    }

    if (payload.categoryId !== undefined) {
      updates.category_id = payload.categoryId ?? null;
    }

    if (payload.priority !== undefined) {
      updates.priority = payload.priority as TaskPriority;
    }

    if (payload.visibilityToCoach !== undefined) {
      updates.visibility_to_coach = payload.visibilityToCoach;
    }

    if (payload.archivedAt !== undefined) {
      updates.archived_at = payload.archivedAt ?? null;
    }

    if (payload.status !== undefined) {
      updates.status = payload.status as TaskStatus;
    }

    const shouldRebuildInstances =
      payload.dueDate !== undefined || payload.recurrenceRule !== undefined;

    if (shouldRebuildInstances) {
      let effectiveDueDate: Date | null;
      if (payload.dueDate !== undefined) {
        effectiveDueDate = payload.dueDate ? new Date(payload.dueDate) : null;
      } else {
        effectiveDueDate = task.due_date ? new Date(task.due_date) : null;
      }

      const plan = effectiveDueDate
        ? planRecurrence(this.recurrenceService, {
            dueDate: effectiveDueDate,
            recurrenceRule:
              payload.recurrenceRule !== undefined
                ? payload.recurrenceRule
                : (task.recurrence_rule ?? null),
          })
        : { recurrenceRule: null, instances: [] };

      const firstDueDate =
        plan.instances[0]?.dueDate ??
        (effectiveDueDate ? new Date(effectiveDueDate) : null);

      updates.due_date = firstDueDate ? firstDueDate.toISOString() : null;
      updates.recurrence_rule = toJsonOrNull(plan.recurrenceRule);

      const { error: deleteError } = await client
        .from('task_instances')
        .delete()
        .eq('task_id', taskId);

      if (deleteError) {
        throw new TaskServiceError(
          deleteError.message,
          500,
          'TASK_INSTANCE_DELETE_FAILED'
        );
      }

      if (plan.instances.length > 0) {
        const { error: insertError } = await client
          .from('task_instances')
          .insert(
            plan.instances.map(instance => ({
              task_id: taskId,
              due_date: instance.dueDate.toISOString(),
              scheduled_date: instance.scheduledDate.toISOString(),
              status: 'PENDING' as TaskStatus,
              completion_percentage: 0,
            }))
          );

        if (insertError) {
          throw new TaskServiceError(
            insertError.message,
            500,
            'TASK_INSTANCE_CREATE_FAILED'
          );
        }
      }
    } else if (payload.dueDate !== undefined) {
      updates.due_date = payload.dueDate ?? null;
    }

    if (payload.recurrenceRule === null && !shouldRebuildInstances) {
      updates.recurrence_rule = null;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await client
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (updateError) {
        throw new TaskServiceError(
          updateError.message,
          500,
          'TASK_UPDATE_FAILED'
        );
      }
    }

    return this.getTaskById(taskId, actor);
  }

  private async fetchTaskRecord(taskId: string): Promise<TaskRecord> {
    const client = this.getClient();

    const { data, error } = await client
      .from('tasks')
      .select(TASK_SELECT)
      .eq('id', taskId)
      .single();

    if (error || !data) {
      throw taskNotFound();
    }

    return data as TaskRecord;
  }
}
