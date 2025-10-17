/**
 * @fileoverview Dashboard-friendly timeline that merges upcoming sessions with
 * pending scheduling requests. The component relies on the shared React Query
 * hooks so the UI automatically refreshes when sessions are booked or updated.
 */

'use client';

import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircleQuestion,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  useSessionCalendar,
  useSessionRequests,
} from '@/modules/sessions/api/sessions';
import type {
  SessionCalendarEntry,
  SessionRequestSummary,
} from '@/modules/sessions/types';

interface SessionTimelineProps {
  className?: string;
  upcomingLimit?: number;
}

const formatDateTime = (
  value: string | null,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string => {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(locale, options).format(new Date(value));
  } catch (_error) {
    return value;
  }
};

const formatDuration = (minutes: number): string => {
  if (!minutes) {
    return '';
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours}h`;
  }

  return `${minutes}m`;
};

const buildRequestStatus = (
  status: SessionRequestSummary['status']
): { icon: ReactElement; variant: 'default' | 'secondary' | 'destructive' } => {
  switch (status) {
    case 'approved':
      return {
        icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
        variant: 'secondary',
      };
    case 'declined':
      return {
        icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
        variant: 'destructive',
      };
    default:
      return {
        icon: <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />,
        variant: 'default',
      };
  }
};

const renderSession = (
  session: SessionCalendarEntry,
  locale: string,
  t: ReturnType<typeof useTranslations>
): ReactElement => {
  const formattedDate = formatDateTime(session.scheduledAt, locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const durationLabel = formatDuration(session.durationMinutes);

  return (
    <li
      key={session.id}
      className="relative flex flex-col gap-2 rounded-xl border border-sand-200 bg-white/70 p-4 shadow-sm"
    >
      <span
        className="absolute -left-5 top-6 flex h-2 w-2 translate-x-1/2 rounded-full bg-teal-500"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-semibold text-sand-900">{session.title}</p>
        <Badge variant="info">
          {t(`timeline.sessionStatus.${session.status}`)}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          {formattedDate}
        </span>
        {durationLabel ? (
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {t('timeline.durationLabel', { duration: durationLabel })}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-2">
          <UserRound className="h-4 w-4" aria-hidden="true" />
          {session.clientName ?? t('timeline.unknownClient')}
        </span>
      </div>
      {session.notes ? (
        <p className="text-sm text-muted-foreground">{session.notes}</p>
      ) : null}
    </li>
  );
};

const renderRequest = (
  request: SessionRequestSummary,
  locale: string,
  t: ReturnType<typeof useTranslations>
): ReactElement => {
  const formattedDate = formatDateTime(request.scheduledAt, locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const status = buildRequestStatus(request.status);

  return (
    <li
      key={request.id}
      className="flex flex-col gap-2 rounded-xl border border-sand-200 bg-white/60 p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-base font-semibold text-sand-900">
            {request.title ?? t('timeline.requestFallbackTitle')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('timeline.requestedBy', {
              name: request.requesterName ?? t('timeline.unknownRequester'),
            })}
          </p>
        </div>
        <Badge
          variant={status.variant}
          className="inline-flex items-center gap-2"
        >
          {status.icon}
          {t(`timeline.requestStatus.${request.status}`)}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          {formattedDate}
        </span>
        <span className="inline-flex items-center gap-2">
          <UserRound className="h-4 w-4" aria-hidden="true" />
          {request.clientName ?? t('timeline.unknownClient')}
        </span>
      </div>
      {request.notes ? (
        <p className="text-sm text-muted-foreground">{request.notes}</p>
      ) : null}
    </li>
  );
};

export function SessionTimeline({
  className,
  upcomingLimit = 10,
}: SessionTimelineProps) {
  const t = useTranslations('sessions.schedule.timeline');
  const locale = useLocale();
  const {
    data: sessions = [],
    isLoading: isCalendarLoading,
    isFetching: isCalendarFetching,
  } = useSessionCalendar({ limit: upcomingLimit });
  const {
    data: requests = [],
    isLoading: isRequestLoading,
    isFetching: isRequestFetching,
  } = useSessionRequests();

  const isLoading =
    isCalendarLoading ||
    isRequestLoading ||
    isCalendarFetching ||
    isRequestFetching;

  return (
    <Card className={className} data-testid="session-timeline">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>{t('loading')}</span>
          </div>
        ) : (
          <div className="space-y-10">
            <section aria-labelledby="session-pending">
              <header className="mb-3 flex items-center justify-between">
                <h2
                  id="session-pending"
                  className="text-lg font-semibold text-sand-900"
                >
                  {t('pendingTitle')}
                </h2>
                <Badge variant="outline">{requests.length}</Badge>
              </header>
              {requests.length > 0 ? (
                <ul className="space-y-3">
                  {requests.map(request => renderRequest(request, locale, t))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('emptyRequests')}
                </p>
              )}
            </section>

            <Separator />

            <section aria-labelledby="session-upcoming">
              <header className="mb-3 flex items-center justify-between">
                <h2
                  id="session-upcoming"
                  className="text-lg font-semibold text-sand-900"
                >
                  {t('upcomingTitle')}
                </h2>
                <Badge variant="outline">{sessions.length}</Badge>
              </header>
              {sessions.length > 0 ? (
                <ol className="relative ml-6 space-y-4 border-l border-sand-200 pl-6">
                  {sessions.map(session => renderSession(session, locale, t))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('emptySessions')}
                </p>
              )}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
