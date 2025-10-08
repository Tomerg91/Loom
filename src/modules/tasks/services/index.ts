/**
 * @fileoverview Re-export hub for task domain services.
 * Exposing the service layer through a central module keeps consumer imports
 * stable while additional services (progress, recurrence, notifications) are
 * introduced in later steps of the implementation plan.
 */
export { TaskService, TaskServiceError } from './task-service';
export type { TaskActor, TaskActorRole } from './task-service';
export {
  RecurrenceService,
  RecurrenceServiceError,
} from './recurrence-service';
