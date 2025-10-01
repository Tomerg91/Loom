'use client';

import { CheckCircle2, Flag, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';

import type { DashboardTranslations } from '../dashboard-types';

interface GoalProgressProps {
  userId: string;
  locale: string;
  translations: DashboardTranslations;
}

interface GoalRecord {
  id: string;
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

export function ClientGoalProgress({ userId, locale, translations }: GoalProgressProps) {
  const { dashboard: t, common: commonT } = translations;

  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [stats, setStats] = useState<GoalStats>({ total: 0, completed: 0, inProgress: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
      }),
    [locale]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadGoals() {
      if (!userId) {
        if (isMounted) {
          setGoals([]);
          setStats({ total: 0, completed: 0, inProgress: 0 });
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const supabase = createClient() as any;
        const { data, error } = await supabase
          .from('goals')
          .select('id, description, progress, created_at, client_id')
          .eq('client_id', userId)
          .order('created_at', { ascending: false });

        console.log('[ClientGoalProgress] Supabase response', { data, error });

        if (error) {
          throw error;
        }

        const goalRowsRaw = Array.isArray(data) ? data : [];
        const goalRows: GoalRecord[] = goalRowsRaw.map((goal: any) => ({
          id: String(goal.id ?? ''),
          description: typeof goal.description === 'string' ? goal.description : null,
          progress:
            typeof goal.progress === 'number'
              ? goal.progress
              : goal.progress != null && !Number.isNaN(Number(goal.progress))
                ? Number(goal.progress)
                : null,
          created_at: typeof goal.created_at === 'string' ? goal.created_at : new Date().toISOString(),
          client_id: typeof goal.client_id === 'string' ? goal.client_id : userId,
        }));

        if (isMounted) {
          setGoals(goalRows);

          const completed = goalRows.filter((goal) => (goal.progress ?? 0) >= 100).length;
          const inProgress = goalRows.filter((goal) => (goal.progress ?? 0) > 0 && (goal.progress ?? 0) < 100).length;

          setStats({
            total: goalRows.length,
            completed,
            inProgress,
          });
        }
      } catch (error) {
        console.error('[ClientGoalProgress] Failed to load goals', error);
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadGoals();

    return () => {
      isMounted = false;
    };
  }, [userId]);

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
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            {commonT('loading')}
          </div>
        )}

        {errorMessage && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('clientSections.goalProgress.error')}</p>
            <p className="mt-2 text-xs text-destructive/80">{errorMessage}</p>
          </div>
        )}

        {!isLoading && !errorMessage && goals.length === 0 && (
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

        {!isLoading && !errorMessage && goals.length > 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('clientSections.goalProgress.total')}</p>
                <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('clientSections.goalProgress.completed')}</p>
                <p className="text-2xl font-semibold text-foreground">{stats.completed}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('clientSections.goalProgress.inProgress')}</p>
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
                          {goal.description ?? 'Untitled goal'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dateFormatter.format(new Date(goal.created_at))}
                        </p>
                      </div>
                      {isCompleted && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          {t('clientSections.goalProgress.completedLabel')}
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
