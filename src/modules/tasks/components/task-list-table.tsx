'use client';

import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

import { TaskPriorityIndicator } from './task-priority-indicator';
import { TaskStatusBadge } from './task-status-badge';
import type { TaskDto, TaskInstanceDto } from '../types/task';

const getDisplayInstance = (task: TaskDto): TaskInstanceDto | null => {
  if (!task.instances || task.instances.length === 0) {
    return null;
  }

  const upcoming = task.instances.find(
    instance => instance.status !== 'COMPLETED'
  );

  return upcoming ?? task.instances[0];
};

const formatDescription = (description?: string | null) => {
  if (!description) {
    return null;
  }
  if (description.length <= 120) {
    return description;
  }
  return `${description.slice(0, 120)}…`;
};

const getClientDisplay = (task: TaskDto) => {
  const name = task.client
    ? [task.client.firstName, task.client.lastName]
        .filter(Boolean)
        .join(' ')
        .trim()
    : '';

  const hasClientRecord = Boolean(task.client);
  const truncatedId = `${task.clientId.slice(0, 8)}…`;
  const primary =
    name.length > 0 ? name : (task.client?.email ?? `Client ${truncatedId}`);

  const secondary =
    name.length > 0 && task.client?.email
      ? task.client.email
      : !hasClientRecord
        ? truncatedId
        : undefined;

  return {
    primary,
    secondary,
    isSecondaryMonospace: !hasClientRecord,
  };
};

export interface TaskListTableProps {
  tasks: TaskDto[];
}

export function TaskListTable({ tasks }: TaskListTableProps) {
  if (tasks.length === 0) {
    return <TaskListEmptyState />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Task</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="text-right">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => {
            const instance = getDisplayInstance(task);
            const dueDate = instance?.dueDate ?? task.dueDate;
            const completion = instance?.completionPercentage ?? 0;
            const status = instance?.status ?? 'PENDING';
            const description = formatDescription(task.description);
            const clientDisplay = getClientDisplay(task);

            return (
              <TableRow key={task.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">
                        {task.title}
                      </span>
                      {task.recurrenceRule ? (
                        <Badge variant="outline" className="text-xs">
                          Recurring
                        </Badge>
                      ) : null}
                    </div>
                    {description ? (
                      <p className="text-sm text-neutral-500">{description}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-neutral-800">
                      {clientDisplay.primary}
                    </span>
                    {clientDisplay.secondary ? (
                      <span
                        className={`text-xs text-neutral-500 ${clientDisplay.isSecondaryMonospace ? 'font-mono' : ''}`}
                      >
                        {clientDisplay.secondary}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {task.category ? (
                    <span className="inline-flex items-center gap-2 text-sm text-neutral-700">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: task.category.colorHex }}
                      />
                      {task.category.label}
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-400">
                      Uncategorized
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {dueDate ? (
                    <span className="text-sm text-neutral-700">
                      {formatDate(dueDate)}
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-400">
                      No due date
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={completion}
                      className="h-2 w-24"
                      aria-label="Task completion"
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      {Math.round(completion)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <TaskStatusBadge status={status} />
                </TableCell>
                <TableCell>
                  <TaskPriorityIndicator priority={task.priority} />
                </TableCell>
                <TableCell className="text-right text-sm text-neutral-500">
                  {formatDate(task.updatedAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function TaskListEmptyState() {
  const t = useTranslations('tasks');

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-16 text-center">
      <p className="text-lg font-semibold text-neutral-800">
        {t('empty.title')}
      </p>
      <p className="max-w-md text-sm text-neutral-500">
        {t('empty.coachDescription')}
      </p>
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
