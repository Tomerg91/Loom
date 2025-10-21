'use client';

import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useId, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import type { TaskListFilters } from '../hooks';
import {
  TASK_PRIORITY_LABELS,
  TaskPriorityIndicator,
} from './task-priority-indicator';
import { TASK_STATUS_LABELS, TaskStatusBadge } from './task-status-badge';
import {
  taskPriorityValues,
  taskStatusValues,
  type TaskPriority,
  type TaskStatus,
} from '../types/task';

export type TaskListFilterState = Omit<
  TaskListFilters,
  'dueDateFrom' | 'dueDateTo' | 'sort' | 'sortOrder'
> & {
  search: string;
  status: TaskStatus[];
  priority: TaskPriority[];
  includeArchived: boolean;
  page: number;
  pageSize: number;
};

export interface TaskListFiltersBarProps {
  filters: TaskListFilterState;
  onChange: (filters: TaskListFilterState) => void;
  isDisabled?: boolean;
}

const toggleValue = <T,>(values: T[], value: T): T[] => {
  return values.includes(value)
    ? values.filter(item => item !== value)
    : [...values, value];
};

const hasActiveFilters = (filters: TaskListFilterState) => {
  return (
    filters.search.trim().length > 0 ||
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    Boolean(filters.includeArchived)
  );
};

export function TaskListFiltersBar({
  filters,
  onChange,
  isDisabled = false,
}: TaskListFiltersBarProps) {
  const includeArchivedId = useId();

  const statusSummary = useMemo(() => {
    const selected = filters.status ?? [];
    if (selected.length === 0) {
      return 'All statuses';
    }
    if (selected.length === 1) {
      return TASK_STATUS_LABELS[selected[0]];
    }
    return `${selected.length} statuses`;
  }, [filters.status]);

  const prioritySummary = useMemo(() => {
    const selected = filters.priority ?? [];
    if (selected.length === 0) {
      return 'All priorities';
    }
    if (selected.length === 1) {
      return TASK_PRIORITY_LABELS[selected[0]];
    }
    return `${selected.length} priorities`;
  }, [filters.priority]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, search: event.target.value, page: 1 });
    },
    [filters, onChange]
  );

  const handleStatusToggle = useCallback(
    (status: TaskListFilterState['status'][number]) => {
      onChange({
        ...filters,
        status: toggleValue(filters.status, status),
        page: 1,
      });
    },
    [filters, onChange]
  );

  const handlePriorityToggle = useCallback(
    (priority: TaskListFilterState['priority'][number]) => {
      onChange({
        ...filters,
        priority: toggleValue(filters.priority, priority),
        page: 1,
      });
    },
    [filters, onChange]
  );

  const handleIncludeArchivedToggle = useCallback(
    (checked: boolean) => {
      onChange({ ...filters, includeArchived: checked, page: 1 });
    },
    [filters, onChange]
  );

  const handleReset = useCallback(() => {
    onChange({
      ...filters,
      search: '',
      status: [],
      priority: [],
      includeArchived: false,
      page: 1,
    });
  }, [filters, onChange]);

  const activeFilters = hasActiveFilters(filters);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2 text-neutral-500">
          <Filter className="h-4 w-4" aria-hidden />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <Input
          placeholder="Search tasks"
          value={filters.search}
          onChange={handleSearchChange}
          className="w-full max-w-xs"
          disabled={isDisabled}
          aria-label="Search tasks"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="min-w-[150px] justify-between"
              disabled={isDisabled}
            >
              <span className="text-sm font-medium text-neutral-700">
                {statusSummary}
              </span>
              <SlidersHorizontal className="h-4 w-4 text-neutral-400" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[220px]" align="start">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
              {taskStatusValues.map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.status.includes(status)}
                  onCheckedChange={() => handleStatusToggle(status)}
                  className="flex items-center gap-2"
                >
                  <TaskStatusBadge status={status} />
                </DropdownMenuCheckboxItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={event => {
                event.preventDefault();
                onChange({ ...filters, status: [], page: 1 });
              }}
            >
              Clear selection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="min-w-[150px] justify-between"
              disabled={isDisabled}
            >
              <span className="text-sm font-medium text-neutral-700">
                {prioritySummary}
              </span>
              <SlidersHorizontal className="h-4 w-4 text-neutral-400" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[220px]" align="start">
            <DropdownMenuLabel>Priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
              {taskPriorityValues.map(priority => (
                <DropdownMenuCheckboxItem
                  key={priority}
                  checked={filters.priority.includes(priority)}
                  onCheckedChange={() => handlePriorityToggle(priority)}
                  className="flex items-center gap-2"
                >
                  <TaskPriorityIndicator priority={priority} />
                </DropdownMenuCheckboxItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={event => {
                event.preventDefault();
                onChange({ ...filters, priority: [], page: 1 });
              }}
            >
              Clear selection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2">
          <Switch
            id={includeArchivedId}
            checked={filters.includeArchived}
            onCheckedChange={handleIncludeArchivedToggle}
            disabled={isDisabled}
          />
          <Label htmlFor={includeArchivedId} className="text-sm text-neutral-700">
            Include archived
          </Label>
        </div>
      </div>
      {activeFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isDisabled}
          className="self-start md:self-auto"
        >
          <X className="mr-1 h-4 w-4" aria-hidden />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
