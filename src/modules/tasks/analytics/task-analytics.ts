/**
 * @fileoverview Analytics tracking utilities for task management lifecycle events.
 * Provides comprehensive tracking for task creation, assignment, updates, completion,
 * and overdue detection using Sentry for monitoring and business intelligence.
 */

import {
  addBreadcrumb,
  captureMetric,
  trackBusinessMetric,
  trackUserEngagement,
} from '@/lib/monitoring/sentry';

import type { TaskPriority, TaskStatus } from '../types/task';

export interface TaskAnalyticsContext {
  taskId: string;
  coachId: string;
  clientId: string;
  sessionId?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  categoryId?: string | null;
  hasRecurrence?: boolean;
  hasDueDate?: boolean;
  instanceId?: string;
}

export interface TaskUpdateContext extends TaskAnalyticsContext {
  previousStatus?: TaskStatus;
  previousPriority?: TaskPriority;
  changedFields?: string[];
}

export interface TaskProgressContext {
  taskId: string;
  instanceId: string;
  clientId: string;
  coachId: string;
  percentage: number;
  previousPercentage?: number;
  isVisibleToCoach: boolean;
  hasNote: boolean;
}

/**
 * Track task creation event with comprehensive context
 */
export const trackTaskCreation = (context: TaskAnalyticsContext) => {
  // Track business metric
  trackBusinessMetric('task_created', 1, {
    coach_id: context.coachId,
    client_id: context.clientId,
    priority: context.priority || 'MEDIUM',
    has_recurrence: context.hasRecurrence ? 'true' : 'false',
    has_due_date: context.hasDueDate ? 'true' : 'false',
    has_session: context.sessionId ? 'true' : 'false',
  });

  // Track user engagement
  trackUserEngagement('create', 'task_management', context.coachId, {
    task_id: context.taskId,
    client_id: context.clientId,
    session_id: context.sessionId,
    priority: context.priority,
  });

  // Add breadcrumb for debugging
  addBreadcrumb({
    category: 'task_lifecycle',
    message: 'Task created',
    level: 'info',
    data: {
      task_id: context.taskId,
      coach_id: context.coachId,
      client_id: context.clientId,
      session_id: context.sessionId,
      priority: context.priority,
      has_recurrence: context.hasRecurrence,
    },
  });
};

/**
 * Track task assignment (when client is notified)
 */
export const trackTaskAssignment = (context: TaskAnalyticsContext) => {
  trackBusinessMetric('task_assigned', 1, {
    coach_id: context.coachId,
    client_id: context.clientId,
    priority: context.priority || 'MEDIUM',
  });

  trackUserEngagement('assign', 'task_management', context.coachId, {
    task_id: context.taskId,
    client_id: context.clientId,
  });

  addBreadcrumb({
    category: 'task_lifecycle',
    message: 'Task assigned to client',
    level: 'info',
    data: {
      task_id: context.taskId,
      client_id: context.clientId,
    },
  });
};

/**
 * Track task update event with change tracking
 */
export const trackTaskUpdate = (context: TaskUpdateContext) => {
  const statusChanged = context.previousStatus && context.previousStatus !== context.status;

  // Track status changes separately
  if (statusChanged) {
    trackBusinessMetric('task_status_changed', 1, {
      coach_id: context.coachId,
      client_id: context.clientId,
      from_status: context.previousStatus || 'UNKNOWN',
      to_status: context.status || 'UNKNOWN',
    });
  }

  // Track general update
  trackBusinessMetric('task_updated', 1, {
    coach_id: context.coachId,
    task_id: context.taskId,
    changed_fields: context.changedFields?.join(',') || 'unknown',
  });

  trackUserEngagement('update', 'task_management', context.coachId, {
    task_id: context.taskId,
    changed_fields: context.changedFields,
    status_changed: statusChanged,
  });

  addBreadcrumb({
    category: 'task_lifecycle',
    message: 'Task updated',
    level: 'info',
    data: {
      task_id: context.taskId,
      changed_fields: context.changedFields,
      status_changed: statusChanged,
    },
  });
};

/**
 * Track task completion event
 */
