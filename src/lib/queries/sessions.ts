'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost, apiRequest } from '@/lib/api/client-api-request';
import { createSessionService } from '@/lib/database';
import type {
  Session,
  SessionStatus,
  SessionListOptions,
  SessionRating,
  SessionRescheduleRequest,
  SessionCancellation,
  SessionAttachment,
  SessionProgressNote
} from '@/types';

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
  attachments: (sessionId: string) => [...sessionKeys.all, 'attachments', sessionId] as const,
  progressNotes: (sessionId: string) => [...sessionKeys.all, 'progressNotes', sessionId] as const,
  ratings: (sessionId: string) => [...sessionKeys.all, 'ratings', sessionId] as const,
  history: (clientId: string) => [...sessionKeys.all, 'history', clientId] as const,
  analytics: (userId: string, dateRange: { from: Date; to: Date }) => 
    [...sessionKeys.all, 'analytics', userId, dateRange] as const,
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

// Enhanced session list with comprehensive filtering
export function useFilteredSessions(clientId: string, options: SessionListOptions = {}) {
  return useQuery({
    queryKey: sessionKeys.list({ clientId, ...options }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('clientId', clientId);
      
      if (options.filters?.status?.length) {
        options.filters.status.forEach(status => params.append('status', status));
      }
      
      if (options.filters?.dateRange) {
        params.append('dateFrom', options.filters.dateRange.from.toISOString());
        params.append('dateTo', options.filters.dateRange.to.toISOString());
      }
      
      if (options.filters?.coachId) {
        params.append('coachId', options.filters.coachId);
      }
      
      if (options.filters?.sessionType?.length) {
        options.filters.sessionType.forEach(type => params.append('sessionType', type));
      }
      
      if (options.filters?.search) {
        params.append('search', options.filters.search);
      }
      
      if (options.sortBy) {
        params.append('sortBy', options.sortBy);
      }
      
      if (options.sortOrder) {
        params.append('sortOrder', options.sortOrder);
      }
      
      if (options.page) {
        params.append('page', options.page.toString());
      }
      
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }
      
      return apiGet(`/api/sessions?${params}`);
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Session attachments
export function useSessionAttachments(sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.attachments(sessionId),
    queryFn: (): Promise<SessionAttachment[]> => apiGet(`/api/sessions/${sessionId}/files`),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Session progress notes
export function useSessionProgressNotes(sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.progressNotes(sessionId),
    queryFn: (): Promise<SessionProgressNote[]> => apiGet(`/api/sessions/${sessionId}/notes`),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Session history for analytics
export function useSessionHistory(clientId: string, dateRange?: { from: Date; to: Date }) {
  return useQuery({
    queryKey: dateRange ? sessionKeys.analytics(clientId, dateRange) : sessionKeys.history(clientId),
    queryFn: () => {
      const params = new URLSearchParams({ clientId });
      if (dateRange) {
        params.append('from', dateRange.from.toISOString());
        params.append('to', dateRange.to.toISOString());
      }

      return apiGet(`/api/sessions/analytics?${params}`);
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000, // 10 minutes
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

// Keep the existing simple cancel session for backward compatibility
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

// Enhanced mutations
export function useRescheduleSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SessionRescheduleRequest) =>
      apiPost(`/api/sessions/${data.sessionId}/reschedule`, data),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}

export function useRateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rating: Omit<SessionRating, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiPost(`/api/sessions/${rating.sessionId}/rate`, rating),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.ratings(sessionId) });
    },
  });
}

export function useAddProgressNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (note: Omit<SessionProgressNote, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiPost(`/api/sessions/${note.sessionId}/notes`, note),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.progressNotes(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
  });
}

export function useUploadSessionFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      file,
      description
    }: {
      sessionId: string;
      file: File;
      description?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      // Use apiRequest for FormData (not apiPost, as FormData requires special handling)
      const response = await apiRequest(`/api/sessions/${sessionId}/files`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload file');
      }

      return response.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.attachments(sessionId) });
    },
  });
}

export function useCancelSessionWithPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cancellation: SessionCancellation) =>
      apiPost(`/api/sessions/${cancellation.sessionId}/cancel`, cancellation),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}