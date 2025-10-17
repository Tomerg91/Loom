/**
 * @fileoverview React Query powered task helpers for the sessions module. The
 * functions wrap the core task API clients while scoping cache keys to the
 * sessions domain so dashboards can manage their own lifetime.
 */
'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

import type {
  SessionCreateTaskInput,
  SessionTask,
  SessionTaskListQueryInput,
  SessionTaskListResponse,
  SessionUpdateTaskInput,
} from '@/modules/sessions/types';
import {
  createTask,
  fetchTask,
  fetchTaskList,
  updateTask,
  type TaskApiError,
  type TaskListFilters,
} from '@/modules/tasks/api/client';

export type SessionTaskListFilters = TaskListFilters;

const normalizeFilters = (filters: SessionTaskListFilters = {}) => {
  const normalized: Record<string, unknown> = { ...filters };

  if (normalized.status) {
    normalized.status = [...(normalized.status as string[])].sort();
  }

  if (normalized.priority) {
    normalized.priority = [...(normalized.priority as string[])].sort();
  }

  return normalized;
};

export const sessionTaskKeys = {
  all: ['sessions', 'tasks'] as const,
  lists: () => [...sessionTaskKeys.all, 'list'] as const,
  list: (filters: ReturnType<typeof normalizeFilters>) =>
    [...sessionTaskKeys.lists(), { filters }] as const,
  detail: (taskId: string) =>
    [...sessionTaskKeys.all, 'detail', taskId] as const,
};

type SessionTaskListQueryOptions = Omit<
  UseQueryOptions<SessionTaskListResponse, TaskApiError>,
  'queryKey' | 'queryFn'
>;

type SessionTaskDetailOptions = Omit<
  UseQueryOptions<SessionTask, TaskApiError>,
  'queryKey' | 'queryFn'
>;

type SessionTaskMutationOptions<TResult, TVariables> = UseMutationOptions<
  TResult,
  TaskApiError,
  TVariables
>;

export const useSessionTaskList = (
  filters: SessionTaskListFilters = {},
  options?: SessionTaskListQueryOptions
) => {
  const normalized = normalizeFilters(filters);

  return useQuery({
    queryKey: sessionTaskKeys.list(normalized),
    queryFn: () => fetchTaskList(filters),
    staleTime: 60_000,
    ...options,
  });
};

export const useSessionTask = (
  taskId: string,
  options?: SessionTaskDetailOptions
) =>
  useQuery({
    queryKey: sessionTaskKeys.detail(taskId),
    queryFn: () => fetchTask(taskId),
    enabled: Boolean(taskId),
    staleTime: 60_000,
    ...options,
  });

export const useSessionCreateTask = (
  options?: SessionTaskMutationOptions<SessionTask, SessionCreateTaskInput>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    async onSuccess(task, variables, context) {
      await queryClient.invalidateQueries({
        queryKey: sessionTaskKeys.lists(),
      });
      await options?.onSuccess?.(task, variables, context);
      return task;
    },
    ...options,
  });
};

export const useSessionUpdateTask = (
  options?: SessionTaskMutationOptions<
    SessionTask,
    { taskId: string; input: SessionUpdateTaskInput }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, input }) => updateTask(taskId, input),
    async onSuccess(task, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: sessionTaskKeys.detail(variables.taskId),
        }),
        queryClient.invalidateQueries({ queryKey: sessionTaskKeys.lists() }),
      ]);
      await options?.onSuccess?.(task, variables, context);
      return task;
    },
    ...options,
  });
};

export type { TaskApiError };
export type { SessionTaskListQueryInput };
