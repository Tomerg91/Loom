/**
 * @fileoverview Task mutation hooks using TanStack Query for modifying task data.
 * Provides hooks for creating, updating, deleting tasks, categories, and managing progress.
 */
import {
  useMutation,
  UseMutationResult,
  useQueryClient,
} from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast-provider';
import type {
  TaskDto,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/modules/tasks/types';

import { taskKeys } from './use-tasks';

interface TaskCategory {
  id: string;
  coachId: string;
  label: string;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateCategoryInput {
  label: string;
  colorHex: string;
}

interface UpdateCategoryInput {
  label?: string;
  colorHex?: string;
}

interface AssignTasksInput {
  clientIds: string[];
  scheduledDate?: string;
  dueDate?: string;
}

interface CreateProgressInput {
  notes?: string;
  completionPercentage?: number;
  attachments?: string[];
}

interface UpdateProgressInput {
  notes?: string;
  completionPercentage?: number;
}

interface TaskInstance {
  id: string;
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Create a new task.
 */
export function useCreateTask(): UseMutationResult<
  TaskDto,
  Error,
  CreateTaskInput
> {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create task');
      }

      const data = await response.json();
      return data.data as TaskDto;
    },
    onSuccess: (data) => {
      // Invalidate task lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: taskKeys.templates(data.coachId),
      });

      success('Task created', 'Task has been created successfully');
    },
    onError: (err) => {
      error('Failed to create task', err.message);
    },
  });
}

/**
 * Update an existing task.
 */
export function useUpdateTask(): UseMutationResult<
  TaskDto,
  Error,
  { taskId: string; data: UpdateTaskInput }
> {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ taskId, data }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update task');
      }

      const responseData = await response.json();
      return responseData.data as TaskDto;
    },
    onSuccess: (data, variables) => {
      // Update cache with new data
      queryClient.setQueryData(taskKeys.detail(variables.taskId), data);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: taskKeys.templates(data.coachId),
      });

      success('Task updated', 'Task has been updated successfully');
    },
    onError: (err) => {
      error('Failed to update task', err.message);
    },
  });
}

/**
 * Delete a task.
 */
export function useDeleteTask(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete task');
      }
    },
    onSuccess: (_, taskId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });

      success('Task deleted', 'Task has been deleted successfully');
    },
    onError: (err) => {
      error('Failed to delete task', err.message);
    },
  });
}

/**
 * Assign a task to one or more clients.
 */
export function useAssignTasks(): UseMutationResult<
  TaskInstance[],
  Error,
  { taskId: string; data: AssignTasksInput }
> {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ taskId, data }) => {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to assign task');
      }

      const responseData = await response.json();
      return responseData.data as TaskInstance[];
    },
    onSuccess: (instances, variables) => {
      // Invalidate assigned tasks for each client
      instances.forEach((instance) => {
        queryClient.invalidateQueries({
          queryKey: taskKeys.assigned(instance.id, undefined),
        });
      });

      // Invalidate task detail
      queryClient.invalidateQueries({
        queryKey: taskKeys.detail(variables.taskId),
      });

      const clientCount = variables.data.clientIds.length;
      success(
        'Task assigned',
        `Task assigned to ${clientCount} client${clientCount > 1 ? 's' : ''}`
      );
    },
    onError: (err) => {
      error('Failed to assign task', err.message);
    },
  });
}

/**
 * Create a new task category.
 */
export function useCreateCategory(): UseMutationResult<
  TaskCategory,
  Error,
  CreateCategoryInput
> {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const response = await fetch('/api/task-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create category');
      }

      const data = await response.json();
      return data.data as TaskCategory;
    },
    onSuccess: (data) => {
      // Invalidate categories
      queryClient.invalidateQueries({
        queryKey: taskKeys.categories(data.coachId),
      });

      success('Category created', 'Task category has been created successfully');
    },
    onError: (err) => {
      error('Failed to create category', err.message);
    },
  });
}

/**
 * Update a task category.
 */
export function useUpdateCategory(): UseMutationResult<
  TaskCategory,
  Error,
  { categoryId: string; data: UpdateCategoryInput }
