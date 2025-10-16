/**
 * @fileoverview React Query hook for retrieving the client dashboard overview.
 * Keeps server-prefetched cache entries aligned with client-initiated refetch
 * operations by sharing a consistent query key and fetch implementation.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

import { dashboardQueryOptions } from '@/modules/dashboard/api/queryOptions';
import type { ClientOverviewData } from '@/modules/dashboard/types';

export const clientOverviewKeys = {
  all: ['dashboard', 'client-overview'] as const,
};

interface ClientOverviewQueryConfig {
  fetchClientOverview?: () => Promise<ClientOverviewData>;
}

async function fetchClientOverviewFromApi(): Promise<ClientOverviewData> {
  const response = await fetch('/api/dashboard/client-overview', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    throw new Error('Unable to load client overview data');
  }

  if (payload.success === false) {
    throw new Error(payload.message ?? 'Unable to load client overview data');
  }

  return (payload.data ?? payload) as ClientOverviewData;
}

export const getClientOverviewQueryOptions = (
  config: ClientOverviewQueryConfig = {}
) =>
  dashboardQueryOptions({
    queryKey: clientOverviewKeys.all,
    queryFn: async () => {
      if (config.fetchClientOverview) {
        return config.fetchClientOverview();
      }

      return fetchClientOverviewFromApi();
    },
  });

export const useClientOverview = () =>
  useQuery({
    ...getClientOverviewQueryOptions(),
  });
