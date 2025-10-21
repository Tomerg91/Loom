'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { type TaskApiError, type TaskListFilters, useTaskList } from '../hooks';
import { TaskCreateDialog } from './task-create-dialog';
import { TaskListFilterState, TaskListFiltersBar } from './task-filters-bar';
import { TaskListSkeleton, TaskListTable } from './task-list-table';

const DEFAULT_PAGE_SIZE = 10;

const INITIAL_FILTERS: TaskListFilterState = {
  search: '',
  status: [],
  priority: [],
  includeArchived: false,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

const sanitizeFilters = (
  filters: TaskListFilterState,
  deferredSearch: string
): TaskListFilters => {
  const payload: TaskListFilters = {
    page: filters.page,
    pageSize: filters.pageSize,
  };

  const trimmedSearch = deferredSearch.trim();
  if (trimmedSearch.length > 0) {
    payload.search = trimmedSearch;
  }

  if (filters.status && filters.status.length > 0) {
    payload.status = filters.status;
  }

  if (filters.priority && filters.priority.length > 0) {
    payload.priority = filters.priority;
  }

  if (filters.includeArchived) {
    payload.includeArchived = true;
  }

  return payload;
};

export function TaskListView() {
  const [filters, setFilters] = useState<TaskListFilterState>(INITIAL_FILTERS);
  const deferredSearch = useDeferredValue(filters.search);

  const queryFilters = useMemo(
    () => sanitizeFilters(filters, deferredSearch),
    [filters, deferredSearch]
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useTaskList(
    queryFilters,
    {
      staleTime: 30_000,
    }
  );

  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? 0;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const currentPage = pagination?.page ?? filters.page;

  useEffect(() => {
    if (!pagination) {
      return;
    }
    const normalizedPage = Math.max(pagination.totalPages ?? 1, 1);
    setFilters(prev => {
      if (prev.page <= normalizedPage) {
        return prev;
      }
      return { ...prev, page: normalizedPage };
    });
  }, [pagination]);

  const handleFiltersChange = (next: TaskListFilterState) => {
    setFilters(next);
  };

  const handleNextPage = () => {
    setFilters(prev => ({
      ...prev,
      page: Math.min(prev.page + 1, totalPages),
    }));
  };

  const handlePreviousPage = () => {
    setFilters(prev => ({
      ...prev,
      page: Math.max(prev.page - 1, 1),
    }));
  };

  const taskCountLabel = `${totalItems} task${totalItems === 1 ? '' : 's'}`;

  const handleTaskCreated = () => {
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Action Items & Homework
          </h1>
          <p className="text-sm text-neutral-600">
            Monitor client assignments, track progress, and follow up on overdue
            work from a single dashboard.
          </p>
        </div>
        <TaskCreateDialog onCreated={handleTaskCreated} />
      </header>

      <TaskListFiltersBar
        filters={filters}
        onChange={handleFiltersChange}
        isDisabled={isFetching}
      />

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load tasks</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {(error as TaskApiError | undefined)?.message ??
                'An unexpected error occurred while loading the task list.'}
            </p>
            <Button onClick={() => refetch()} size="sm" variant="outline">
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <TaskListSkeleton />
      ) : (
        <div className="space-y-4">
          {isFetching ? (
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
              Refreshing results…
            </p>
          ) : null}
          <TaskListTable tasks={data?.data ?? []} />
          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:flex-row">
            <div className="text-sm text-neutral-600">
              Showing page {currentPage} of {totalPages} · {taskCountLabel}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage <= 1 || isFetching}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages || isFetching}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
