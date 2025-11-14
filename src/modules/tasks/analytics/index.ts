/**
 * @fileoverview Task analytics module exports
 * Provides analytics tracking functions for task management lifecycle events
 */

export {
  trackTaskCreation,
  trackTaskAssignment,
  trackTaskUpdate,
  trackTaskCompletion,
  trackTaskOverdue,
  trackTaskProgress,
  trackTaskArchival,
  trackTaskDeletion,
  trackRecurringTaskInstance,
  type TaskAnalyticsContext,
  type TaskUpdateContext,
  type TaskProgressContext,
} from './task-analytics';
