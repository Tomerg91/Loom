'use client';

import { useQuery } from '@tanstack/react-query';

export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  avatarUrl?: string;
  bio?: string;
  isOnline?: boolean;
  timezone?: string;
}

interface UseBookingCoachesOptions {
  variant?: 'basic' | 'enhanced' | 'realtime';
  includeOnlineStatus?: boolean;
}

/**
 * Domain hook for fetching available coaches
 * Handles coach data fetching with optional online status
 */
export function useBookingCoaches(options: UseBookingCoachesOptions = {}) {
  const { variant = 'basic', includeOnlineStatus = false } = options;

  const shouldIncludeStatus = variant !== 'basic' || includeOnlineStatus;

  const {
    data: coaches,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['coaches', shouldIncludeStatus ? 'with-status' : 'basic'],
    queryFn: async (): Promise<Coach[]> => {
      const statusParam = shouldIncludeStatus ? '&include_online_status=true' : '';
      const response = await fetch(`/api/users?role=coach&status=active&limit=50${statusParam}`);

      if (!response.ok) {
        throw new Error('Failed to fetch coaches');
      }

      const data = await response.json();
      return data.data;
    },
    // Refresh online status periodically for enhanced/realtime variants
    refetchInterval: shouldIncludeStatus ? 30000 : false,
    staleTime: shouldIncludeStatus ? 20000 : 300000,
  });

  return {
    coaches: coaches ?? [],
    isLoading,
    error,
    refetch,
  };
}
