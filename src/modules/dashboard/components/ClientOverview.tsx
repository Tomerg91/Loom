/**
 * @fileoverview Client component rendering the client dashboard overview.
 * Coordinates summary metrics, widget composition, and React Query state.
 */

'use client';

import {
  CalendarDays,
  ClipboardList,
  RefreshCcw,
  Target,
  Trophy,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, type ComponentType } from 'react';

import { ErrorBoundary } from '@/components/error-boundary';
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
import { useClientOverview } from '@/modules/dashboard/api/useClientOverview';
import { DashboardErrorFallback } from '@/modules/dashboard/components/errors/DashboardErrorFallback';
import { ClientDashboardSkeleton } from '@/modules/dashboard/components/skeletons/DashboardSkeleton';
import { GoalsProgress } from '@/modules/dashboard/components/widgets/GoalsProgress';
import { MyTasks } from '@/modules/dashboard/components/widgets/MyTasks';
import { UpcomingSessions } from '@/modules/dashboard/components/widgets/UpcomingSessions';
import type {
  ClientGoalPriority,
  ClientGoalStatus,
} from '@/modules/dashboard/types';
import type { TaskPriority, TaskStatus } from '@/modules/tasks/types/task';
import type { SessionStatus } from '@/types';

interface ClientOverviewProps {
  /** Active locale used for formatting copy and dates. */
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

export function ClientOverview({ locale }: ClientOverviewProps) {
  const t = useTranslations('dashboard.client');
  const { data, error, isLoading, isError, refetch, isRefetching } =
    useClientOverview();

  const summaryCards: SummaryCardConfig[] = useMemo(() => {
    const summary = data?.summary;

    return [
      {
        id: 'sessions',
        label: t('summary.sessions.label'),
        description: t('summary.sessions.description'),
        icon: CalendarDays,
        value: summary?.upcomingSessions ?? 0,
        accent: 'text-sky-600 bg-sky-100',
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
        id: 'goalsInProgress',
        label: t('summary.goalsInProgress.label'),
        description: t('summary.goalsInProgress.description'),
        icon: Target,
        value: summary?.goalsInProgress ?? 0,
        accent: 'text-emerald-600 bg-emerald-100',
      },
      {
        id: 'completedGoals',
        label: t('summary.completedGoals.label'),
        description: t('summary.completedGoals.description'),
        icon: Trophy,
        value: summary?.completedGoals ?? 0,
        accent: 'text-amber-600 bg-amber-100',
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

  const goalStatusLabels = useMemo<Record<ClientGoalStatus, string>>(
    () => ({
      active: t('goals.status.active'),
      completed: t('goals.status.completed'),
      paused: t('goals.status.paused'),
      cancelled: t('goals.status.cancelled'),
    }),
    [t]
  );

  const goalPriorityLabels = useMemo<Record<ClientGoalPriority, string>>(
    () => ({
      high: t('goals.priority.high'),
      medium: t('goals.priority.medium'),
      low: t('goals.priority.low'),
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

  // Show comprehensive skeleton during initial load
  if (isLoading) {
    return <ClientDashboardSkeleton />;
  }

  // Show error state if data fetching failed
  if (isError && error) {
    return (
      <DashboardErrorFallback
        error={error instanceof Error ? error : new Error('Failed to load dashboard')}
        resetError={() => refetch()}
        locale={locale}
        dashboardType="client"
      />
    );
  }

  return (
    <ErrorBoundary
      fallback={({ error: boundaryError, resetError }) => (
        <DashboardErrorFallback
          error={boundaryError}
          resetError={resetError}
          locale={locale}
          dashboardType="client"
        />
      )}
    >
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
              <RefreshCcw
                className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
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
                  <span className="text-3xl font-semibold text-sand-900">
                    {formatNumber(card.value, locale)}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>{t('sections.upcomingSessions.title')}</CardTitle>
              <CardDescription>
                {t('sections.upcomingSessions.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UpcomingSessions
                locale={locale}
                sessions={data?.upcomingSessions ?? []}
                statusLabels={sessionStatusLabels}
                isLoading={false}
                emptyMessage={t('sections.upcomingSessions.empty')}
                joinLabel={t('sections.upcomingSessions.join')}
                withLabel={t('sections.upcomingSessions.with')}
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
              <MyTasks
                locale={locale}
                tasks={data?.tasks ?? []}
                statusLabels={taskStatusLabels}
                priorityLabels={taskPriorityLabels}
                isLoading={false}
                emptyMessage={t('sections.tasks.empty')}
                dueLabel={t('sections.tasks.due')}
                assignedLabel={t('sections.tasks.assignedBy')}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('sections.goals.title')}</CardTitle>
            <CardDescription>{t('sections.goals.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <GoalsProgress
              goals={data?.goals ?? []}
              isLoading={false}
              emptyMessage={t('sections.goals.empty')}
              statusLabels={goalStatusLabels}
              priorityLabels={goalPriorityLabels}
              locale={locale}
              targetLabel={t('sections.goals.target')}
            />
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
