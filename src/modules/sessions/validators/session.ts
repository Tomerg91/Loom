/**
 * @fileoverview Zod schemas describing the session scheduling workflows. The
 * validators are shared across the API routes and client-side forms so both
 * layers agree on the payload structure.
 */

import { z } from 'zod';

const meetingUrlSchema = z
  .string()
  .url({ message: 'Invalid URL' })
  .optional()
  .or(z.literal('').transform(() => undefined));

const timezoneSchema = z
  .string()
  .trim()
  .min(2, { message: 'Timezone is required' })
  .max(64, { message: 'Timezone must be shorter than 64 characters' })
  .optional();

const notesSchema = z
  .string()
  .trim()
  .max(2000, { message: 'Notes must be 2000 characters or fewer' })
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Schema validating incoming session scheduling requests.
 */
export const sessionRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Title is required' })
    .max(120, { message: 'Title must be 120 characters or fewer' }),
  clientId: z.string().uuid({ message: 'Client ID must be a valid UUID' }),
  coachId: z
    .string()
    .uuid({ message: 'Coach ID must be a valid UUID' })
    .optional(),
  scheduledAt: z
    .string()
    .datetime({
      offset: true,
      message: 'Scheduled date must be an ISO string',
    }),
  durationMinutes: z.coerce
    .number({ message: 'Duration must be a number' })
    .int({ message: 'Duration must be an integer' })
    .min(15, { message: 'Sessions must be at least 15 minutes' })
    .max(480, { message: 'Sessions cannot exceed 8 hours' }),
  meetingUrl: meetingUrlSchema,
  timezone: timezoneSchema,
  notes: notesSchema,
});

const sessionStatusValues = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const;

/**
 * Schema validating updates to an existing session record.
 */
export const sessionUpdateSchema = z
  .object({
    status: z.enum(sessionStatusValues).optional(),
    scheduledAt: z
      .string()
      .datetime({
        offset: true,
        message: 'Scheduled date must be an ISO string',
      })
      .optional(),
    durationMinutes: z.coerce
      .number({ message: 'Duration must be a number' })
      .int({ message: 'Duration must be an integer' })
      .min(15, { message: 'Sessions must be at least 15 minutes' })
      .max(480, { message: 'Sessions cannot exceed 8 hours' })
      .optional(),
    meetingUrl: meetingUrlSchema,
    timezone: timezoneSchema,
    notes: notesSchema,
    rescheduleReason: notesSchema,
    requestId: z
      .string()
      .uuid({ message: 'Request ID must be a valid UUID' })
      .optional(),
  })
  .refine(
    data =>
      Boolean(
        data.status ||
          data.scheduledAt ||
          data.durationMinutes ||
          data.meetingUrl !== undefined ||
          data.notes !== undefined ||
          data.rescheduleReason !== undefined ||
          data.timezone !== undefined ||
          data.requestId !== undefined
      ),
    {
      message: 'At least one field must be provided when updating a session.',
      path: ['status'],
    }
  );

export type SessionRequestInput = z.infer<typeof sessionRequestSchema>;
export type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>;
