/**
 * @fileoverview Client component rendering the coach dashboard overview. The
 * component orchestrates React Query data, summary metrics, and widget
 * composition.
 */

'use client';

import {
  AlertCircle,
  CalendarCheck,
  ClipboardList,
  RefreshCcw,
  Users2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, type ComponentType } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCoachOverview } from '@/modules/dashboard/api/useCoachOverview';
import { ClientProgressOverview } from '@/modules/dashboard/components/widgets/ClientProgress';
import { SessionsList } from '@/modules/dashboard/components/widgets/SessionsList';
import { TasksSummary } from '@/modules/dashboard/components/widgets/TasksSummary';
import type { TaskPriority, TaskStatus } from '@/modules/tasks/types/task';
import type { SessionStatus } from '@/types';

interface CoachOverviewProps {
  /** Active locale used for formatting dates and copy. */
  locale: string;
}

interface SummaryCardConfig {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  value: number;
  accent: string;
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

function formatTimestamp(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function CoachOverview({ locale }: CoachOverviewProps) {
  const t = useTranslations('dashboard.coach');
  const { data, error, isLoading, isError, refetch, isRefetching } =
    useCoachOverview();

  const summaryCards: SummaryCardConfig[] = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        id: 'clients',
        label: t('summary.clients.label'),
        description: t('summary.clients.description'),
        icon: Users2,
        value: summary?.totalClients ?? 0,
        accent: 'text-teal-600 bg-teal-100',
      },
      {
        id: 'tasks',
        label: t('summary.tasks.label'),
        description: t('summary.tasks.description'),
        icon: ClipboardList,
        value: summary?.activeTasks ?? 0,
        accent: 'text-terracotta-600 bg-terracotta-100',
      },
      {
        id: 'overdue',
        label: t('summary.overdue.label'),
        description: t('summary.overdue.description'),
        icon: AlertCircle,
        value: summary?.overdueTasks ?? 0,
        accent: 'text-amber-600 bg-amber-100',
      },
      {
        id: 'sessions',
        label: t('summary.sessions.label'),
        description: t('summary.sessions.description'),
        icon: CalendarCheck,
        value: summary?.upcomingSessions ?? 0,
        accent: 'text-sky-600 bg-sky-100',
      },
    ];
  }, [data?.summary, t]);

  const sessionStatusLabels = useMemo<Record<SessionStatus, string>>(
    () => ({
      scheduled: t('statuses.scheduled'),
      in_progress: t('statuses.in_progress'),
      completed: t('statuses.completed'),
      cancelled: t('statuses.cancelled'),
      no_show: t('statuses.no_show'),
    }),
    [t]
  );

  const taskStatusLabels = useMemo<Record<TaskStatus, string>>(
    () => ({
      PENDING: t('tasks.status.pending'),
      IN_PROGRESS: t('tasks.status.in_progress'),
      COMPLETED: t('tasks.status.completed'),
      OVERDUE: t('tasks.status.overdue'),
    }),
    [t]
  );

  const taskPriorityLabels = useMemo<Record<TaskPriority, string>>(
    () => ({
      HIGH: t('tasks.priority.high'),
      MEDIUM: t('tasks.priority.medium'),
      LOW: t('tasks.priority.low'),
    }),
    [t]
  );

  const generatedAtLabel = useMemo(() => {
    if (!data?.generatedAt) {
      return null;
    }

    try {
      return t('lastUpdated', {
        timestamp: formatTimestamp(data.generatedAt, locale),
      });
    } catch (_error) {
      return null;
    }
  }, [data?.generatedAt, locale, t]);

  const completionLabel = (value: number | null) =>
    value === null
      ? t('sections.clientProgress.noTasks')
      : t('sections.clientProgress.completion', { value });

  const activeTasksLabel = (count: number) =>
    t('sections.clientProgress.activeTasks', { count });

  const lastSessionLabel = (value: string | null) => {
    if (!value) {
      return t('sections.clientProgress.noSession');
    }

    try {
      return t('sections.clientProgress.lastSession', {
        timestamp: formatTimestamp(value, locale),
      });
    } catch (_error) {
      return t('sections.clientProgress.noSession');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-sand-900">
            {t('title')}
          </h1>
          <p className="text-muted-foreground max-w-2xl">{t('subtitle')}</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          {generatedAtLabel ? (
            <Badge variant="outline" className="whitespace-nowrap">
              {generatedAtLabel}
            </Badge>
          ) : null}
          <Button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="secondary"
            className="inline-flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            {isRefetching ? t('actions.refreshing') : t('actions.refresh')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className="overflow-hidden border border-sand-200"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-sand-900">
                    {card.label}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {card.description}
                  </CardDescription>
                </div>
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${card.accent}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <span
                    className="block h-10 w-20 animate-pulse rounded-lg bg-sand-200"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="text-3xl font-semibold text-sand-900">
                    {formatNumber(card.value, locale)}
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errors.title')}</AlertTitle>
          <AlertDescription>
            {t('errors.description')}
            {error instanceof Error ? ` — ${error.message}` : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t('sections.upcomingSessions.title')}</CardTitle>
            <CardDescription>
              {t('sections.upcomingSessions.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionsList
              locale={locale}
              sessions={data?.upcomingSessions ?? []}
              statusLabels={sessionStatusLabels}
              isLoading={isLoading}
              emptyMessage={t('sections.upcomingSessions.empty')}
              joinLabel={t('sections.upcomingSessions.join')}
              durationLabel={t('sections.upcomingSessions.duration')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('sections.tasks.title')}</CardTitle>
            <CardDescription>{t('sections.tasks.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <TasksSummary
              locale={locale}
              tasks={data?.taskHighlights ?? []}
              statusLabels={taskStatusLabels}
              priorityLabels={taskPriorityLabels}
              isLoading={isLoading}
              emptyMessage={t('sections.tasks.empty')}
              dueLabel={t('sections.tasks.due')}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('sections.clientProgress.title')}</CardTitle>
          <CardDescription>
            {t('sections.clientProgress.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientProgressOverview
            clients={data?.clientProgress ?? []}
            isLoading={isLoading}
            emptyMessage={t('sections.clientProgress.empty')}
            completionLabel={completionLabel}
            activeTasksLabel={activeTasksLabel}
            lastSessionLabel={lastSessionLabel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
