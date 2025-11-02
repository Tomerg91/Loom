/**
 * @fileoverview React Query helpers for the coach dashboard summary. The
 * options allow server components to inject a server-side loader while client
 * components reuse the shared cache and background refetch behaviour.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

import { dashboardQueryOptions } from '@/modules/dashboard/api/queryOptions';
import type { CoachDashboardSummary } from '@/modules/dashboard/types';

export const coachDashboardSummaryKeys = {
  all: ['dashboard', 'coach-summary'] as const,
  summary: (coachId: string | null | undefined) =>
    ['dashboard', 'coach-summary', coachId ?? 'unknown'] as const,
};

interface CoachDashboardSummaryQueryConfig {
  coachId: string | null | undefined;
  loadSummary?: () => Promise<CoachDashboardSummary>;
}

async function fetchCoachDashboardSummaryFromApi(): Promise<CoachDashboardSummary> {
  const response = await fetch('/api/dashboard/coach-summary', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    throw new Error('Unable to load dashboard summary');
  }

  if (payload.success === false) {
    throw new Error(payload.message ?? 'Unable to load dashboard summary');
  }

  return (payload.data ?? payload) as CoachDashboardSummary;
}

export const getCoachDashboardSummaryQueryOptions = (
  config: CoachDashboardSummaryQueryConfig
) =>
  dashboardQueryOptions({
    queryKey: coachDashboardSummaryKeys.summary(config.coachId),
    queryFn: async () => {
      if (config.loadSummary) {
        return config.loadSummary();
      }

      return fetchCoachDashboardSummaryFromApi();
    },
  });

export const useCoachDashboardSummary = (coachId: string | null | undefined) =>
  useQuery({
    ...getCoachDashboardSummaryQueryOptions({ coachId }),
    enabled: Boolean(coachId),
  });
