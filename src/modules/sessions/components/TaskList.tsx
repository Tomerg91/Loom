/**
 * @fileoverview Read-only task list tailored for session planning views. The
 * component handles loading, error, and empty states while exposing a callback
 * so parent dashboards can open detail or edit panels for a selected task.
 */
'use client';

import { RefreshCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useSessionTaskList,
  type SessionTaskListFilters,
} from '@/modules/sessions/api/tasks';
import type { SessionTask } from '@/modules/sessions/types';

interface TaskListProps {
  /** Active locale used for date and status formatting. */
  locale: string;
  /** Filters applied when fetching tasks for the view. */
  filters?: SessionTaskListFilters;
  /** Callback invoked when a user selects a task row. */
  onSelectTask?: (task: SessionTask) => void;
}

function formatDate(value: string | null | undefined, locale: string): string {
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

export function TaskList({
  locale,
  filters = {},
  onSelectTask,
}: TaskListProps) {
  const t = useTranslations('sessions.tasks.list');
  const { data, error, isError, isLoading, refetch, isRefetching } =
    useSessionTaskList(filters);

  const renderSkeleton = () => (
    <div className="space-y-2" role="status" aria-live="polite">
      {[...Array(4).keys()].map(index => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="py-10 text-center text-sm text-neutral-600">
      {t('empty')}
    </div>
  );

  const renderError = () => (
    <Alert variant="destructive">
      <AlertTitle>{t('error.title')}</AlertTitle>
      <AlertDescription>
        {error instanceof Error ? error.message : t('error.description')}
      </AlertDescription>
    </Alert>
  );

  const renderTable = (tasks: SessionTask[]) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          {t('count', { count: tasks.length })}
          {isRefetching ? (
            <span className="text-xs text-neutral-500">{t('refreshing')}</span>
          ) : null}
        </div>
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => refetch()}
          className="flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          {t('actions.refresh')}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.title')}</TableHead>
            <TableHead>{t('columns.client')}</TableHead>
            <TableHead>{t('columns.dueDate')}</TableHead>
            <TableHead>{t('columns.status')}</TableHead>
            <TableHead>{t('columns.priority')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => (
            <TableRow
              key={task.id}
              onClick={() => onSelectTask?.(task)}
              className={onSelectTask ? 'cursor-pointer' : undefined}
            >
              <TableCell className="font-medium text-neutral-900">
                {task.title}
              </TableCell>
              <TableCell>
                {task.client
                  ? `${task.client.firstName} ${task.client.lastName}`
                  : t('unknownClient')}
              </TableCell>
              <TableCell>{formatDate(task.dueDate ?? null, locale)}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {t(
                    `status.${task.status.toLowerCase() as 'pending' | 'in_progress' | 'completed' | 'overdue'}`
                  )}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {t(
                    `priority.${task.priority.toLowerCase() as 'low' | 'medium' | 'high'}`
                  )}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? renderSkeleton() : null}
        {isError ? renderError() : null}
        {!isLoading && !isError && data?.data?.length === 0
          ? renderEmptyState()
          : null}
        {!isLoading && !isError && data?.data?.length
          ? renderTable(data.data)
          : null}
      </CardContent>
    </Card>
  );
}
