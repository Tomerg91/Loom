import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSessionService } from '@/lib/database';
import type { Session, SessionStatus } from '@/types';

// Query keys
export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...sessionKeys.lists(), { filters }] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  detail: (id: string) => [...sessionKeys.details(), id] as const,
  upcoming: (userId: string) => [...sessionKeys.all, 'upcoming', userId] as const,
  coach: (coachId: string) => [...sessionKeys.all, 'coach', coachId] as const,
  client: (clientId: string) => [...sessionKeys.all, 'client', clientId] as const,
  between: (coachId: string, clientId: string) => [...sessionKeys.all, 'between', coachId, clientId] as const,
  availability: (coachId: string, date: string) => [...sessionKeys.all, 'availability', coachId, date] as const,
  search: (query: string, userId?: string, status?: SessionStatus) => 
    [...sessionKeys.all, 'search', { query, userId, status }] as const,
};

// Hooks
export function useSession(sessionId: string) {
  const sessionService = createSessionService(false);
  
  return useQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: () => sessionService.getSession(sessionId),
    enabled: !!sessionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUpcomingSessions(userId: string) {
  const sessionService = createSessionService(false);
  
  return useQuery({
    queryKey: sessionKeys.upcoming(userId),
    queryFn: () => sessionService.getUpcomingSessions(userId),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

export function useCoachSessions(coachId: string, limit = 50) {
  const sessionService = createSessionService(false);
  
  return useQuery({
    queryKey: sessionKeys.coach(coachId),
    queryFn: () => sessionService.getCoachSessions(coachId, limit),
    enabled: !!coachId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useClientSessions(clientId: string, limit = 50) {
  const sessionService = createSessionService(false);
  
  return useQuery({
    queryKey: sessionKeys.client(clientId),
    queryFn: () => sessionService.getClientSessions(clientId, limit),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSessionsBetweenUsers(coachId: string, clientId: string) {
  const sessionService = createSessionService(false);
  
  return useQuery({
    queryKey: sessionKeys.between(coachId, clientId),
    queryFn: () => sessionService.getSessionsBetweenUsers(coachId, clientId),
    enabled: !!coachId && !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTimeSlotAvailability(coachId: string, startTime: Date, durationMinutes = 60) {
  const sessionService = createSessionService(false);
  
  return useQuery({
    queryKey: [...sessionKeys.availability(coachId, startTime.toISOString()), durationMinutes],
    queryFn: () => sessionService.isTimeSlotAvailable(coachId, startTime, durationMinutes),
    enabled: !!coachId && !!startTime,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useAvailableTimeSlots(coachId: string, date: Date, slotDuration = 60) {
  const sessionService = createSessionService(false);
  
  return useQuery({
    queryKey: sessionKeys.availability(coachId, date.toISOString().split('T')[0]),
    queryFn: () => sessionService.getAvailableTimeSlots(coachId, date, slotDuration),
    enabled: !!coachId && !!date,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSearchSessions(query: string, userId?: string, status?: SessionStatus) {
  const sessionService = createSessionService(false);
  
  return useQuery({
    queryKey: sessionKeys.search(query, userId, status),
    queryFn: () => sessionService.searchSessions(query, userId, status),
    enabled: query.length >= 2, // Only search if query is at least 2 characters
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Mutations
export function useCreateSession() {
  const queryClient = useQueryClient();
  const sessionService = createSessionService(false);

  return useMutation({
    mutationFn: (sessionData: {
      coachId: string;
      clientId: string;
      title: string;
      description?: string;
      scheduledAt: Date;
      durationMinutes?: number;
    }) => sessionService.createSession(sessionData),
    onSuccess: (data, variables) => {
      if (data) {
        // Add to upcoming sessions for both coach and client
        queryClient.invalidateQueries({ queryKey: sessionKeys.upcoming(variables.coachId) });
        queryClient.invalidateQueries({ queryKey: sessionKeys.upcoming(variables.clientId) });
        
        // Invalidate coach and client session lists
        queryClient.invalidateQueries({ queryKey: sessionKeys.coach(variables.coachId) });
        queryClient.invalidateQueries({ queryKey: sessionKeys.client(variables.clientId) });
        
        // Invalidate availability
        const date = variables.scheduledAt.toISOString().split('T')[0];
        queryClient.invalidateQueries({ 
          queryKey: sessionKeys.availability(variables.coachId, date) 
        });
      }
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  const sessionService = createSessionService(false);

  return useMutation({
    mutationFn: ({ sessionId, updates }: { sessionId: string; updates: Partial<Session> }) =>
      sessionService.updateSession(sessionId, updates),
    onSuccess: (data, { sessionId, updates }) => {
      if (data) {
        // Update the session cache
        queryClient.setQueryData(sessionKeys.detail(sessionId), data);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: sessionKeys.upcoming(data.coachId) });
        queryClient.invalidateQueries({ queryKey: sessionKeys.upcoming(data.clientId) });
        queryClient.invalidateQueries({ queryKey: sessionKeys.coach(data.coachId) });
        queryClient.invalidateQueries({ queryKey: sessionKeys.client(data.clientId) });
        
        // Invalidate availability if scheduled time changed
        if (updates.scheduledAt) {
          const date = new Date(updates.scheduledAt).toISOString().split('T')[0];
          queryClient.invalidateQueries({ 
            queryKey: sessionKeys.availability(data.coachId, date) 
          });
        }
      }
    },
  });
}

export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();
  const sessionService = createSessionService(false);

  return useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: string; status: SessionStatus }) =>
      sessionService.updateSessionStatus(sessionId, status),
    onSuccess: (success, { sessionId }) => {
      if (success) {
        // Invalidate session and related queries
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
        queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      }
    },
  });
}

export function useCancelSession() {
  const queryClient = useQueryClient();
  const sessionService = createSessionService(false);

  return useMutation({
    mutationFn: (sessionId: string) => sessionService.cancelSession(sessionId),
    onSuccess: (success, sessionId) => {
      if (success) {
        // Invalidate session and related queries
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
        queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      }
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();
  const sessionService = createSessionService(false);

  return useMutation({
    mutationFn: ({ sessionId, notes }: { sessionId: string; notes?: string }) =>
      sessionService.completeSession(sessionId, notes),
    onSuccess: (success, { sessionId }) => {
      if (success) {
        // Invalidate session and related queries
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
        queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      }
    },
  });
}