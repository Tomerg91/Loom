/**
 * @fileoverview Real-time subscription functions for task updates.
 * Provides Supabase real-time subscriptions for task progress, assignments, and updates.
 */
'use client';

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';

/**
 * Progress update payload from database changes.
 */
interface ProgressUpdate {
  id: string;
  instanceId: string;
  notes: string | null;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Task instance payload from database changes.
 */
interface TaskInstancePayload {
  id: string;
  taskId: string;
  clientId: string;
  status: 'pending' | 'in_progress' | 'completed';
  scheduledDate: string | null;
  dueDate: string;
  completionPercentage: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Task payload from database changes.
 */
interface TaskPayload {
  id: string;
  coachId: string;
  clientId: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Callback for progress update changes.
 */
export type ProgressUpdateCallback = (
  payload: RealtimePostgresChangesPayload<ProgressUpdate>
) => void;

/**
 * Callback for task assignment changes.
 */
export type TaskAssignmentCallback = (
  payload: RealtimePostgresChangesPayload<TaskInstancePayload>
) => void;

/**
 * Callback for task update changes.
 */
export type TaskUpdateCallback = (
  payload: RealtimePostgresChangesPayload<TaskPayload>
) => void;

/**
 * Subscribe to progress updates for a specific task instance.
 * Useful for real-time progress tracking on task detail pages.
 *
 * @param instanceId - The task instance ID to monitor
 * @param callback - Function called when progress is created or updated
 * @returns Cleanup function to unsubscribe
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const cleanup = subscribeToProgressUpdates(instanceId, (payload) => {
 *     if (payload.eventType === 'INSERT') {
 *       logger.debug('New progress update:', payload.new);
 *       queryClient.invalidateQueries(['task-instance', instanceId]);
 *     }
 *   });
 *
 *   return cleanup;
 * }, [instanceId]);
 * ```
 */
export function subscribeToProgressUpdates(
  instanceId: string,
  callback: ProgressUpdateCallback
): () => void {
  const supabase = createClient();
  let channel: RealtimeChannel | null = null;

  try {
    // Create a channel for this specific instance
    channel = supabase
      .channel(`progress-updates:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'task_progress_updates',
          filter: `instance_id=eq.${instanceId}`,
        },
        (payload) => {
          logger.debug('Progress update received:', payload);
          callback(payload as RealtimePostgresChangesPayload<ProgressUpdate>);
        }
      )
      .subscribe((status) => {
        logger.debug(
          `Progress subscription status for instance ${instanceId}:`,
          status
        );
      });
  } catch (error) {
    logger.error('Failed to subscribe to progress updates:', error);
  }

  // Return cleanup function
  return () => {
    if (channel) {
      logger.debug(`Unsubscribing from progress updates for ${instanceId}`);
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Subscribe to new task assignments for a client.
 * Notifies when tasks are assigned to the client.
 *
 * @param clientId - The client ID to monitor
 * @param callback - Function called when a new task is assigned
 * @returns Cleanup function to unsubscribe
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const cleanup = subscribeToTaskAssignments(userId, (payload) => {
 *     if (payload.eventType === 'INSERT') {
 *       toast.info('New Task', 'You have been assigned a new task!');
 *       queryClient.invalidateQueries(['tasks', 'assigned', userId]);
 *     }
 *   });
 *
 *   return cleanup;
 * }, [userId]);
 * ```
 */
export function subscribeToTaskAssignments(
  clientId: string,
  callback: TaskAssignmentCallback
): () => void {
  const supabase = createClient();
  let channel: RealtimeChannel | null = null;

  try {
    // Create a channel for this client's assignments
    channel = supabase
      .channel(`task-assignments:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to new assignments
          schema: 'public',
          table: 'task_instances',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          logger.debug('New task assignment received:', payload);
          callback(payload as RealtimePostgresChangesPayload<TaskInstancePayload>);
        }
      )
      .subscribe((status) => {
        logger.debug(
          `Task assignment subscription status for client ${clientId}:`,
          status
        );
      });
  } catch (error) {
    logger.error('Failed to subscribe to task assignments:', error);
  }

  // Return cleanup function
  return () => {
    if (channel) {
      logger.debug(`Unsubscribing from task assignments for ${clientId}`);
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Subscribe to task updates for a coach.
 * Monitors changes to tasks owned by the coach.
 *
 * @param coachId - The coach ID to monitor
 * @param callback - Function called when a task is created, updated, or deleted
 * @returns Cleanup function to unsubscribe
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const cleanup = subscribeToTaskUpdates(coachId, (payload) => {
 *     logger.debug('Task update:', payload.eventType);
 *     queryClient.invalidateQueries(['tasks', 'list']);
 *   });
 *
 *   return cleanup;
 * }, [coachId]);
 * ```
 */
export function subscribeToTaskUpdates(
  coachId: string,
  callback: TaskUpdateCallback
): () => void {
  const supabase = createClient();
  let channel: RealtimeChannel | null = null;

  try {
    // Create a channel for this coach's tasks
    channel = supabase
      .channel(`task-updates:${coachId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes
          schema: 'public',
          table: 'tasks',
          filter: `coach_id=eq.${coachId}`,
        },
        (payload) => {
          logger.debug('Task update received:', payload);
          callback(payload as RealtimePostgresChangesPayload<TaskPayload>);
        }
      )
      .subscribe((status) => {
        logger.debug(
          `Task update subscription status for coach ${coachId}:`,
          status
        );
      });
  } catch (error) {
    logger.error('Failed to subscribe to task updates:', error);
  }

  // Return cleanup function
  return () => {
    if (channel) {
      logger.debug(`Unsubscribing from task updates for ${coachId}`);
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Subscribe to task instance status changes for a specific client.
 * Monitors when task instances change status (pending -> in_progress -> completed).
 *
 * @param clientId - The client ID to monitor
 * @param callback - Function called when instance status changes
 * @returns Cleanup function to unsubscribe
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const cleanup = subscribeToInstanceStatusChanges(userId, (payload) => {
 *     if (payload.eventType === 'UPDATE') {
 *       const oldStatus = payload.old.status;
 *       const newStatus = payload.new.status;
 *       if (oldStatus !== newStatus) {
 *         logger.debug(`Task status changed from ${oldStatus} to ${newStatus}`);
 *         queryClient.invalidateQueries(['tasks', 'assigned']);
 *       }
 *     }
 *   });
 *
 *   return cleanup;
 * }, [userId]);
 * ```
 */
export function subscribeToInstanceStatusChanges(
  clientId: string,
  callback: TaskAssignmentCallback
): () => void {
  const supabase = createClient();
  let channel: RealtimeChannel | null = null;

  try {
    // Create a channel for this client's task instances
    channel = supabase
      .channel(`instance-status:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Only listen to updates
          schema: 'public',
          table: 'task_instances',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          logger.debug('Task instance status change:', payload);
          callback(payload as RealtimePostgresChangesPayload<TaskInstancePayload>);
        }
      )
      .subscribe((status) => {
        logger.debug(
          `Instance status subscription for client ${clientId}:`,
          status
        );
      });
  } catch (error) {
    logger.error('Failed to subscribe to instance status changes:', error);
  }

  // Return cleanup function
  return () => {
    if (channel) {
      logger.debug(`Unsubscribing from instance status for ${clientId}`);
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Connection state type for subscription hooks.
 */
export interface SubscriptionState {
  isConnected: boolean;
  isSubscribed: boolean;
  error: string | null;
}

/**
 * Check realtime connection status.
 * Useful for displaying connection indicators in the UI.
 *
 * @returns Boolean indicating if realtime is connected
 */
export function isRealtimeConnected(): boolean {
  try {
    const supabase = createClient();
    return supabase.realtime.isConnected();
  } catch (error) {
    logger.error('Error checking realtime connection:', error);
    return false;
  }
}
