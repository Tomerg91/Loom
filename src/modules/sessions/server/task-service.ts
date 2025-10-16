/**
 * @fileoverview Thin facade that exposes the core task service to the sessions
 * module. Wrapping the import keeps routing layers decoupled from the internal
 * task module organization while the domain transitions into the sessions
 * package.
 */
export {
  TaskService,
  TaskServiceError,
} from '@/modules/tasks/services/task-service';

export type {
  TaskActor,
  TaskActorRole,
} from '@/modules/tasks/services/task-service';
