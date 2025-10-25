/**
 * @fileoverview Zustand store for managing task filter state.
 * Provides global filter state for task lists with persistence to localStorage.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { TaskStatus, TaskPriority } from '@/modules/tasks/types';

interface TaskFilterState {
  // Filter values
  statusFilter: TaskStatus | 'all';
  priorityFilter: TaskPriority | 'all';
  categoryFilter: string | 'all';
  searchQuery: string;
  sortBy: 'dueDate' | 'createdAt' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';
  includeArchived: boolean;

  // Date range filters
  dueDateFrom: string | null;
  dueDateTo: string | null;

  // Actions
  setStatusFilter: (status: TaskStatus | 'all') => void;
  setPriorityFilter: (priority: TaskPriority | 'all') => void;
  setCategoryFilter: (categoryId: string | 'all') => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (field: 'dueDate' | 'createdAt' | 'priority' | 'status') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  toggleSortOrder: () => void;
  setIncludeArchived: (include: boolean) => void;
  setDateRange: (from: string | null, to: string | null) => void;
  reset: () => void;
}

// Default values
const defaultState = {
  statusFilter: 'all' as const,
  priorityFilter: 'all' as const,
  categoryFilter: 'all' as const,
  searchQuery: '',
  sortBy: 'dueDate' as const,
  sortOrder: 'asc' as const,
  includeArchived: false,
  dueDateFrom: null,
  dueDateTo: null,
};

/**
 * Task filter store with persistence.
 * Filters are persisted to localStorage for better UX.
 */
export const useTaskFilterStore = create<TaskFilterState>()(
  persist(
    (set) => ({
      // Initial state
      ...defaultState,

      // Actions
      setStatusFilter: (status) =>
        set({ statusFilter: status }),

      setPriorityFilter: (priority) =>
        set({ priorityFilter: priority }),

      setCategoryFilter: (categoryId) =>
        set({ categoryFilter: categoryId }),

      setSearchQuery: (query) =>
        set({ searchQuery: query }),

      setSortBy: (field) =>
        set({ sortBy: field }),

      setSortOrder: (order) =>
        set({ sortOrder: order }),

      toggleSortOrder: () =>
        set((state) => ({
          sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc',
        })),

      setIncludeArchived: (include) =>
        set({ includeArchived: include }),

      setDateRange: (from, to) =>
        set({ dueDateFrom: from, dueDateTo: to }),

      reset: () =>
        set(defaultState),
    }),
    {
      name: 'task-filter-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist filter preferences, not search query
      partialize: (state) => ({
        statusFilter: state.statusFilter,
        priorityFilter: state.priorityFilter,
        categoryFilter: state.categoryFilter,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        includeArchived: state.includeArchived,
      }),
    }
  )
);

/**
 * Selector hooks for better performance.
 * Only components using specific filters will re-render on change.
 */
export const useStatusFilter = () =>
  useTaskFilterStore((state) => state.statusFilter);

export const usePriorityFilter = () =>
  useTaskFilterStore((state) => state.priorityFilter);

export const useCategoryFilter = () =>
  useTaskFilterStore((state) => state.categoryFilter);

export const useSearchQuery = () =>
  useTaskFilterStore((state) => state.searchQuery);

export const useSortBy = () =>
  useTaskFilterStore((state) => state.sortBy);

export const useSortOrder = () =>
  useTaskFilterStore((state) => state.sortOrder);

export const useIncludeArchived = () =>
  useTaskFilterStore((state) => state.includeArchived);

export const useDateRange = () =>
  useTaskFilterStore((state) => ({
    from: state.dueDateFrom,
    to: state.dueDateTo,
  }));

/**
 * Selector for all active filters.
 * Useful for displaying "clear all filters" UI.
 */
export const useHasActiveFilters = () =>
  useTaskFilterStore(
    (state) =>
      state.statusFilter !== 'all' ||
      state.priorityFilter !== 'all' ||
      state.categoryFilter !== 'all' ||
      state.searchQuery !== '' ||
      state.includeArchived !== false ||
      state.dueDateFrom !== null ||
      state.dueDateTo !== null
  );

/**
 * Get filter count for badge display.
 */
export const useActiveFilterCount = () =>
  useTaskFilterStore((state) => {
    let count = 0;
    if (state.statusFilter !== 'all') count++;
    if (state.priorityFilter !== 'all') count++;
    if (state.categoryFilter !== 'all') count++;
    if (state.searchQuery !== '') count++;
    if (state.includeArchived) count++;
    if (state.dueDateFrom || state.dueDateTo) count++;
    return count;
  });
