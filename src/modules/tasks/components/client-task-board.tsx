'use client';

import {
  CalendarCheck,
  CheckCircle2,
  CircleDot,
  RefreshCcw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

import { useClientTaskList, type TaskApiError } from '../hooks';
import { TaskPriorityIndicator } from './task-priority-indicator';
import { TaskProgressDialog } from './task-progress-dialog';
import { TaskStatusBadge } from './task-status-badge';
import type { TaskDto, TaskInstanceDto } from '../types/task';

const DEFAULT_PAGE_SIZE = 50;

type TaskBucket = 'overdue' | 'active' | 'completed';

type SectionConfig = {
  id: TaskBucket;
  title: string;
  description: string;
  emptyMessage: string;
  accentClass?: string;
};

const SECTIONS: SectionConfig[] = [
  {
    id: 'overdue',
    title: 'Needs attention',
    description: 'Practices that are asking for care and presence.',
    emptyMessage: 'No overdue practices. Beautiful work staying current.',
    accentClass: 'border-red-200 bg-red-50/80',
  },
  {
    id: 'active',
    title: 'In practice',
    description: 'Assignments currently unfolding in your body awareness.',
    emptyMessage: 'No active action items at the moment.',
    accentClass: 'border-teal-200 bg-teal-50/80',
  },
  {
    id: 'completed',
    title: 'Integrated discoveries',
    description: 'Moments you have already tended to—honour the progress.',
    emptyMessage: 'You have not marked any practices as complete yet.',
    accentClass: 'border-neutral-200 bg-white',
  },
];

const getActiveInstance = (task: TaskDto): TaskInstanceDto | null => {
  if (!task.instances || task.instances.length === 0) {
    return null;
  }

  const upcoming = task.instances.find(
    instance => instance.status !== 'COMPLETED'
  );

  return upcoming ?? task.instances[task.instances.length - 1];
};

const categorizeTask = (task: TaskDto): TaskBucket => {
  const instance = getActiveInstance(task);

  if (!instance) {
    return 'active';
  }

  if (instance.status === 'OVERDUE') {
    return 'overdue';
  }

  if (instance.status === 'COMPLETED') {
    return 'completed';
  }

  return 'active';
};

const formatCompletion = (value?: number) => `${Math.round(value ?? 0)}%`;

export function ClientTaskBoard() {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useClientTaskList(
    { pageSize: DEFAULT_PAGE_SIZE, sort: 'dueDate', sortOrder: 'asc' },
    { staleTime: 30_000 }
  );

  const tasks = data?.data ?? [];

  const grouped = useMemo(() => {
    const buckets: Record<TaskBucket, TaskDto[]> = {
      overdue: [],
      active: [],
      completed: [],
    };

    tasks.forEach(task => {
      buckets[categorizeTask(task)].push(task);
    });

    return buckets;
  }, [tasks]);

  const summary = useMemo(
    () => ({
      total: tasks.length,
      overdue: grouped.overdue.length,
      active: grouped.active.length,
      completed: grouped.completed.length,
    }),
    [grouped, tasks.length]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<TaskInstanceDto | null>(
    null
  );

  const handleOpenDialog = (task: TaskDto) => {
    const instance = getActiveInstance(task);

    if (!instance) {
      return;
    }

    setSelectedTask(task);
    setSelectedInstance(instance);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);

    if (!open) {
      setSelectedTask(null);
      setSelectedInstance(null);
    }
  };

  const hasNoTasks = !isLoading && tasks.length === 0;

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-neutral-900">
            {t('myTasks')}
          </h2>
          <p className="text-sm text-neutral-600">
            {t('empty.clientDescription')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-neutral-600">
          <Badge variant="outline">Active {summary.active}</Badge>
          <Badge variant="outline">Overdue {summary.overdue}</Badge>
          <Badge variant="outline">Completed {summary.completed}</Badge>
        </div>
      </header>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errors.loadFailed')}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {(error as TaskApiError | undefined)?.message ??
                t('errors.loadFailed')}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden /> {tCommon('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <ClientTaskBoardSkeleton />
      ) : hasNoTasks ? (
        <ClientTaskEmptyState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {SECTIONS.map(section => {
            const sectionTasks = grouped[section.id];

            return (
              <Card
                key={section.id}
                className={`flex h-full flex-col ${section.accentClass ?? ''}`}
              >
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-neutral-900">
                    {section.title}
                  </CardTitle>
                  <p className="text-sm text-neutral-600">{section.description}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  {sectionTasks.length === 0 ? (
                    <p className="text-sm text-neutral-500">{section.emptyMessage}</p>
                  ) : (
                    <ul className="space-y-3">
                      {sectionTasks.map(task => (
                        <ClientTaskListItem
                          key={task.id}
                          task={task}
                          onLogProgress={handleOpenDialog}
                        />
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TaskProgressDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        task={selectedTask}
        instance={selectedInstance}
      />
    </section>
  );
}

interface ClientTaskListItemProps {
  task: TaskDto;
  onLogProgress: (task: TaskDto) => void;
}

function ClientTaskListItem({ task, onLogProgress }: ClientTaskListItemProps) {
  const instance = getActiveInstance(task);
  const dueDate = instance?.dueDate ?? task.dueDate ?? null;
  const completion = instance?.completionPercentage ?? 0;
  const status = instance?.status ?? 'PENDING';
  const canLogProgress = Boolean(instance && instance.status !== 'COMPLETED');

  return (
    <li className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-neutral-900">
            {task.title}
          </span>
          {task.recurrenceRule ? (
            <Badge variant="outline" className="text-xs">
              Recurring
            </Badge>
          ) : null}
          {instance ? <TaskStatusBadge status={status} /> : null}
        </div>
        {task.description ? (
          <p className="text-sm text-neutral-600">{task.description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        {dueDate ? (
          <span className="inline-flex items-center gap-1">
            <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
            Due {formatDate(dueDate)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <CircleDot className="h-3.5 w-3.5" aria-hidden />
            No due date
          </span>
        )}
        {task.category ? (
          <span className="inline-flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              aria-hidden
              style={{ backgroundColor: task.category.colorHex }}
            />
            {task.category.label}
          </span>
        ) : null}
        <TaskPriorityIndicator priority={task.priority} />
      </div>

      <div className="flex flex-col gap-3 border-t border-dashed border-neutral-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Progress
            value={completion}
            className="h-2 w-32"
            aria-label="Task progress"
          />
          <span className="text-sm font-medium text-neutral-700">
            {formatCompletion(completion)} complete
          </span>
        </div>
        {canLogProgress ? (
          <Button size="sm" variant="secondary" onClick={() => onLogProgress(task)}>
            Log progress
          </Button>
        ) : (
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            Completed
          </Badge>
        )}
      </div>
    </li>
  );
}

function ClientTaskBoardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-72 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function ClientTaskEmptyState() {
  const t = useTranslations('tasks');

  return (
    <div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
      <h3 className="text-lg font-semibold text-neutral-800">
        {t('empty.title')}
      </h3>
      <p className="mt-2 text-sm text-neutral-600">
        {t('empty.clientDescription')}
      </p>
    </div>
  );
}
