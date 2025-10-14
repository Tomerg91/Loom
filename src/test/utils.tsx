/* eslint-disable import/no-extraneous-dependencies */
import {
  QueryClient,
  QueryClientProvider,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import { User } from '@/types';

import {
  mockUseQuery,
  mockUseMutation,
  mockUseQueryClient,
  mockQueryClient,
} from './setup';

// Re-export the mock functions from setup so tests can import them
export { mockUseQuery, mockUseMutation, mockUseQueryClient, mockQueryClient };

// Mock user data
export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'client',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  avatarUrl: undefined,
  language: 'en',
  status: 'active',
};

export const mockCoachUser: User = {
  ...mockUser,
  id: 'test-coach-id',
  email: 'coach@example.com',
  firstName: 'Test',
  lastName: 'Coach',
  role: 'coach',
};

export const mockAdminUser: User = {
  ...mockUser,
  id: 'test-admin-id',
  email: 'admin@example.com',
  firstName: 'Test',
  lastName: 'Admin',
  role: 'admin',
};

// Mock auth store
export const mockAuthStore = {
  user: mockUser,
  isLoading: false,
  setUser: vi.fn(),
  clearUser: vi.fn(),
  updateUser: vi.fn(),
};

// Mock Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockSupabaseClient: any = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
  storage: {
    from: vi.fn().mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  locale?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    locale: _locale = 'en',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Create a test QueryClient that uses actual React Query but with test-friendly defaults
export const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// Mock API responses
export const mockApiResponse = {
  success: <T,>(data: T) => ({
    data,
    success: true,
    error: null,
  }),
  error: (message: string, status = 400) => ({
    data: null,
    success: false,
    error: message,
    status,
  }),
};

// Mock fetch responses
export const mockFetchResponse = {
  ok: true,
  status: 200,
  json: vi.fn(),
  text: vi.fn(),
  blob: vi.fn(),
  arrayBuffer: vi.fn(),
  headers: new Headers(),
};

// Helper to mock fetch with specific responses
export const mockFetch = (response: unknown) => {
  global.fetch = vi.fn().mockResolvedValue({
    ...mockFetchResponse,
    json: vi.fn().mockResolvedValue(response),
  });
};

// Test data factories
export const createMockSession = (overrides = {}) => ({
  id: 'test-session-id',
  title: 'Test Session',
  description: 'A test coaching session',
  scheduledAt: new Date().toISOString(),
  duration: 60,
  durationMinutes: 60,
  status: 'scheduled' as const,
  type: 'individual' as const,
  coachId: 'test-coach-id',
  clientId: 'test-client-id',
  coach: mockCoachUser,
  client: mockUser,
  sessionUrl: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockNotification = (overrides = {}) => ({
  id: 'test-notification-id',
  userId: 'test-user-id',
  type: 'session_reminder' as const,
  title: 'Session Reminder',
  message: 'Your session starts in 1 hour',
  data: { sessionId: 'test-session-id' },
  readAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockNote = (overrides = {}) => ({
  id: 'test-note-id',
  coachId: 'test-coach-id',
  clientId: 'test-client-id',
  sessionId: 'test-session-id',
  title: 'Test Note',
  content: 'This is a test note',
  privacyLevel: 'private' as const,
  tags: ['test', 'note'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockReflection = (overrides = {}) => ({
  id: 'test-reflection-id',
  clientId: 'test-client-id',
  sessionId: 'test-session-id',
  content: 'This is a test reflection',
  moodRating: 8,
  insights: 'Test insights',
  goalsForNextSession: 'Test goals',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Utility functions for creating mock hook return values
export const createMockQueryResult = <TData = unknown, TError = unknown>(
  data: TData,
  options: Partial<{
    isLoading: boolean;
    isError: boolean;
    error: TError | null;
    isPending: boolean;
    isSuccess: boolean;
  }> = {}
): UseQueryResult<TData, TError> => {
  const isError = options.isError ?? false;
  const isPending = options.isPending ?? options.isLoading ?? false;
  const isSuccess = options.isSuccess ?? (!isError && !isPending);

  return {
    data: isSuccess ? data : undefined,
    error: isError
      ? (options.error ?? (new Error('Mock error') as TError))
      : null,
    isError,
    isLoading: isPending, // For backward compatibility
    isPending,
    isSuccess,
    isLoadingError: isError && isPending,
    isRefetchError: false,
    status: isError ? 'error' : isPending ? 'pending' : 'success',
    fetchStatus: isPending ? 'fetching' : 'idle',
    isPaused: false,
    isFetching: isPending,
    isFetched: !isPending,
    isFetchedAfterMount: !isPending,
    isRefetching: false,
    isStale: false,
    isPlaceholderData: false,
    failureCount: isError ? 1 : 0,
    failureReason: isError
      ? (options.error ?? (new Error('Mock error') as TError))
      : null,
    errorUpdateCount: isError ? 1 : 0,
    dataUpdatedAt: isSuccess ? Date.now() : 0,
    errorUpdatedAt: isError ? Date.now() : 0,
    refetch: vi.fn().mockResolvedValue({} as UseQueryResult<TData, TError>),
    promise: Promise.resolve(data as TData),
    isInitialLoading: isPending,
    isEnabled: true,
  } as unknown as UseQueryResult<TData, TError>;
};

export const createMockMutationResult = <
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
  TContext = unknown,
>(
  data: TData | null = null,
  options: Partial<{
    mutate: ReturnType<typeof vi.fn>;
    isPending: boolean;
    isError: boolean;
    error: TError | null;
    isSuccess: boolean;
    onSuccess?: (data: TData) => void;
  }> = {}
): UseMutationResult<TData, TError, TVariables, TContext> => {
  const isError = options.isError ?? false;
  const isPending = options.isPending ?? false;
  const isSuccess = options.isSuccess ?? false;
  const isIdle = !isPending && !isSuccess && !isError;

  return {
    mutate: options.mutate ?? vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(data),
    data: isSuccess ? data : undefined,
    error: isError
      ? (options.error ?? (new Error('Mock mutation error') as TError))
      : null,
    isError,
    isPending,
    isSuccess,
    isIdle,
    status: isError
      ? 'error'
      : isPending
        ? 'pending'
        : isSuccess
          ? 'success'
          : 'idle',
    variables: undefined,
    failureCount: isError ? 1 : 0,
    failureReason: isError
      ? (options.error ?? (new Error('Mock mutation error') as TError))
      : null,
    reset: vi.fn(),
    submittedAt: isSuccess || isError ? Date.now() : 0,
    context: undefined as TContext | undefined,
    isPaused: false,
  } as UseMutationResult<TData, TError, TVariables, TContext>;
};

// Wait for async operations
export const waitForNextTick = () =>
  new Promise(resolve => setTimeout(resolve, 0));

// Mock window methods
export const mockWindowMethods = () => {
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    },
    writable: true,
  });

  Object.defineProperty(window, 'history', {
    value: {
      pushState: vi.fn(),
      replaceState: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
    },
    writable: true,
  });
};

// Mock local storage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
};

// Setup test environment
export const setupTestEnvironment = () => {
  mockWindowMethods();
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage(),
    writable: true,
  });
};

export * from '@testing-library/react';
export { vi } from 'vitest';
