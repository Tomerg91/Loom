import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  UserPreferences,
  NotificationPreferences,
  UserSettings,
  SettingsAuditLog,
  SettingCategory
} from '@/types';

// Query keys for hierarchical cache invalidation
export const settingsKeys = {
  all: ['settings'] as const,
  preferences: () => [...settingsKeys.all, 'preferences'] as const,
  notifications: () => [...settingsKeys.all, 'notifications'] as const,
  complete: () => [...settingsKeys.all, 'complete'] as const,
  audit: () => [...settingsKeys.all, 'audit'] as const,
  auditList: (filters: { limit?: number; offset?: number; category?: SettingCategory }) =>
    [...settingsKeys.audit(), { filters }] as const,
};

// API Response Types
interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface AuditResponse {
  data: {
    logs: SettingsAuditLog[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  };
}

/**
 * Hook to fetch user preferences
 */
export function useUserPreferences() {
  return useQuery({
    queryKey: settingsKeys.preferences(),
    queryFn: async (): Promise<UserPreferences> => {
      const response = await fetch('/api/settings/preferences');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch preferences');
      }
      const result: ApiResponse<UserPreferences> = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook to fetch notification preferences
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: settingsKeys.notifications(),
    queryFn: async (): Promise<NotificationPreferences> => {
      const response = await fetch('/api/notifications/preferences');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch notification preferences');
      }
      const result: ApiResponse<NotificationPreferences> = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch complete user settings (profile + preferences + notifications)
 */
export function useUserSettings() {
  return useQuery({
    queryKey: settingsKeys.complete(),
    queryFn: async (): Promise<UserSettings> => {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch settings');
      }
      const result: ApiResponse<UserSettings> = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch settings audit history
 */
export function useSettingsAuditHistory(
  limit = 50,
  offset = 0,
  category?: SettingCategory
) {
  return useQuery({
    queryKey: settingsKeys.auditList({ limit, offset, category }),
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(category && { category }),
      });

      const response = await fetch(`/api/settings/audit?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch audit history');
      }
      const result: AuditResponse = await response.json();
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation to update user preferences
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserPreferences> & { changeReason?: string }) => {
      const response = await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      const result: ApiResponse<UserPreferences> = await response.json();
      return result.data;
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: settingsKeys.preferences() });

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<UserPreferences>(
        settingsKeys.preferences()
      );

      // Optimistically update
      if (previousPreferences) {
        queryClient.setQueryData<UserPreferences>(
          settingsKeys.preferences(),
          { ...previousPreferences, ...updates }
        );
      }

      return { previousPreferences };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          settingsKeys.preferences(),
          context.previousPreferences
        );
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: settingsKeys.preferences() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.complete() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.audit() });
    },
  });
}

/**
 * Mutation to update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Partial<NotificationPreferences> & { changeReason?: string }
    ) => {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update notification preferences');
      }

      const result: ApiResponse<NotificationPreferences> = await response.json();
      return result.data;
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: settingsKeys.notifications() });

      // Snapshot previous value
      const previousNotifications = queryClient.getQueryData<NotificationPreferences>(
        settingsKeys.notifications()
      );

      // Optimistically update
      if (previousNotifications) {
        queryClient.setQueryData<NotificationPreferences>(
          settingsKeys.notifications(),
          { ...previousNotifications, ...updates }
        );
      }

      return { previousNotifications };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          settingsKeys.notifications(),
          context.previousNotifications
        );
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: settingsKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.complete() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.audit() });
    },
  });
}

/**
 * Hook to prefetch settings data
 * Useful for optimizing page loads
 */
export function usePrefetchSettings() {
  const queryClient = useQueryClient();

  return {
    prefetchPreferences: () =>
      queryClient.prefetchQuery({
        queryKey: settingsKeys.preferences(),
        queryFn: async () => {
          const response = await fetch('/api/settings/preferences');
          const result: ApiResponse<UserPreferences> = await response.json();
          return result.data;
        },
      }),
    prefetchNotifications: () =>
      queryClient.prefetchQuery({
        queryKey: settingsKeys.notifications(),
        queryFn: async () => {
          const response = await fetch('/api/notifications/preferences');
          const result: ApiResponse<NotificationPreferences> = await response.json();
          return result.data;
        },
      }),
    prefetchComplete: () =>
      queryClient.prefetchQuery({
        queryKey: settingsKeys.complete(),
        queryFn: async () => {
          const response = await fetch('/api/settings');
          const result: ApiResponse<UserSettings> = await response.json();
          return result.data;
        },
      }),
  };
}

/**
 * Hook to invalidate all settings-related queries
 * Useful after authentication changes or when forcefully refreshing settings
 */
export function useInvalidateSettings() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: settingsKeys.all });
  };
}
