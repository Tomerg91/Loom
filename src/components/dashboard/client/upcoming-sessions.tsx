'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, ExternalLink, Video } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/routing';
import type { Session } from '@/types';

import type { DashboardTranslations } from '../dashboard-types';

interface ClientUpcomingSessionsProps {
  userId: string;
  locale: string;
  translations: DashboardTranslations;
}

interface SessionsResponse {
  data?: Session[];
}

const UPCOMING_LIMIT = 2;

async function fetchClientUpcomingSessions(userId: string): Promise<Session[]> {
  const params = new URLSearchParams({
    clientId: userId,
    status: 'scheduled',
    sortOrder: 'asc',
    limit: String(UPCOMING_LIMIT * 2),
  });

  const response = await fetch(`/api/sessions?${params.toString()}`, {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch upcoming sessions');
  }

  const payload: SessionsResponse = await response.json();
  const now = new Date();
  return (payload.data ?? [])
    .filter((session) => {
      const scheduled = new Date(session.scheduledAt);
      return Number.isFinite(scheduled.getTime()) && scheduled >= now;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, UPCOMING_LIMIT);
}

export function ClientUpcomingSessions({ userId, locale, translations }: ClientUpcomingSessionsProps) {
  const { dashboard: t, common: commonT } = translations;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
      }),
    [locale]
  );

  const {
    data: sessions,
    isLoading,
    isError,
    refetch,
  } = useQuery<Session[]>({
    queryKey: ['client-upcoming-sessions', userId],
    queryFn: () => fetchClientUpcomingSessions(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('clientSections.upcomingSessions.title')}
        </CardTitle>
        <CardDescription>{t('clientSections.upcomingSessions.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: UPCOMING_LIMIT }).map((_, index) => (
              <div key={`upcoming-session-skeleton-${index}`} className="rounded-lg border p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-32" />
                <Skeleton className="mt-3 h-9 w-full" />
              </div>
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('clientSections.upcomingSessions.error')}</p>
            <Button onClick={() => refetch()} size="sm" variant="outline" className="mt-3">
              {commonT('retry')}
            </Button>
          </div>
        )}

        {!isLoading && !isError && (sessions?.length ?? 0) === 0 && (
          <div className="py-10 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>{t('clientSections.upcomingSessions.empty')}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/client/book" locale={locale}>
                {t('clientSections.upcomingSessions.cta')}
              </Link>
            </Button>
          </div>
        )}

        {!isLoading && !isError && (sessions?.length ?? 0) > 0 && (
          <div className="space-y-3">
            {sessions?.map((session) => {
              const scheduledAt = new Date(session.scheduledAt);
              const coachName = `${session.coach.firstName ?? ''} ${session.coach.lastName ?? ''}`.trim() ||
                session.coach.email;

              return (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">{session.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('clientSections.upcomingSessions.with')} {coachName}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {dateFormatter.format(scheduledAt)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/sessions/${session.id}`} locale={locale}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {commonT('view')}
                      </Link>
                    </Button>
                    {session.meetingUrl && (
                      <Button asChild size="sm">
                        <a
                          href={session.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Video className="mr-2 h-4 w-4" />
                          {t('clientSections.upcomingSessions.join')}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
