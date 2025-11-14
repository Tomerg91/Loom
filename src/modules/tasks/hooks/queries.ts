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
    queryFn: () => fetchClientTaskList(filters),
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
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot previous value
      const previousTasks = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      // Optimistically update to show new task
      queryClient.setQueriesData<TaskListResponse>(
        { queryKey: taskKeys.lists() },
        (old) => {
          if (!old) return old;

          // Create optimistic task
          const optimisticTask: TaskDto = {
            id: `temp-${Date.now()}`,
            coachId: newTask.coachId || '',
            clientId: newTask.clientId,
            sessionId: newTask.sessionId,
            client: null,
            category: null,
            title: newTask.title,
            description: newTask.description,
            priority: newTask.priority || 'MEDIUM',
            status: 'PENDING',
            visibilityToCoach: newTask.visibilityToCoach ?? true,
            dueDate: newTask.dueDate,
            recurrenceRule: newTask.recurrenceRule,
            archivedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            instances: [],
          };

          return {
            ...old,
            data: [optimisticTask, ...old.data],
            pagination: {
              ...old.pagination,
              total: old.pagination.total + 1,
            },
          };
        }
      );

      return { previousTasks };
    },
    onError: (_error, _newTask, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: async result => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: taskKeys.clientLists() });
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
    onMutate: async ({ taskId, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId) });
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot previous values
      const previousTask = queryClient.getQueryData(taskKeys.detail(taskId));
      const previousLists = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      // Optimistically update detail view
      queryClient.setQueryData<TaskDto>(taskKeys.detail(taskId), (old) => {
        if (!old) return old;
        return {
          ...old,
          ...input,
          updatedAt: new Date().toISOString(),
        };
      });

      // Optimistically update in lists
      queryClient.setQueriesData<TaskListResponse>(
        { queryKey: taskKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((task) =>
              task.id === taskId
                ? { ...task, ...input, updatedAt: new Date().toISOString() }
                : task
            ),
          };
        }
      );

      return { previousTask, previousLists };
    },
    onError: (_error, variables, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(variables.taskId), context.previousTask);
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: async (task, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: taskKeys.detail(variables.taskId),
        }),
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: taskKeys.clientLists() }),
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
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(variables.taskId) });
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      await queryClient.cancelQueries({ queryKey: taskKeys.clientLists() });

      // Snapshot previous values
      const previousTask = queryClient.getQueryData(taskKeys.detail(variables.taskId));
      const previousLists = queryClient.getQueriesData({ queryKey: taskKeys.lists() });
      const previousClientLists = queryClient.getQueriesData({ queryKey: taskKeys.clientLists() });

      // Optimistically update task detail
      queryClient.setQueryData<TaskDto>(taskKeys.detail(variables.taskId), (old) => {
        if (!old) return old;

        const updatedInstances = old.instances.map((instance) => {
          if (instance.id === variables.instanceId) {
            return {
              ...instance,
              completionPercentage: variables.input.percentage,
              status: variables.input.percentage === 100 ? ('COMPLETED' as const) : instance.status,
              completedAt: variables.input.percentage === 100 ? new Date().toISOString() : instance.completedAt,
              updatedAt: new Date().toISOString(),
            };
          }
          return instance;
        });

        return {
          ...old,
          instances: updatedInstances,
          updatedAt: new Date().toISOString(),
        };
      });

      // Optimistically update in lists
      const updateTaskInList = (task: TaskDto) => {
        if (task.id !== variables.taskId) return task;

        const updatedInstances = task.instances.map((instance) => {
          if (instance.id === variables.instanceId) {
            return {
              ...instance,
              completionPercentage: variables.input.percentage,
              status: variables.input.percentage === 100 ? ('COMPLETED' as const) : instance.status,
              completedAt: variables.input.percentage === 100 ? new Date().toISOString() : instance.completedAt,
              updatedAt: new Date().toISOString(),
            };
          }
          return instance;
        });

        return {
          ...task,
          instances: updatedInstances,
          updatedAt: new Date().toISOString(),
        };
      };

      queryClient.setQueriesData<TaskListResponse>(
        { queryKey: taskKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map(updateTaskInList),
          };
        }
      );

      queryClient.setQueriesData<TaskListResponse>(
        { queryKey: taskKeys.clientLists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map(updateTaskInList),
          };
        }
      );

      return { previousTask, previousLists, previousClientLists };
    },
    onError: (_error, variables, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(variables.taskId), context.previousTask);
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousClientLists) {
        context.previousClientLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
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
