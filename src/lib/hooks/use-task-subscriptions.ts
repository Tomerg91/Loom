/**
 * @fileoverview React hooks for task real-time subscriptions.
 * Provides easy-to-use hooks that manage subscription lifecycle automatically.
 */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/ui/toast-provider';
import {
  subscribeToProgressUpdates,
  subscribeToTaskAssignments,
  subscribeToTaskUpdates,
  subscribeToInstanceStatusChanges,
  isRealtimeConnected,
  type ProgressUpdateCallback,
  type TaskAssignmentCallback,
  type TaskUpdateCallback,
} from '@/lib/realtime/task-subscriptions';

import { taskKeys } from './use-tasks';

/**
 * Hook to subscribe to real-time progress updates for a task instance.
 * Automatically invalidates queries when progress is updated.
 *
 * @param instanceId - The task instance ID to monitor
 * @param options - Optional configuration
 *
 * @example
 * ```tsx
 * function TaskDetailPage({ instanceId }) {
 *   const { isConnected } = useProgressSubscription(instanceId, {
 *     onUpdate: (progress) => {
 *       logger.debug('Progress updated:', progress.completionPercentage);
 *     }
 *   });
 *
 *   return (
 *     <div>
 *       {!isConnected && <ConnectionWarning />}
 *       <TaskProgress instanceId={instanceId} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useProgressSubscription(
  instanceId: string | null,
  options?: {
    onUpdate?: (progress: Record<string, unknown>) => void;
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!instanceId || !enabled) return;

    // Check initial connection state
    setIsConnected(isRealtimeConnected());

    const callback: ProgressUpdateCallback = (payload) => {
      logger.debug('Progress update:', payload.eventType);

      // Update connection state
      setIsConnected(true);

      // Invalidate instance query to refetch with new progress
      queryClient.invalidateQueries({
        queryKey: taskKeys.instance(instanceId),
      });

      // Invalidate assigned tasks (affects stats)
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'assigned'],
      });

      // Call custom callback if provided
      if (options?.onUpdate && payload.eventType !== 'DELETE') {
        options.onUpdate(payload.new);
      }
    };

    const cleanup = subscribeToProgressUpdates(instanceId, callback);

    // Check connection periodically
    const interval = setInterval(() => {
      setIsConnected(isRealtimeConnected());
    }, 5000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [instanceId, enabled, queryClient, options]);

  return { isConnected };
}

/**
 * Hook to subscribe to new task assignments for a client.
 * Shows toast notifications when new tasks are assigned.
 *
 * @param clientId - The client ID to monitor
 * @param options - Optional configuration
 *
 * @example
 * ```tsx
 * function ClientDashboard({ userId }) {
 *   const { isConnected, newAssignmentCount } = useTaskAssignmentSubscription(userId, {
 *     showNotifications: true
 *   });
 *
 *   return (
 *     <div>
 *       {newAssignmentCount > 0 && (
 *         <Badge>{newAssignmentCount} new tasks</Badge>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTaskAssignmentSubscription(
  clientId: string | null,
  options?: {
    onNewAssignment?: (task: Record<string, unknown>) => void;
    showNotifications?: boolean;
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const { info } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [newAssignmentCount, setNewAssignmentCount] = useState(0);
  const enabled = options?.enabled !== false;
  const showNotifications = options?.showNotifications !== false;

  useEffect(() => {
    if (!clientId || !enabled) return;

    // Check initial connection state
    setIsConnected(isRealtimeConnected());

    const callback: TaskAssignmentCallback = (payload) => {
      if (payload.eventType === 'INSERT') {
        logger.debug('New task assignment:', payload.new);

        // Update connection state
        setIsConnected(true);

        // Increment counter
        setNewAssignmentCount((prev) => prev + 1);

        // Invalidate assigned tasks query
        queryClient.invalidateQueries({
          queryKey: taskKeys.assigned(clientId, undefined),
        });

        // Show notification
        if (showNotifications) {
          info('New Task', 'You have been assigned a new task!');
        }

        // Call custom callback if provided
        if (options?.onNewAssignment) {
          options.onNewAssignment(payload.new);
        }
      }
    };

    const cleanup = subscribeToTaskAssignments(clientId, callback);

    // Check connection periodically
    const interval = setInterval(() => {
      setIsConnected(isRealtimeConnected());
    }, 5000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [clientId, enabled, queryClient, showNotifications, info, options]);

  // Reset counter function
  const resetCount = () => setNewAssignmentCount(0);

  return { isConnected, newAssignmentCount, resetCount };
}

/**
 * Hook to subscribe to task updates for a coach.
 * Automatically refreshes task lists when tasks are modified.
 *
 * @param coachId - The coach ID to monitor
 * @param options - Optional configuration
 *
 * @example
 * ```tsx
 * function CoachTaskList({ coachId }) {
 *   const { isConnected } = useTaskUpdateSubscription(coachId);
 *
 *   return (
 *     <div>
 *       <ConnectionIndicator connected={isConnected} />
 *       <TaskList coachId={coachId} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useTaskUpdateSubscription(
  coachId: string | null,
  options?: {
    onUpdate?: (task: Record<string, unknown>, eventType: string) => void;
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!coachId || !enabled) return;

    // Check initial connection state
    setIsConnected(isRealtimeConnected());

    const callback: TaskUpdateCallback = (payload) => {
      logger.debug('Task update:', payload.eventType);

      // Update connection state
      setIsConnected(true);

      // Invalidate task lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: taskKeys.templates(coachId),
      });

      // If it's a specific task update, invalidate that task
      if (payload.eventType === 'UPDATE' && payload.new.id) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.detail(payload.new.id as string),
        });
      }

      // Call custom callback if provided
      if (options?.onUpdate) {
        options.onUpdate(payload.new, payload.eventType);
      }
    };

    const cleanup = subscribeToTaskUpdates(coachId, callback);

    // Check connection periodically
    const interval = setInterval(() => {
      setIsConnected(isRealtimeConnected());
    }, 5000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [coachId, enabled, queryClient, options]);

  return { isConnected };
}

/**
 * Hook to subscribe to task instance status changes for a client.
 * Useful for tracking when tasks move from pending -> in_progress -> completed.
 *
 * @param clientId - The client ID to monitor
 * @param options - Optional configuration
 *
 * @example
 * ```tsx
 * function ClientTaskBoard({ userId }) {
 *   const { isConnected } = useInstanceStatusSubscription(userId, {
 *     onStatusChange: (instance, oldStatus, newStatus) => {
 *       if (newStatus === 'completed') {
 *         confetti();
 *       }
 *     }
 *   });
 *
 *   return <KanbanBoard />;
 * }
 * ```
 */
