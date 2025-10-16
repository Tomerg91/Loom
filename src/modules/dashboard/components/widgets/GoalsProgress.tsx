/**
 * @fileoverview Displays progress toward active client goals.
 */

'use client';

import { Flag, Hourglass } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type {
  ClientGoalPriority,
  ClientGoalProgress,
  ClientGoalStatus,
} from '@/modules/dashboard/types';

interface GoalsProgressProps {
  goals: ClientGoalProgress[];
  isLoading: boolean;
  emptyMessage: string;
  statusLabels: Record<ClientGoalStatus, string>;
  priorityLabels: Record<ClientGoalPriority, string>;
  locale: string;
  targetLabel: string;
}

const priorityVariantMap: Record<
  ClientGoalPriority,
  'default' | 'secondary' | 'destructive'
> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

function formatTargetDate(value: string | null, locale: string): string {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      new Date(value)
    );
  } catch (_error) {
    return value;
  }
}

export function GoalsProgress({
  goals,
  isLoading,
  emptyMessage,
  statusLabels,
  priorityLabels,
  locale,
  targetLabel,
}: GoalsProgressProps) {
  if (isLoading) {
    return (
      <ul className="space-y-4" aria-label="loading goals">
        {Array.from({ length: 3 }).map((_, index) => (
          <li
            key={`goal-skeleton-${index}`}
            className="space-y-3 rounded-xl border border-sand-200 bg-white/60 p-4 shadow-sm"
          >
            <span className="block h-5 w-40 animate-pulse rounded bg-sand-200" />
            <span className="block h-3 w-full animate-pulse rounded bg-sand-100" />
          </li>
        ))}
      </ul>
    );
  }

  if (!goals.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-4">
      {goals.map(goal => {
        const statusLabel = statusLabels[goal.status] ?? goal.status;
        const priorityVariant = priorityVariantMap[goal.priority] ?? 'default';
        const priorityLabel = priorityLabels[goal.priority] ?? goal.priority;
        const targetDate = formatTargetDate(goal.targetDate, locale);

        return (
          <li
            key={goal.id}
            className="space-y-3 rounded-xl border border-sand-200 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-base font-semibold text-sand-900">
                  {goal.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Flag className="h-4 w-4" aria-hidden="true" />
                    <Badge variant={priorityVariant}>{priorityLabel}</Badge>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Hourglass className="h-4 w-4" aria-hidden="true" />
                    {targetLabel}: {targetDate}
                  </span>
                </div>
              </div>
              <Badge variant="outline">{statusLabel}</Badge>
            </div>
            <div>
              <Progress
                value={goal.progressPercentage}
                aria-label={goal.title}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {goal.progressPercentage}%
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
