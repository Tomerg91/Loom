/**
 * @fileoverview Shared schemas and DTOs for task progress updates and
 * attachment metadata. These types ensure API handlers, services, and client
 * consumers exchange consistent payloads when clients log their homework
 * progress or upload supporting evidence.
 */
import { z } from 'zod';

import { config } from '@/lib/config';

import type { TaskStatus } from './task';
const MAX_NOTE_LENGTH = 2000;
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = config.file.DOCUMENT_MAX_SIZE;

/**
 * Schema describing metadata for attachments associated with a progress
 * update. The client uploads files through a signed URL workflow and then
 * persists the resulting paths and details with the progress entry.
 */
export const attachmentMetadataSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name must be 255 characters or fewer'),
  fileSize: z
    .number({ invalid_type_error: 'File size must be a number' })
    .int('File size must be an integer')
    .min(0, 'File size must be greater than or equal to zero')
    .max(MAX_FILE_SIZE, `File size must be ${MAX_FILE_SIZE} bytes or smaller`),
  mimeType: z
    .string()
    .min(1, 'MIME type is required')
    .max(120, 'MIME type must be 120 characters or fewer')
    .optional(),
  fileUrl: z
    .string()
    .min(1, 'File URL is required')
    .max(1024, 'File URL must be 1024 characters or fewer'),
  storagePath: z
    .string()
    .min(1, 'Storage path is required')
    .max(1024, 'Storage path must be 1024 characters or fewer')
    .optional(),
});

/**
 * Schema describing the payload accepted by the progress update endpoint.
 * At least one meaningful field (percentage, note, or attachment) must be
 * provided to avoid inserting empty updates.
 */
export const createProgressUpdateSchema = z
  .object({
    percentage: z
      .number({ invalid_type_error: 'Percentage must be a number' })
      .int('Percentage must be an integer')
      .min(0, 'Percentage must be between 0 and 100')
      .max(100, 'Percentage must be between 0 and 100')
      .optional(),
    note: z
      .string()
      .max(
        MAX_NOTE_LENGTH,
        `Note must be ${MAX_NOTE_LENGTH} characters or fewer`
      )
      .transform(value => value.trim())
      .optional(),
    isVisibleToCoach: z.boolean().optional(),
    attachments: z
      .array(attachmentMetadataSchema)
      .max(
        MAX_ATTACHMENTS,
        `You can attach up to ${MAX_ATTACHMENTS} files per update`
      )
      .optional(),
  })
  .refine(
    payload => {
      const hasPercentage = payload.percentage !== undefined;
      const hasNote = Boolean(payload.note && payload.note.length > 0);
      const hasAttachments = Boolean(payload.attachments?.length);
      return hasPercentage || hasNote || hasAttachments;
    },
    {
      message:
        'Provide a percentage, note, or at least one attachment when submitting progress',
    }
  );

export type CreateProgressUpdateInput = z.infer<
  typeof createProgressUpdateSchema
>;
export type AttachmentMetadataInput = z.infer<typeof attachmentMetadataSchema>;

/**
 * Attachment metadata returned to API consumers after persistence.
 */
export interface TaskAttachmentDto {
  id: string;
  taskInstanceId: string | null;
  progressUpdateId: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  fileUrl: string;
  storagePath?: string | null;
  uploadedById: string | null;
  createdAt: string;
}

/**
 * Progress update metadata returned to API consumers.
 */
export interface ProgressUpdateDto {
  id: string;
  taskId: string;
  taskInstanceId: string;
  authorId: string;
  percentage: number;
  note: string | null;
  isVisibleToCoach: boolean;
  createdAt: string;
  instanceStatus: TaskStatus;
  completionPercentage: number;
  completedAt: string | null;
  attachments: TaskAttachmentDto[];
}

/**
 * Helper for referencing path parameters when constructing service calls.
 */
export interface ProgressRouteParams {
  taskId: string;
  instanceId: string;
}
