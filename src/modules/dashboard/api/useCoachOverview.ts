/**
 * @fileoverview React Query hooks for retrieving the coach dashboard overview.
 * The query leverages a shared key so server prefetching and client-initiated
 * refetches stay in sync.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api/client-api-request';
import { dashboardQueryOptions } from '@/modules/dashboard/api/queryOptions';
import type { CoachOverviewData } from '@/modules/dashboard/types';

export const coachOverviewKeys = {
  all: ['dashboard', 'coach-overview'] as const,
};

interface CoachOverviewQueryConfig {
  fetchCoachOverview?: () => Promise<CoachOverviewData>;
}

async function fetchCoachOverviewFromApi(): Promise<CoachOverviewData> {
  const payload = await apiGet<{ data?: CoachOverviewData; success?: boolean; message?: string } | CoachOverviewData>('/api/dashboard/coach-overview');

  if ('success' in payload && payload.success === false) {
    throw new Error(payload.message ?? 'Unable to load coach overview data');
  }

  return ('data' in payload ? payload.data : payload) as CoachOverviewData;
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
