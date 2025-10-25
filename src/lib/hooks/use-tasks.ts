/**
 * @fileoverview Task query hooks using TanStack Query for fetching task data.
 * Provides hooks for coaches and clients to query tasks, templates, and instances.
 */
import { useQuery, UseQueryResult } from '@tanstack/react-query';

import type {
  TaskDto,
  TaskListResponse,
  TaskListQueryInput,
} from '@/modules/tasks/types';

interface TaskInstance {
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
  task?: TaskDto;
}

interface AssignedTasksResponse {
  instances: TaskInstance[];
  byStatus: {
    pending: TaskInstance[];
    in_progress: TaskInstance[];
    completed: TaskInstance[];
  };
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    completionRate: number;
  };
}

interface TaskCategory {
  id: string;
  coachId: string;
  label: string;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
}

// Query keys factory for consistent cache management
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Partial<TaskListQueryInput>) =>
    [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  templates: (coachId: string) =>
    [...taskKeys.all, 'templates', coachId] as const,
  assigned: (clientId: string, status?: string) =>
    ['tasks', 'assigned', clientId, status] as const,
  instance: (instanceId: string) =>
    ['tasks', 'instance', instanceId] as const,
  categories: (coachId: string) => ['tasks', 'categories', coachId] as const,
};

/**
 * Query tasks for a coach with optional filters.
 * Stale time: 30s for coach views (less real-time required).
 */
export function useCoachTasks(
  coachId: string,
  filters?: Partial<TaskListQueryInput>
): UseQueryResult<TaskListResponse> {
  return useQuery({
    queryKey: taskKeys.list({ coachId, ...filters }),
    queryFn: async () => {
      const params = new URLSearchParams();

      // Add filters to query params
      if (filters?.clientId) params.append('clientId', filters.clientId);
      if (filters?.categoryId) params.append('categoryId', filters.categoryId);
      if (filters?.status) {
        filters.status.forEach((s) => params.append('status', s));
      }
      if (filters?.priority) {
        filters.priority.forEach((p) => params.append('priority', p));
      }
      if (filters?.includeArchived !== undefined) {
        params.append('includeArchived', String(filters.includeArchived));
      }
      if (filters?.search) params.append('search', filters.search);
      if (filters?.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
      if (filters?.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
      if (filters?.sort) params.append('sort', filters.sort);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.pageSize) params.append('pageSize', String(filters.pageSize));

      const response = await fetch(`/api/tasks?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch tasks');
      }

      const data = await response.json();
      return data.data as TaskListResponse;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    enabled: !!coachId,
  });
}

/**
 * Query task templates for a coach (tasks without assigned instances).
 * Useful for displaying reusable task templates.
 */
export function useTaskTemplates(
  coachId: string
): UseQueryResult<TaskDto[]> {
  return useQuery({
    queryKey: taskKeys.templates(coachId),
    queryFn: async () => {
      const params = new URLSearchParams({
        coachId,
        // Templates could be identified by specific filters
        // For now, we fetch all tasks and client can filter
      });

      const response = await fetch(`/api/tasks?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch task templates');
      }

      const data = await response.json();
      return data.data.data as TaskDto[];
    },
    staleTime: 60 * 1000, // 1 minute (templates change less frequently)
    refetchOnWindowFocus: true,
    enabled: !!coachId,
  });
}

/**
 * Get a single task by ID.
 */
export function useTaskById(taskId: string): UseQueryResult<TaskDto> {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch task');
      }

      const data = await response.json();
      return data.data as TaskDto;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!taskId,
  });
}

/**
 * Query assigned tasks for a client with optional status filter.
 * Stale time: 15s (more real-time for client views).
 */
export function useClientAssignedTasks(
  clientId: string,
  status?: 'pending' | 'in_progress' | 'completed'
): UseQueryResult<AssignedTasksResponse> {
  return useQuery({
    queryKey: taskKeys.assigned(clientId, status),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);

      const response = await fetch(`/api/tasks/assigned?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch assigned tasks');
      }

      const data = await response.json();
      return data.data as AssignedTasksResponse;
    },
    staleTime: 15 * 1000, // 15 seconds (more real-time for clients)
    refetchOnWindowFocus: true,
    enabled: !!clientId,
  });
}

/**
 * Get a single task instance with progress details.
 */
export function useTaskInstance(
  instanceId: string
): UseQueryResult<TaskInstance> {
  return useQuery({
    queryKey: taskKeys.instance(instanceId),
    queryFn: async () => {
      const response = await fetch(`/api/tasks/assigned/${instanceId}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch task instance');
      }

      const data = await response.json();
      return data.data as TaskInstance;
    },
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!instanceId,
  });
}

/**
 * Query task categories for a coach.
 */
export function useTaskCategories(
  coachId: string
): UseQueryResult<TaskCategory[]> {
  return useQuery({
    queryKey: taskKeys.categories(coachId),
    queryFn: async () => {
      const response = await fetch(`/api/task-categories?coachId=${coachId}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch task categories');
      }

      const data = await response.json();
      return data.data as TaskCategory[];
    },
    staleTime: 60 * 1000, // 1 minute (categories change infrequently)
    refetchOnWindowFocus: true,
    enabled: !!coachId,
  });
}
