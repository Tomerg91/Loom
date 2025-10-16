/**
 * @fileoverview React Query hooks for retrieving the coach dashboard overview.
 * The query leverages a shared key so server prefetching and client-initiated
 * refetches stay in sync.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

import { dashboardQueryOptions } from '@/modules/dashboard/api/queryOptions';
import type { CoachOverviewData } from '@/modules/dashboard/types';

export const coachOverviewKeys = {
  all: ['dashboard', 'coach-overview'] as const,
};

interface CoachOverviewQueryConfig {
  fetchCoachOverview?: () => Promise<CoachOverviewData>;
}

async function fetchCoachOverviewFromApi(): Promise<CoachOverviewData> {
  const response = await fetch('/api/dashboard/coach-overview', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    throw new Error('Unable to load coach overview data');
  }

  if (payload.success === false) {
    throw new Error(payload.message ?? 'Unable to load coach overview data');
  }

  return (payload.data ?? payload) as CoachOverviewData;
}

export const getCoachOverviewQueryOptions = (
  config: CoachOverviewQueryConfig = {}
) =>
  dashboardQueryOptions({
    queryKey: coachOverviewKeys.all,
    queryFn: async () => {
      if (config.fetchCoachOverview) {
        return config.fetchCoachOverview();
      }

      return fetchCoachOverviewFromApi();
    },
  });

export const useCoachOverview = () =>
  useQuery({
    ...getCoachOverviewQueryOptions(),
  });
