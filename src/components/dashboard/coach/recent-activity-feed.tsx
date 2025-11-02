'use client';

import {
  Activity,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/routing';
import type {
  CoachDashboardActivityItem,
  CoachDashboardActivityType,
} from '@/modules/dashboard/types';

interface CoachRecentActivityFeedProps {
  locale: string;
  activity: CoachDashboardActivityItem[];
  isRefreshing?: boolean;
  onRefresh?: (() => void) | undefined;
  error?: string;
}

function resolveIcon(type: CoachDashboardActivityType) {
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

export function CoachRecentActivityFeed({
  locale,
  activity,
  isRefreshing = false,
  onRefresh,
  error,
}: CoachRecentActivityFeedProps) {
  const t = useTranslations('dashboard.coachSections.activityFeed');
  const commonT = useTranslations('common');

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

  const showSkeleton = isRefreshing && activity.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </div>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            variant="ghost"
            size="sm"
            className="inline-flex items-center gap-2 text-primary"
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            {commonT('refresh')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showSkeleton && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`activity-skeleton-${index}`}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('error')}</p>
            {onRefresh && (
              <Button
                onClick={onRefresh}
                size="sm"
                variant="outline"
                className="mt-3"
              >
                {commonT('retry')}
              </Button>
            )}
          </div>
        )}

        {activity.length === 0 && !showSkeleton && !error && (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            <Activity className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>{t('empty')}</p>
          </div>
        )}

        {activity.length > 0 && (
          <ul className="space-y-3">
            {activity.map(item => {
              const Icon = resolveIcon(item.type);
              const timestamp = new Date(item.timestamp);

              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-4"
                >
                  <div className="rounded-full bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.description}
                    </p>
                    {item.clientName && (
                      <p className="text-xs text-muted-foreground">
                        {t('with', { name: item.clientName })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {timeFormatter.format(timestamp)}
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="px-0 text-primary"
                  >
                    <Link href="/coach/clients">{t('viewClient')}</Link>
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
