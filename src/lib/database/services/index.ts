// Base service and shared interfaces
export type {
  GetSessionsOptions,
  GetSessionsCountOptions,
  CreateSessionData,
  UpdateSessionData,
  DatabaseSession,
} from './base-session';

// Specialized services
export { SessionCrudService } from './session-crud';
export { SessionSchedulingService } from './session-scheduling';
export { SessionParticipantsService } from './session-participants';
export { SessionWorkflowService } from './session-workflow';
export { SessionAnalyticsService } from './session-analytics';

// Re-export base class for extension
export { BaseSessionService } from './base-session';