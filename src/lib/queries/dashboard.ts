'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchUserProfile, fetchDashboardSummary } from '@/lib/api/dashboard';

// Query keys for cache management
export const dashboardKeys = {
  all: ['dashboard'] as const,
  profile: () => [...dashboardKeys.all, 'profile'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};

export function useUserProfile() {
  return useQuery({
    queryKey: dashboardKeys.profile(),
    queryFn: fetchUserProfile,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: fetchDashboardSummary,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
