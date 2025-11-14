'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Flag, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';


interface GoalProgressProps {
  userId: string;
  locale: string;}

interface GoalRecord {
  id: string;
  title: string | null;
  description: string | null;
  progress: number | null;
  created_at: string;
  client_id: string;
}

interface GoalStats {
  total: number;
  completed: number;
  inProgress: number;
}

interface GoalsData {
  goals: GoalRecord[];
  stats: GoalStats;
}

async function fetchClientGoals(userId: string): Promise<GoalsData> {
  if (!userId) {
    return {
      goals: [],
      stats: { total: 0, completed: 0, inProgress: 0 }
    };
  }

  const supabase = createClient() as unknown;
  const { data, error } = await supabase
    .from('client_goals')
    .select('id, title, description, progress_percentage, created_at, client_id')
    .eq('client_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const goalRowsRaw = Array.isArray(data) ? data : [];
  const goalRows: GoalRecord[] = goalRowsRaw.map((goal: unknown) => ({
    id: String(goal.id ?? ''),
    title: typeof goal.title === 'string' ? goal.title : null,
    description: typeof goal.description === 'string' ? goal.description : null,
    progress:
      typeof goal.progress_percentage === 'number'
        ? goal.progress_percentage
        : goal.progress_percentage != null && !Number.isNaN(Number(goal.progress_percentage))
          ? Number(goal.progress_percentage)
          : null,
    created_at: typeof goal.created_at === 'string' ? goal.created_at : new Date().toISOString(),
    client_id: typeof goal.client_id === 'string' ? goal.client_id : userId,
  }));

  const completed = goalRows.filter((goal) => (goal.progress ?? 0) >= 100).length;
  const inProgress = goalRows.filter((goal) => (goal.progress ?? 0) > 0 && (goal.progress ?? 0) < 100).length;

  return {
    goals: goalRows,
    stats: {
      total: goalRows.length,
      completed,
      inProgress,
    }
  };
}

export function ClientGoalProgress({ userId, locale }: GoalProgressProps) {
  const t = useTranslations('dashboard.clientSections.goalProgress');
  const commonT = useTranslations('common');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['client-goals', userId],
    queryFn: () => fetchClientGoals(userId),
    enabled: !!userId,
    staleTime: 2 * 60_000, // 2 minutes
  });

  const goals = data?.goals ?? [];
  const stats = data?.stats ?? { total: 0, completed: 0, inProgress: 0 };

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
      }),
    [locale]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            {commonT('loading')}
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('error')}</p>
            <p className="mt-2 text-xs text-destructive/80">{error instanceof Error ? error.message : String(error)}</p>
            <Button onClick={() => refetch()} size="sm" variant="outline" className="mt-3">
              {commonT('retry')}
            </Button>
          </div>
        )}

        {!isLoading && !error && goals.length === 0 && (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            <Flag className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>{t('empty')}</p>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/client/progress">
                {t('cta')}
              </Link>
            </Button>
          </div>
        )}

        {!isLoading && !error && goals.length > 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('total')}</p>
                <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('completed')}</p>
                <p className="text-2xl font-semibold text-foreground">{stats.completed}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('inProgress')}</p>
                <p className="text-2xl font-semibold text-foreground">{stats.inProgress}</p>
              </div>
            </div>

            <div className="space-y-4">
              {goals.map((goal) => {
                const progressValue = Math.max(0, Math.min(100, goal.progress ?? 0));
                const isCompleted = progressValue >= 100;

                return (
                  <div key={goal.id} className="rounded-lg border border-border/60 bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {goal.title ?? goal.description ?? 'Untitled goal'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dateFormatter.format(new Date(goal.created_at))}
                        </p>
                      </div>
                      {isCompleted && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          {t('completedLabel')}
                        </span>
                      )}
                    </div>
                    <Progress value={progressValue} className="mt-3 h-2" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
