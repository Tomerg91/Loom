/**
 * @fileoverview Convenience hook exports for the session scheduling workflows.
 * The file re-exports the core React Query hooks so legacy callers can migrate
 * to the new module structure without updating import paths in multiple files.
 */

export {
  sessionKeys,
  useCreateSessionRequest,
  useSessionCalendar,
  useSessionRequests,
  useUpdateSession,
} from '@/modules/sessions/api/sessions';

export type {
  SessionCalendarEntry,
  SessionMutationResult,
  SessionRequestSummary,
  SessionSchedulingRequest,
  SessionUpdatePayload,
} from '@/modules/sessions/types';
