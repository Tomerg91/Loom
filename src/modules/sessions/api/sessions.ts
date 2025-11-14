/**
 * @fileoverview React Query hooks that wrap the session scheduling API
 * endpoints. The hooks share cache keys so dashboard widgets, calendar views,
 * and modal workflows stay in sync after booking or rescheduling actions.
 */

'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

import type {
  SessionCalendarEntry,
  SessionMutationResult,
  SessionRequestSummary,
  SessionSchedulingRequest,
  SessionUpdatePayload,
} from '@/modules/sessions/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface CalendarQueryOptions {
  start?: string;
  end?: string;
  limit?: number;
}

const SESSION_API_ENDPOINT = '/api/sessions';

export const sessionKeys = {
  all: ['sessions'] as const,
  calendar: (params: CalendarQueryOptions = {}) =>
    [
      ...sessionKeys.all,
      'calendar',
      params.start ?? null,
      params.end ?? null,
      params.limit ?? null,
    ] as const,
  requests: () => [...sessionKeys.all, 'requests'] as const,
};

const buildQueryString = (
  params: Record<string, string | number | undefined>
) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    search.set(key, String(value));
  });
  return search.toString();
};

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage =
      errorBody?.error ?? 'Failed to communicate with the server.';
    throw new Error(errorMessage);
  }

  const json = (await response.json()) as ApiResponse<T>;
  return json.data;
}

export const useSessionCalendar = (
  options?: CalendarQueryOptions,
  queryOptions?: UseQueryOptions<SessionCalendarEntry[], Error>
) => {
  const params = options ?? {};

  return useQuery({
    queryKey: sessionKeys.calendar(params),
    queryFn: async () => {
      const queryString = buildQueryString({ view: 'calendar', ...params });
      const data = await fetchJson<{
        sessions: SessionCalendarEntry[] | undefined;
      }>(
        queryString
          ? `${SESSION_API_ENDPOINT}?${queryString}`
          : SESSION_API_ENDPOINT
      );
      return data.sessions ?? [];
    },
    staleTime: 60_000,
    ...queryOptions,
  });
};

export const useSessionRequests = (
  queryOptions?: UseQueryOptions<SessionRequestSummary[], Error>
) =>
  useQuery({
    queryKey: sessionKeys.requests(),
    queryFn: async () => {
      const data = await fetchJson<{
        requests: SessionRequestSummary[] | undefined;
      }>(`${SESSION_API_ENDPOINT}?${buildQueryString({ view: 'requests' })}`);
      return data.requests ?? [];
    },
    staleTime: 30_000,
    ...queryOptions,
  });

type CreateSessionMutationOptions = UseMutationOptions<
  SessionMutationResult,
  Error,
  SessionSchedulingRequest
>;

type UpdateSessionMutationOptions = UseMutationOptions<
  SessionMutationResult,
  Error,
  { sessionId: string; input: SessionUpdatePayload }
>;

export const useCreateSessionRequest = (
  options?: CreateSessionMutationOptions
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SessionSchedulingRequest) =>
      fetchJson<SessionMutationResult>(SESSION_API_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    async onSuccess(result, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.requests() }),
      ]);
      await options?.onSuccess?.(result, variables, context);
      return result;
    },
    ...options,
  });
};

export const useUpdateSession = (options?: UpdateSessionMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, input }) =>
      fetchJson<SessionMutationResult>(`${SESSION_API_ENDPOINT}/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    async onSuccess(result, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.requests() }),
      ]);
      await options?.onSuccess?.(result, variables, context);
      return result;
    },
    ...options,
  });
};

interface ApproveSessionRequestInput {
  requestId: string;
  meetingUrl?: string;
  notes?: string;
}

type ApproveSessionMutationOptions = UseMutationOptions<
  SessionMutationResult,
  Error,
  ApproveSessionRequestInput
>;

export const useApproveSessionRequest = (
  options?: ApproveSessionMutationOptions
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, meetingUrl, notes }) =>
      fetchJson<SessionMutationResult>(
        `/api/sessions/requests/${requestId}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ meetingUrl, notes }),
        }
      ),
    async onSuccess(result, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.requests() }),
      ]);
      await options?.onSuccess?.(result, variables, context);
      return result;
    },
    ...options,
  });
};

interface DeclineSessionRequestInput {
  requestId: string;
  reason?: string;
}

type DeclineSessionMutationOptions = UseMutationOptions<
  { id: string; status: string },
  Error,
  DeclineSessionRequestInput
>;

export const useDeclineSessionRequest = (
  options?: DeclineSessionMutationOptions
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, reason }) =>
      fetchJson<{ id: string; status: string }>(
        `/api/sessions/requests/${requestId}/decline`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      ),
    async onSuccess(result, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.requests() }),
      ]);
      await options?.onSuccess?.(result, variables, context);
      return result;
    },
    ...options,
  });
};
