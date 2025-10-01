'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, Clock, FileText, Users } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/routing';

import type { DashboardTranslations } from '../dashboard-types';

type ActivityType = 'session_completed' | 'note_added' | 'client_joined' | 'session_scheduled';

interface CoachActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  clientName?: string;
}

async function fetchRecentActivity(): Promise<CoachActivityItem[]> {
  const response = await fetch('/api/coach/activity?limit=6', {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch coach activity');
  }

  const payload = await response.json();
  return payload.data ?? [];
}

function resolveIcon(type: ActivityType) {
  switch (type) {
    case 'session_completed':
      return CheckCircle2;
    case 'session_scheduled':
      return Clock;
    case 'note_added':
      return FileText;
    case 'client_joined':
    default:
      return Users;
  }
}

export function CoachRecentActivityFeed({ locale, translations }: { locale: string; translations: DashboardTranslations }) {
  const { dashboard: t, common: commonT } = translations;

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
      }),
    [locale]
  );

  const { data, isLoading, isError, refetch } = useQuery<CoachActivityItem[]>({
    queryKey: ['coach-recent-activity'],
    queryFn: fetchRecentActivity,
    staleTime: 30_000,
  });

  const items = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('coachSections.activityFeed.title')}
        </CardTitle>
        <CardDescription>{t('coachSections.activityFeed.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`activity-skeleton-${index}`} className="flex items-center gap-3 rounded-lg border p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('coachSections.activityFeed.error')}</p>
            <Button onClick={() => refetch()} size="sm" variant="outline" className="mt-3">
              {commonT('retry')}
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            <Activity className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>{t('coachSections.activityFeed.empty')}</p>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((item) => {
              const Icon = resolveIcon(item.type);
              return (
                <li key={item.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">{item.description}</p>
                    {item.clientName && (
                      <p className="text-xs text-muted-foreground">
                        {t('coachSections.activityFeed.with', { name: item.clientName })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {timeFormatter.format(new Date(item.timestamp))}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="px-0 text-primary">
                    <Link href="/coach/clients">{t('coachSections.activityFeed.viewClient')}</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
