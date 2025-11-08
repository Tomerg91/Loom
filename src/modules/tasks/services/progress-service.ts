/**
 * @fileoverview Service encapsulating Supabase operations for recording task
 * progress updates and attachment metadata. The service performs access
 * control, input normalization, persistence, and serialization so API route
 * handlers remain focused on transport concerns.
 */

import { createAdminClient } from '@/lib/supabase/server';
import type {} from '@/types/supabase';

import type { TaskActor } from './task-service';
import type {
  AttachmentMetadataInput,
  CreateProgressUpdateInput,
  ProgressUpdateDto,
  TaskAttachmentDto,
} from '../types/progress';
import type { TaskStatus } from '../types/task';

type SupabaseClient = ReturnType<typeof createAdminClient>;

// Use stub types - tasks tables will be added to production database after migration
type TaskRow = import('../types/stub-types').TaskRow;
type TaskInstanceRow = import('../types/stub-types').TaskInstanceRow;
type ProgressRow = import('../types/stub-types').TaskProgressUpdateRow;
type AttachmentRow = import('../types/stub-types').TaskAttachmentRow;

type TaskInstanceRecord = TaskInstanceRow & {
  task: Pick<TaskRow, 'id' | 'coach_id' | 'client_id' | 'status'>;
};

const DEFAULT_VISIBILITY = true;
const accessDenied = (message = 'Access denied') =>
  new ProgressServiceError(message, 403, 'ACCESS_DENIED');
const instanceNotFound = () =>
  new ProgressServiceError(
    'Task instance not found',
    404,
    'INSTANCE_NOT_FOUND'
  );

const sanitizeNote = (note?: string | null) => {
  if (!note) {
    return null;
  }
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const resolveInstanceStatus = (
  percentage: number,
  currentStatus: TaskStatus
): TaskStatus => {
  if (percentage >= 100) {
    return 'COMPLETED';
  }
  if (percentage <= 0) {
    return 'PENDING';
  }
  if (currentStatus === 'OVERDUE') {
    return 'OVERDUE';
  }
  return 'IN_PROGRESS';
};

const serializeAttachment = (attachment: AttachmentRow): TaskAttachmentDto => ({
  id: attachment.id,
  taskInstanceId: attachment.task_instance_id,
  progressUpdateId: attachment.progress_update_id,
  fileName: attachment.file_name,
  fileSize: toNumber(attachment.file_size as unknown as number | string),
  mimeType: attachment.mime_type ?? null,
  fileUrl: attachment.file_url,
  storagePath: attachment.file_url.startsWith('http')
    ? null
    : attachment.file_url,
  uploadedById: attachment.uploaded_by_id,
  createdAt: new Date(attachment.created_at).toISOString(),
});

export class ProgressServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string = 'PROGRESS_SERVICE_ERROR'
  ) {
    super(message);
    this.name = 'ProgressServiceError';
  }
}

export class ProgressService {
  private clientInstance: SupabaseClient | null = null;

  constructor(
    private readonly clientFactory: () => SupabaseClient = createAdminClient
  ) {}

  private getClient(): SupabaseClient {
    if (!this.clientInstance) {
      this.clientInstance = this.clientFactory();
    }
    return this.clientInstance;
  }

