/**
 * @fileoverview Renders a condensed list of tasks that require coach attention.
 */

'use client';

import { CalendarClock, ClipboardList, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { CoachOverviewTask } from '@/modules/dashboard/types';
import type { TaskPriority, TaskStatus } from '@/modules/tasks/types/task';

interface TasksSummaryProps {
  tasks: CoachOverviewTask[];
  locale: string;
  statusLabels: Record<TaskStatus, string>;
  priorityLabels: Record<TaskPriority, string>;
  isLoading: boolean;
  emptyMessage: string;
  dueLabel: string;
}

const priorityVariantMap: Record<
  TaskPriority,
  'default' | 'secondary' | 'destructive'
> = {
  HIGH: 'destructive',
  MEDIUM: 'default',
  LOW: 'secondary',
};

function formatDueDate(value: string | null, locale: string): string {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      new Date(value)
    );
  } catch (_error) {
    return value;
  }
}

export function TasksSummary({
  tasks,
  locale,
  statusLabels,
  priorityLabels,
  isLoading,
  emptyMessage,
  dueLabel,
}: TasksSummaryProps) {
  if (isLoading) {
    return (
      <ul className="space-y-3" aria-label="loading tasks">
        {Array.from({ length: 3 }).map((_, index) => (
          <li
            key={`task-skeleton-${index}`}
            className="rounded-xl border border-sand-200 bg-white/60 p-4 shadow-sm"
          >
            <span className="block h-5 w-28 animate-pulse rounded bg-sand-200" />
            <span className="mt-2 block h-4 w-40 animate-pulse rounded bg-sand-100" />
          </li>
        ))}
      </ul>
    );
  }

  if (!tasks.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {tasks.map(task => {
        const statusLabel = statusLabels[task.status] ?? task.status;
        const priorityVariant = priorityVariantMap[task.priority] ?? 'default';
        const priorityLabel = priorityLabels[task.priority] ?? task.priority;
        const dueDate = formatDueDate(task.dueDate, locale);

        return (
          <li
            key={task.id}
            className="rounded-xl border border-sand-200 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-sand-900">
                    {task.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {task.clientName}
                  </p>
                </div>
                <Badge variant="outline">{statusLabel}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  {dueLabel}: {dueDate}
                </span>
                <span className="inline-flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  <Badge variant={priorityVariant}>{priorityLabel}</Badge>
                </span>
                <span className="inline-flex items-center gap-2 text-xs tracking-wide text-muted-foreground">
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  {statusLabel}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
