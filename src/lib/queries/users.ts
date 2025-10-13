import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { createUserService } from '@/lib/database';
import type { User, UserRole, UserStatus } from '@/types';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  stats: (id: string) => [...userKeys.detail(id), 'stats'] as const,
  coaches: () => [...userKeys.all, 'coaches'] as const,
  clients: () => [...userKeys.all, 'clients'] as const,
  coachClients: (coachId: string) => [...userKeys.all, 'coach-clients', coachId] as const,
  search: (query: string, role?: UserRole) => [...userKeys.all, 'search', { query, role }] as const,
};

// Hooks
export function useUserProfile(userId: string) {
  const userService = createUserService(false);
  
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userService.getUserProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserStats(userId: string) {
  const userService = createUserService(false);
  
  return useQuery({
    queryKey: userKeys.stats(userId),
    queryFn: () => userService.getUserStats(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCoaches() {
  const userService = createUserService(false);
  
  return useQuery({
    queryKey: userKeys.coaches(),
    queryFn: () => userService.getCoaches(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useClients() {
  const userService = createUserService(false);
  
  return useQuery({
    queryKey: userKeys.clients(),
    queryFn: () => userService.getClients(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCoachClients(coachId: string) {
  const userService = createUserService(false);
  
  return useQuery({
    queryKey: userKeys.coachClients(coachId),
    queryFn: () => userService.getCoachClients(coachId),
    enabled: !!coachId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSearchUsers(query: string, role?: UserRole) {
  const userService = createUserService(false);
  
  return useQuery({
    queryKey: userKeys.search(query, role),
    queryFn: () => userService.searchUsers(query, role),
    enabled: query.length >= 2, // Only search if query is at least 2 characters
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Mutations
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const userService = createUserService(false);

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<User> }) =>
      userService.updateUserProfile(userId, updates),
    onSuccess: (data, { userId }) => {
      if (data) {
        // Update the user profile cache
        queryClient.setQueryData(userKeys.detail(userId), data);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: userKeys.stats(userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      }
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const userService = createUserService(false);

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) =>
      userService.updateUserStatus(userId, status),
    onSuccess: (success, { userId }) => {
      if (success) {
        // Invalidate user-related queries
        queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      }
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const userService = createUserService(false);

  return useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: (success, userId) => {
      if (success) {
        // Remove from cache and invalidate lists
        queryClient.removeQueries({ queryKey: userKeys.detail(userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      }
    },
  });
}

export function useUpdateLastSeen() {
  const userService = createUserService(false);

  return useMutation({
    mutationFn: (userId: string) => userService.updateLastSeen(userId),
    // Don't invalidate queries for this mutation as it's called frequently
  });
}