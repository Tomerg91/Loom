'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Flag, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/routing';

import type { DashboardTranslations } from '../dashboard-types';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  progress: number;
  targetDate: string;
  createdDate: string;
}

interface ProgressResponse {
  goals: Goal[];
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
}

interface GoalProgressProps {
  locale: string;
  translations: DashboardTranslations;
}

async function fetchGoalProgress(): Promise<ProgressResponse> {
  const response = await fetch('/api/widgets/progress?limit=4', {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch goal progress');
  }

  const payload = await response.json();
  return payload.data ?? { goals: [], totalGoals: 0, completedGoals: 0, inProgressGoals: 0 };
}

function resolvePriorityLabel(priority: Goal['priority'], t: DashboardTranslations['dashboard']) {
  switch (priority) {
    case 'high':
      return t('clientSections.goalProgress.highPriority');
    case 'medium':
      return t('clientSections.goalProgress.mediumPriority');
    case 'low':
    default:
      return t('clientSections.goalProgress.lowPriority');
  }
}

export function ClientGoalProgress({ locale, translations }: GoalProgressProps) {
  const { dashboard: t, common: commonT } = translations;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
      }),
    [locale]
  );

  const { data, isLoading, isError, refetch } = useQuery<ProgressResponse>({
    queryKey: ['client-goal-progress', locale],
    queryFn: fetchGoalProgress,
    staleTime: 60_000,
  });

  const goals = data?.goals ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('clientSections.goalProgress.title')}
        </CardTitle>
        <CardDescription>{t('clientSections.goalProgress.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`goal-skeleton-${index}`} className="space-y-3 rounded-lg border p-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('clientSections.goalProgress.error')}</p>
            <Button onClick={() => refetch()} size="sm" variant="outline" className="mt-3">
              {commonT('retry')}
            </Button>
          </div>
        )}

        {!isLoading && !isError && goals.length === 0 && (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            <Flag className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>{t('clientSections.goalProgress.empty')}</p>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/client/progress">
                {t('clientSections.goalProgress.cta')}
              </Link>
            </Button>
          </div>
        )}

        {!isLoading && !isError && goals.length > 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('clientSections.goalProgress.total')}</p>
                <p className="text-2xl font-semibold text-foreground">{data?.totalGoals ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('clientSections.goalProgress.completed')}</p>
                <p className="text-2xl font-semibold text-foreground">{data?.completedGoals ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('clientSections.goalProgress.inProgress')}</p>
                <p className="text-2xl font-semibold text-foreground">{data?.inProgressGoals ?? 0}</p>
              </div>
            </div>

            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.id} className="rounded-lg border border-border/60 bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm text-foreground">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">{goal.description}</p>
                    </div>
                    {goal.status === 'completed' && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        {t('clientSections.goalProgress.completedLabel')}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{resolvePriorityLabel(goal.priority, t)}</span>
                    <span>
                      {t('clientSections.goalProgress.target', { date: dateFormatter.format(new Date(goal.targetDate)) })}
                    </span>
                  </div>
                  <Progress value={Math.round(goal.progress)} className="mt-3 h-2" />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
