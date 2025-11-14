/**
 * @fileoverview Client component rendering the coach dashboard overview. The
 * component orchestrates React Query data, summary metrics, and widget
 * composition with session scheduling, resource highlights, and analytics.
 */

'use client';

import {
  AlertCircle,
  CalendarCheck,
  CalendarPlus,
  ClipboardList,
  LibraryBig,
  RefreshCcw,
  Users2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useCallback, type ComponentType } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';

import { AddSessionModal } from '@/components/coach/add-session-modal';
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
import { trackEvent } from '@/lib/monitoring/analytics';
import { useCoachOverview } from '@/modules/dashboard/api/useCoachOverview';
import { ClientProgressOverview } from '@/modules/dashboard/components/widgets/ClientProgress';
import { SessionsList } from '@/modules/dashboard/components/widgets/SessionsList';
import { TasksSummary } from '@/modules/dashboard/components/widgets/TasksSummary';
import { ResourceHighlights } from '@/modules/dashboard/components/widgets/ResourceHighlights';
import type { TaskPriority, TaskStatus } from '@/modules/tasks/types/task';
import type { SessionStatus } from '@/types';
import type { LibraryAnalytics } from '@/types/resources';

interface CoachOverviewProps {
  /** Active locale used for formatting dates and copy. */
  locale: string;
  /** Coach user ID for tracking and session scheduling */
  coachId?: string;
  /** User ID for analytics tracking */
  userId?: string;
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

export function CoachOverview({ locale, coachId, userId }: CoachOverviewProps) {
  const t = useTranslations('dashboard.coach');
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, error, isLoading, isError, refetch, isRefetching } =
    useCoachOverview();

  // Session scheduling modal state
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  // Fetch resource analytics
  const {
    data: resourceAnalytics,
    isLoading: resourcesLoading,
  } = useQuery({
    queryKey: ['coach-library-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/coach/resources/analytics');
      if (!response.ok) return null;
      const result = await response.json();
      return result.data as LibraryAnalytics | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Manual refresh handler with analytics tracking
  const handleRefresh = useCallback(() => {
    trackEvent({
      action: 'refresh_dashboard',
      category: 'engagement',
      label: 'coach_overview',
      userId,
    });
    refetch();
    queryClient.invalidateQueries({ queryKey: ['coach-library-analytics'] });
  }, [refetch, queryClient, userId]);

  // Session modal handlers
  const handleOpenSessionModal = useCallback(() => {
    trackEvent({
      action: 'open_session_modal',
      category: 'engagement',
      label: 'coach_dashboard',
      userId,
    });
    setSessionModalOpen(true);
  }, [userId]);

  const handleSessionCreated = useCallback(() => {
    trackEvent({
      action: 'session_created',
      category: 'engagement',
      label: 'coach_dashboard',
      userId,
    });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'coach-overview'] });
  }, [queryClient, userId]);

  // Navigation handlers with analytics
  const handleViewAllTasks = useCallback(() => {
    trackEvent({
      action: 'view_all_tasks',
      category: 'engagement',
      label: 'coach_dashboard',
      userId,
    });
    router.push(`/${locale}/coach/tasks`);
  }, [locale, router, userId]);

  const handleViewAllSessions = useCallback(() => {
    trackEvent({
      action: 'view_all_sessions',
      category: 'engagement',
      label: 'coach_dashboard',
      userId,
    });
    router.push(`/${locale}/coach/sessions`);
  }, [locale, router, userId]);

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
            onClick={handleOpenSessionModal}
            variant="default"
            className="inline-flex items-center gap-2"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            {t('actions.scheduleSession')}
          </Button>
          <Button
            type="button"
            onClick={handleRefresh}
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

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('sections.upcomingSessions.title')}</CardTitle>
                <CardDescription>
                  {t('sections.upcomingSessions.description')}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewAllSessions}
                className="shrink-0"
              >
                {t('actions.viewAll')}
              </Button>
            </div>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('sections.tasks.title')}</CardTitle>
                <CardDescription>{t('sections.tasks.description')}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewAllTasks}
                className="shrink-0"
              >
                {t('actions.viewAll')}
              </Button>
            </div>
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

      <div className="grid gap-6 lg:grid-cols-2">
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LibraryBig className="h-5 w-5 text-teal-600" aria-hidden="true" />
              <div>
                <CardTitle>{t('sections.resources.title')}</CardTitle>
                <CardDescription>
                  {t('sections.resources.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResourceHighlights
              resources={resourceAnalytics?.topResources ?? []}
              locale={locale}
              isLoading={resourcesLoading}
              emptyMessage={t('sections.resources.empty')}
              viewAllLabel={t('actions.viewAllAnalytics')}
            />
          </CardContent>
        </Card>
      </div>

      {/* Session Scheduling Modal */}
      <AddSessionModal
        open={sessionModalOpen}
        onOpenChange={setSessionModalOpen}
        coachId={coachId}
        onSuccess={handleSessionCreated}
      />
    </div>
  );
}
