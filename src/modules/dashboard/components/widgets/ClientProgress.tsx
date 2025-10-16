/**
 * @fileoverview Client progress widget summarising engagement per client.
 */

'use client';

import { UserCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { CoachOverviewClientProgress } from '@/modules/dashboard/types';

interface ClientProgressOverviewProps {
  clients: CoachOverviewClientProgress[];
  isLoading: boolean;
  emptyMessage: string;
  completionLabel: (value: number | null) => string;
  activeTasksLabel: (count: number) => string;
  lastSessionLabel: (value: string | null) => string;
}

function formatPercentage(value: number | null): number {
  if (value === null || Number.isNaN(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 100);
}

export function ClientProgressOverview({
  clients,
  isLoading,
  emptyMessage,
  completionLabel,
  activeTasksLabel,
  lastSessionLabel,
}: ClientProgressOverviewProps) {
  if (isLoading) {
    return (
      <ul className="space-y-3" aria-label="loading client progress">
        {Array.from({ length: 4 }).map((_, index) => (
          <li
            key={`client-skeleton-${index}`}
            className="flex flex-col gap-3 rounded-xl border border-sand-200 bg-white/60 p-4 shadow-sm"
          >
            <span className="block h-5 w-40 animate-pulse rounded bg-sand-200" />
            <span className="block h-3 w-full animate-pulse rounded bg-sand-100" />
          </li>
        ))}
      </ul>
    );
  }

  if (!clients.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {clients.map(client => {
        const completionValue = formatPercentage(client.completionRate);

        return (
          <li
            key={client.clientId}
            className="flex flex-col gap-3 rounded-xl border border-sand-200 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-base font-semibold text-sand-900">
                  {client.clientName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {client.clientEmail}
                </p>
              </div>
              <Badge variant="outline">
                {activeTasksLabel(client.activeTasks)}
              </Badge>
            </div>
            <div className="space-y-2">
              <Progress
                value={completionValue}
                aria-label={completionLabel(client.completionRate)}
              />
              <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>{completionLabel(client.completionRate)}</span>
                <span className="inline-flex items-center gap-2">
                  <UserCircle className="h-4 w-4" aria-hidden="true" />
                  {lastSessionLabel(client.lastSessionAt)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