> {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ categoryId, data }) => {
      const response = await fetch(`/api/task-categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update category');
      }

      const responseData = await response.json();
      return responseData.data as TaskCategory;
    },
    onSuccess: (data) => {
      // Invalidate categories
      queryClient.invalidateQueries({
        queryKey: taskKeys.categories(data.coachId),
      });

      // Invalidate tasks that might use this category
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      success('Category updated', 'Task category has been updated successfully');
    },
    onError: (err) => {
      error('Failed to update category', err.message);
    },
  });
}

/**
 * Delete a task category.
 */
export function useDeleteCategory(): UseMutationResult<
  void,
  Error,
  { categoryId: string; coachId: string }
> {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ categoryId }) => {
      const response = await fetch(`/api/task-categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete category');
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate categories
      queryClient.invalidateQueries({
        queryKey: taskKeys.categories(variables.coachId),
      });

      // Invalidate tasks that might have used this category
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      success('Category deleted', 'Task category has been deleted successfully');
    },
    onError: (err) => {
      error('Failed to delete category', err.message);
    },
  });
}

/**
 * Create a progress update for a task instance.
 */
export function useCreateProgress(): UseMutationResult<
  unknown,
  Error,
  { instanceId: string; data: CreateProgressInput }
> {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ instanceId, data }) => {
      const response = await fetch(
        `/api/tasks/assigned/${instanceId}/progress`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create progress update');
      }

      const responseData = await response.json();
      return responseData.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate instance data
      queryClient.invalidateQueries({
        queryKey: taskKeys.instance(variables.instanceId),
      });

      // Invalidate assigned tasks
      queryClient.invalidateQueries({ queryKey: ['tasks', 'assigned'] });

      success('Progress saved', 'Your progress has been saved successfully');
    },
    onError: (err) => {
      error('Failed to save progress', err.message);
    },
  });
}

/**
 * Update a progress entry.
 */
export function useUpdateProgress(): UseMutationResult<
  unknown,
  Error,
  { instanceId: string; updateId: string; data: UpdateProgressInput }
> {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ instanceId, updateId, data }) => {
      const response = await fetch(
        `/api/tasks/assigned/${instanceId}/progress/${updateId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update progress');
      }

      const responseData = await response.json();
      return responseData.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate instance data
      queryClient.invalidateQueries({
        queryKey: taskKeys.instance(variables.instanceId),
      });

      success('Progress updated', 'Your progress has been updated successfully');
    },
    onError: (err) => {
      error('Failed to update progress', err.message);
    },
  });
}

/**
 * Mark a task instance as complete.
 */
export function useCompleteTask(): UseMutationResult<
  TaskInstance,
  Error,
  string
> {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const response = await fetch(
        `/api/tasks/assigned/${instanceId}/complete`,
        {
          method: 'PATCH',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to complete task');
      }

      const data = await response.json();
      return data.data as TaskInstance;
    },
    onMutate: async (instanceId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: taskKeys.instance(instanceId),
      });

      // Snapshot previous value
      const previousInstance = queryClient.getQueryData(
        taskKeys.instance(instanceId)
      );

      // Optimistically update
      queryClient.setQueryData(
        taskKeys.instance(instanceId),
        (old: TaskInstance | undefined) => {
          if (!old) return old;
          return {
            ...old,
            status: 'completed' as const,
            completionPercentage: 100,
            completedAt: new Date().toISOString(),
          };
        }
      );

      return { previousInstance };
    },
    onSuccess: (data, instanceId) => {
      // Update instance with server data
      queryClient.setQueryData(taskKeys.instance(instanceId), data);

      // Invalidate assigned tasks
      queryClient.invalidateQueries({ queryKey: ['tasks', 'assigned'] });

      success('Task completed', 'Congratulations on completing the task!');
    },
    onError: (err, instanceId, context) => {
      // Revert optimistic update
      if (context?.previousInstance) {
        queryClient.setQueryData(
          taskKeys.instance(instanceId),
          context.previousInstance
        );
      }

      error('Failed to complete task', err.message);
    },
  });
}
