'use client';

import { CalendarClock, ExternalLink, RefreshCw, User } from 'lucide-react';
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
import type { CoachDashboardAgendaItem } from '@/modules/dashboard/types';

interface CoachTodaysAgendaProps {
  locale: string;
  agenda: CoachDashboardAgendaItem[];
  isRefreshing?: boolean;
  onRefresh?: (() => void) | undefined;
  error?: string;
}

export function CoachTodaysAgenda({
  locale,
  agenda,
  isRefreshing = false,
  onRefresh,
  error,
}: CoachTodaysAgendaProps) {
  const t = useTranslations('dashboard.coachSections.todaysAgenda');
  const commonT = useTranslations('common');

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale]
  );

  const dateLabelFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }),
    [locale]
  );

  const agendaDate = agenda[0]?.scheduledAt
    ? new Date(agenda[0].scheduledAt)
    : new Date();

  const showSkeleton = isRefreshing && agenda.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('subtitle', { date: dateLabelFormatter.format(agendaDate) })}
          </CardDescription>
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
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`agenda-skeleton-${index}`}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-9 w-24" />
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

        {agenda.length === 0 && !showSkeleton && !error && (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            <CalendarClock className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p>{t('empty')}</p>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/sessions/new">{t('cta')}</Link>
            </Button>
          </div>
        )}

        {agenda.length > 0 && (
          <ol className="space-y-3">
            {agenda.map(session => {
              const clientName = session.clientName || commonT('unknown');

              return (
                <li
                  key={session.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {session.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {clientName} •{' '}
                        {timeFormatter.format(new Date(session.scheduledAt))}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/sessions/${session.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('viewDetails')}
                      </Link>
                    </Button>
                    {session.meetingUrl && (
                      <Button asChild size="sm">
                        <a
                          href={session.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t('startSession')}
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