  public async createProgressUpdate(
    actor: TaskActor,
    {
      taskId,
      taskInstanceId,
      input,
    }: {
      taskId: string;
      taskInstanceId: string;
      input: CreateProgressUpdateInput;
    }
  ): Promise<ProgressUpdateDto> {
    const client = this.getClient();

    const instance = await this.fetchInstance(taskId, taskInstanceId);

    this.ensureActorHasAccess(actor, instance);

    const percentage =
      input.percentage !== undefined
        ? input.percentage
        : toNumber(instance.completion_percentage);
    const note = sanitizeNote(input.note ?? null);
    const isVisible = input.isVisibleToCoach ?? DEFAULT_VISIBILITY;

    const { data: progressRow, error: progressError } = await client
      .from('task_progress_updates')
      .insert({
        task_instance_id: instance.id,
        author_id: actor.id,
        percentage,
        note,
        is_visible_to_coach: isVisible,
      })
      .select('*')
      .single();

    if (progressError || !progressRow) {
      throw new ProgressServiceError(
        progressError?.message ?? 'Failed to record progress update',
        500,
        'PROGRESS_CREATE_FAILED'
      );
    }

    const attachments = await this.persistAttachments(
      instance,
      progressRow,
      actor.id,
      input.attachments ?? []
    );

    const currentStatus = instance.task.status as TaskStatus;
    const nextStatus = resolveInstanceStatus(percentage, currentStatus);
    const completedAt =
      nextStatus === 'COMPLETED' ? new Date().toISOString() : null;

    const { error: instanceUpdateError } = await client
      .from('task_instances')
      .update({
        completion_percentage: percentage,
        status: nextStatus,
        completed_at: completedAt,
      })
      .eq('id', instance.id);

    if (instanceUpdateError) {
      throw new ProgressServiceError(
        instanceUpdateError.message,
        500,
        'INSTANCE_UPDATE_FAILED'
      );
    }

    if ((instance.task.status as TaskStatus) !== nextStatus) {
      const { error: taskUpdateError } = await client
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', instance.task.id);

      if (taskUpdateError) {
        throw new ProgressServiceError(
          taskUpdateError.message,
          500,
          'TASK_STATUS_UPDATE_FAILED'
        );
      }
    }

    return {
      id: progressRow.id,
      taskId: instance.task.id,
      taskInstanceId: instance.id,
      authorId: progressRow.author_id,
      percentage: progressRow.percentage,
      note: progressRow.note ?? null,
      isVisibleToCoach: progressRow.is_visible_to_coach ?? DEFAULT_VISIBILITY,
      createdAt: new Date(progressRow.created_at).toISOString(),
      instanceStatus: nextStatus,
      completionPercentage: percentage,
      completedAt,
      attachments,
    };
  }

  private async fetchInstance(
    taskId: string,
    taskInstanceId: string
  ): Promise<TaskInstanceRecord> {
    const client = this.getClient();

    const { data, error } = await client
      .from('task_instances')
      .select(
        `
        id,
        task_id,
        status,
        completion_percentage,
        scheduled_date,
        due_date,
        created_at,
        updated_at,
        task:tasks!inner(
          id,
          coach_id,
          client_id,
          status
        )
      `
      )
      .eq('id', taskInstanceId)
      .eq('task_id', taskId)
      .single();

    if (error || !data) {
      throw instanceNotFound();
    }

    const record = data as unknown as TaskInstanceRow & {
      task:
        | Pick<TaskRow, 'id' | 'coach_id' | 'client_id' | 'status'>
        | (Pick<TaskRow, 'id' | 'coach_id' | 'client_id' | 'status'> | null)[]
        | null;
    };

    const relatedTask = Array.isArray(record.task)
      ? record.task[0]
      : record.task;

    if (!relatedTask) {
      throw new ProgressServiceError(
        'Parent task missing for requested instance',
        404,
        'TASK_NOT_FOUND'
      );
    }

    return {
      ...record,
      task: relatedTask,
    } as TaskInstanceRecord;
  }

  private ensureActorHasAccess(actor: TaskActor, instance: TaskInstanceRecord) {
    if (actor.role === 'admin') {
      return;
    }

    if (actor.role === 'coach' && instance.task.coach_id === actor.id) {
      return;
    }

    if (actor.role === 'client' && instance.task.client_id === actor.id) {
      return;
    }

    throw accessDenied();
  }

  private async persistAttachments(
    instance: TaskInstanceRecord,
    progress: ProgressRow,
    actorId: string,
    attachments: AttachmentMetadataInput[]
  ): Promise<TaskAttachmentDto[]> {
    if (attachments.length === 0) {
      return [];
    }

    const client = this.getClient();

    const payload = attachments.map(attachment => ({
      task_instance_id: instance.id,
      progress_update_id: progress.id,
      file_url: attachment.fileUrl,
      file_name: attachment.fileName,
      file_size: attachment.fileSize,
      mime_type: attachment.mimeType ?? null,
      uploaded_by_id: actorId,
    }));

    const { data, error } = await client
      .from('task_attachments')
      .insert(payload)
      .select('*');

    if (error || !data) {
      await client.from('task_progress_updates').delete().eq('id', progress.id);

      throw new ProgressServiceError(
        error?.message ?? 'Failed to store attachment metadata',
        500,
        'ATTACHMENT_CREATE_FAILED'
      );
    }

    return data.map(row => serializeAttachment(row as AttachmentRow));
  }
}
