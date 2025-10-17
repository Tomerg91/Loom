/**
 * @fileoverview Presentational widget rendering upcoming coach sessions.
 */

'use client';

import { CalendarDays, Clock, ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { CoachOverviewSession } from '@/modules/dashboard/types';
import type { SessionStatus } from '@/types';

interface SessionsListProps {
  sessions: CoachOverviewSession[];
  locale: string;
  statusLabels: Record<SessionStatus, string>;
  isLoading: boolean;
  emptyMessage: string;
  joinLabel: string;
  durationLabel: string;
}

function formatDateTime(value: string | null, locale: string): string {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (_error) {
    return value;
  }
}

function formatDuration(minutes: number | null): string {
  if (!minutes) {
    return '';
  }

  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours}h`;
  }

  return `${minutes}m`;
}

export function SessionsList({
  sessions,
  locale,
  statusLabels,
  isLoading,
  emptyMessage,
  joinLabel,
  durationLabel,
}: SessionsListProps) {
  if (isLoading) {
    return (
      <ul className="space-y-3" aria-label="loading sessions">
        {Array.from({ length: 3 }).map((_, index) => (
          <li
            key={`session-skeleton-${index}`}
            className="flex flex-col gap-3 rounded-xl border border-sand-200 bg-white/60 p-4 shadow-sm"
          >
            <span className="block h-5 w-32 animate-pulse rounded bg-sand-200" />
            <span className="block h-4 w-48 animate-pulse rounded bg-sand-100" />
            <span className="block h-4 w-40 animate-pulse rounded bg-sand-100" />
          </li>
        ))}
      </ul>
    );
  }

  if (!sessions.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {sessions.map(session => {
        const formattedDate = formatDateTime(session.scheduledAt, locale);
        const formattedDuration = formatDuration(session.durationMinutes);
        const statusLabel = statusLabels[session.status] ?? session.status;

        return (
          <li
            key={session.id}
            className="flex flex-col gap-3 rounded-xl border border-sand-200 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-base font-semibold text-sand-900">
                  {session.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {session.clientName}
                </p>
              </div>
              <Badge variant="info">{statusLabel}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {formattedDate}
              </span>
              {formattedDuration ? (
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {durationLabel}: {formattedDuration}
                </span>
              ) : null}
              {session.meetingUrl ? (
                <a
                  href={session.meetingUrl}
                  className="inline-flex items-center gap-2 text-teal-700 transition hover:text-teal-900 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {joinLabel}
                </a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