export const trackTaskCompletion = (context: TaskAnalyticsContext) => {
  trackBusinessMetric('task_completed', 1, {
    coach_id: context.coachId,
    client_id: context.clientId,
    priority: context.priority || 'MEDIUM',
    has_session: context.sessionId ? 'true' : 'false',
  });

  trackUserEngagement('complete', 'task_management', context.clientId, {
    task_id: context.taskId,
    coach_id: context.coachId,
    instance_id: context.instanceId,
  });

  addBreadcrumb({
    category: 'task_lifecycle',
    message: 'Task completed',
    level: 'info',
    data: {
      task_id: context.taskId,
      client_id: context.clientId,
      instance_id: context.instanceId,
    },
  });

  // Capture metric for completion rate tracking
  captureMetric('task_completion_rate', 1, {
    tags: {
      coach_id: context.coachId,
      client_id: context.clientId,
    },
    level: 'info',
  });
};

/**
 * Track task overdue detection
 */
export const trackTaskOverdue = (context: TaskAnalyticsContext) => {
  trackBusinessMetric('task_overdue', 1, {
    coach_id: context.coachId,
    client_id: context.clientId,
    priority: context.priority || 'MEDIUM',
    has_session: context.sessionId ? 'true' : 'false',
  });

  // This is more critical, so use warning level
  addBreadcrumb({
    category: 'task_lifecycle',
    message: 'Task marked as overdue',
    level: 'warning',
    data: {
      task_id: context.taskId,
      client_id: context.clientId,
      coach_id: context.coachId,
      priority: context.priority,
    },
  });

  // Track engagement for coach awareness
  trackUserEngagement('overdue', 'task_management', context.coachId, {
    task_id: context.taskId,
    client_id: context.clientId,
    priority: context.priority,
  });
};

/**
 * Track progress update event
 */
export const trackTaskProgress = (context: TaskProgressContext) => {
  const progressDelta = context.previousPercentage !== undefined
    ? context.percentage - context.previousPercentage
    : context.percentage;

  trackBusinessMetric('task_progress_update', context.percentage, {
    task_id: context.taskId,
    instance_id: context.instanceId,
    client_id: context.clientId,
    visible_to_coach: context.isVisibleToCoach ? 'true' : 'false',
    has_note: context.hasNote ? 'true' : 'false',
  });

  trackUserEngagement('update_progress', 'task_management', context.clientId, {
    task_id: context.taskId,
    instance_id: context.instanceId,
    percentage: context.percentage,
    progress_delta: progressDelta,
  });

  addBreadcrumb({
    category: 'task_lifecycle',
    message: `Task progress updated to ${context.percentage}%`,
    level: 'info',
    data: {
      task_id: context.taskId,
      instance_id: context.instanceId,
      percentage: context.percentage,
      progress_delta: progressDelta,
      visible_to_coach: context.isVisibleToCoach,
    },
  });

  // Track completion specifically when reaching 100%
  if (context.percentage === 100) {
    trackBusinessMetric('task_instance_completed', 1, {
      task_id: context.taskId,
      instance_id: context.instanceId,
      client_id: context.clientId,
    });
  }
};

/**
 * Track task archival
 */
export const trackTaskArchival = (context: TaskAnalyticsContext) => {
  trackBusinessMetric('task_archived', 1, {
    coach_id: context.coachId,
    client_id: context.clientId,
    status: context.status || 'UNKNOWN',
  });

  addBreadcrumb({
    category: 'task_lifecycle',
    message: 'Task archived',
    level: 'info',
    data: {
      task_id: context.taskId,
      coach_id: context.coachId,
    },
  });
};

/**
 * Track task deletion
 */
export const trackTaskDeletion = (context: TaskAnalyticsContext) => {
  trackBusinessMetric('task_deleted', 1, {
    coach_id: context.coachId,
    client_id: context.clientId,
  });

  trackUserEngagement('delete', 'task_management', context.coachId, {
    task_id: context.taskId,
    client_id: context.clientId,
  });

  addBreadcrumb({
    category: 'task_lifecycle',
    message: 'Task deleted',
    level: 'info',
    data: {
      task_id: context.taskId,
      coach_id: context.coachId,
    },
  });
};

/**
 * Track recurring task instance generation
 */
export const trackRecurringTaskInstance = (context: TaskAnalyticsContext & { instanceCount: number }) => {
  trackBusinessMetric('recurring_task_instance_generated', context.instanceCount, {
    task_id: context.taskId,
    coach_id: context.coachId,
    client_id: context.clientId,
  });

  addBreadcrumb({
    category: 'task_lifecycle',
    message: `Generated ${context.instanceCount} recurring task instances`,
    level: 'info',
    data: {
      task_id: context.taskId,
      instance_count: context.instanceCount,
    },
  });
};
