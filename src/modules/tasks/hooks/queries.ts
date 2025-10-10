'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

import {
  createProgressUpdate,
  createTask,
  fetchClientTaskList,
  fetchTask,
  fetchTaskList,
  updateTask,
  type TaskApiError,
  type TaskListFilters,
} from '../api';
import type {
  CreateProgressUpdateInput,
  ProgressUpdateDto,
} from '../types/progress';
import type {
  CreateTaskInput,
  TaskDto,
  TaskListResponse,
  UpdateTaskInput,
} from '../types/task';

type TaskDetailQueryOptions = Omit<
  UseQueryOptions<TaskDto, TaskApiError>,
  'queryKey' | 'queryFn'
>;

type TaskListQueryOptions = Omit<
  UseQueryOptions<TaskListResponse, TaskApiError>,
  'queryKey' | 'queryFn'
>;

type TaskMutationOptions<TResult, TVariables> = UseMutationOptions<
  TResult,
  TaskApiError,
  TVariables
>;

type ProgressUpdateVariables = {
  taskId: string;
  instanceId: string;
  input: CreateProgressUpdateInput;
};

type NormalizedTaskListFilters = TaskListFilters & {
  status?: TaskListFilters['status'];
  priority?: TaskListFilters['priority'];
  dueDateFrom?: string | Date;
  dueDateTo?: string | Date;
};

const normalizeFilters = (
  filters: TaskListFilters = {}
): NormalizedTaskListFilters => {
  const normalized: NormalizedTaskListFilters = { ...filters };

  if (normalized.status) {
    normalized.status = [...normalized.status].sort();
  }

  if (normalized.priority) {
    normalized.priority = [...normalized.priority].sort();
  }

  if (normalized.dueDateFrom instanceof Date) {
    normalized.dueDateFrom = normalized.dueDateFrom.toISOString();
  }

  if (normalized.dueDateTo instanceof Date) {
    normalized.dueDateTo = normalized.dueDateTo.toISOString();
  }

  return normalized;
};

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: NormalizedTaskListFilters) =>
    [...taskKeys.lists(), { filters }] as const,
  client: () => [...taskKeys.all, 'client'] as const,
  clientLists: () => [...taskKeys.client(), 'list'] as const,
  clientList: (filters: NormalizedTaskListFilters) =>
    [...taskKeys.clientLists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (taskId: string) => [...taskKeys.details(), taskId] as const,
  instances: (taskId: string) =>
    [...taskKeys.detail(taskId), 'instances'] as const,
  progress: (taskId: string, instanceId: string) =>
    [...taskKeys.instances(taskId), instanceId, 'progress'] as const,
};

export const useTaskList = (
  filters: TaskListFilters = {},
  options?: TaskListQueryOptions
) => {
  const normalized = normalizeFilters(filters);

  return useQuery({
    queryKey: taskKeys.list(normalized),
    queryFn: () => fetchTaskList(filters),
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useClientTaskList = (
  filters: TaskListFilters = {},
  options?: TaskListQueryOptions
) => {
  const normalized = normalizeFilters(filters);

  return useQuery({
    queryKey: taskKeys.clientList(normalized),
    queryFn: () => {
      if (typeof fetchClientTaskList !== 'function') {
        throw new Error('fetchClientTaskList is not defined or not a function. Please ensure it is correctly exported from ../api.');
      }
      return fetchClientTaskList(filters);
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useTask = (taskId: string, options?: TaskDetailQueryOptions) => {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => fetchTask(taskId),
    enabled: Boolean(taskId),
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateTask = (
  options?: TaskMutationOptions<TaskDto, CreateTaskInput>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: async result => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      return result;
    },
    ...options,
  });
};

export const useUpdateTask = (
  options?: TaskMutationOptions<
    TaskDto,
    { taskId: string; input: UpdateTaskInput }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, input }) => updateTask(taskId, input),
    onSuccess: async (task, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: taskKeys.detail(variables.taskId),
        }),
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
      ]);
      return task;
    },
    ...options,
  });
};

export const useCreateProgressUpdate = (
  options?: TaskMutationOptions<ProgressUpdateDto, ProgressUpdateVariables>
) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options ?? {};

  return useMutation({
    mutationFn: createProgressUpdate,
    async onSuccess(progress, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: taskKeys.detail(variables.taskId),
        }),
        queryClient.invalidateQueries({
          queryKey: taskKeys.progress(variables.taskId, variables.instanceId),
        }),
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: taskKeys.clientLists() }),
      ]);

      await onSuccess?.(progress, variables, context);
      return progress;
    },
    ...restOptions,
  });
};

export type { TaskApiError, TaskListFilters };
