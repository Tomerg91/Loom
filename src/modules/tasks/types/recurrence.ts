/**
 * @fileoverview Shared recurrence rule schemas and types for the task domain.
 * These definitions provide a normalized shape for recurrence configuration so
 * services and API layers can safely parse and persist scheduling metadata.
 */
import { z } from 'zod';

/** Supported recurrence frequencies, mirroring the RFC 5545 spec. */
export const recurrenceFrequencySchema = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
]);

/** Supported weekday identifiers (RFC 5545 two-character codes). */
export const recurrenceWeekdaySchema = z.enum([
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
]);

/** ISO string schema reused for until/start values. */
const isoDateSchema = z
  .string()
  .datetime({ message: 'Value must be an ISO-8601 date string' });

/**
 * Schema describing the recurrence rule payload accepted by the API layer.
 * The structure intentionally aligns with a subset of the RFC 5545 options
 * supported by the `rrule` library so that conversion to recurrence options
 * remains deterministic and auditable.
 */
export const recurrenceRuleSchema = z
  .object({
    frequency: recurrenceFrequencySchema,
    interval: z.number().int().positive().max(366).default(1),
    count: z.number().int().positive().max(366).optional(),
    until: isoDateSchema.optional(),
    byWeekday: z.array(recurrenceWeekdaySchema).min(1).optional(),
    byMonthDay: z.array(z.number().int().min(1).max(31)).min(1).optional(),
    bySetPosition: z.array(z.number().int().min(-53).max(53)).min(1).optional(),
    weekStart: recurrenceWeekdaySchema.optional(),
    timezone: z.string().min(1).optional(),
  })
  .strict();

/**
 * Type describing the normalized recurrence rule accepted by services.
 */
export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleSchema>;

/**
 * Type describing the recurrence rule persisted on the Task model.
 */
export interface RecurrenceRulePersisted extends RecurrenceRuleInput {
  /** ISO string capturing the seed date used when generating occurrences. */
  startDate: string;
  /** Stringified RRULE representation for interoperability/debugging. */
  rrule: string;
}

/**
 * Simple schedule entry describing a generated instance.
 */
export interface RecurrenceScheduleEntry {
  dueDate: Date;
  scheduledDate: Date;
}

/**
 * Output describing recurrence planning for creation/update flows.
 */
export interface RecurrencePlan {
  recurrenceRule: RecurrenceRulePersisted | null;
  instances: RecurrenceScheduleEntry[];
}