export function useInstanceStatusSubscription(
  clientId: string | null,
  options?: {
    onStatusChange?: (
      instance: Record<string, unknown>,
      oldStatus: string,
      newStatus: string
    ) => void;
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const { success } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!clientId || !enabled) return;

    // Check initial connection state
    setIsConnected(isRealtimeConnected());

    const callback: TaskAssignmentCallback = (payload) => {
      if (payload.eventType === 'UPDATE') {
        const oldStatus = payload.old.status;
        const newStatus = payload.new.status;

        if (oldStatus !== newStatus) {
          logger.debug(`Task status changed: ${oldStatus} -> ${newStatus}`);

          // Update connection state
          setIsConnected(true);

          // Invalidate assigned tasks
          queryClient.invalidateQueries({
            queryKey: taskKeys.assigned(clientId, undefined),
          });

          // Invalidate specific instance
          if (payload.new.id) {
            queryClient.invalidateQueries({
              queryKey: taskKeys.instance(payload.new.id as string),
            });
          }

          // Show success message for completion
          if (newStatus === 'completed') {
            success('Task Completed', 'Great job on completing this task!');
          }

          // Call custom callback if provided
          if (options?.onStatusChange) {
            options.onStatusChange(payload.new, oldStatus as string, newStatus as string);
          }
        }
      }
    };

    const cleanup = subscribeToInstanceStatusChanges(clientId, callback);

    // Check connection periodically
    const interval = setInterval(() => {
      setIsConnected(isRealtimeConnected());
    }, 5000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [clientId, enabled, queryClient, success, options]);

  return { isConnected };
}
