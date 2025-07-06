import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import en from '@/messages/en.json';
import { User } from '@/types';

// Mock user data
export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'client',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  emailVerified: true,
  isActive: true,
  avatarUrl: null,
  phoneNumber: undefined,
  dateOfBirth: undefined,
  preferences: {
    language: 'en',
    notifications: {
      email: true,
      push: true,
      inApp: true,
    },
    theme: 'light',
  },
  metadata: {},
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
export const mockSupabaseClient = {
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
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  locale?: string;
  user?: User | null;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    }),
    locale = 'en',
    user = mockUser,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale={locale} messages={en}>
          {children}
        </NextIntlClientProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock API responses
export const mockApiResponse = {
  success: <T>(data: T) => ({
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

// Mock TanStack Query hooks
export const mockUseQuery = <T>(data: T, options: Partial<{ isLoading: boolean; isError: boolean; error: Error | null }> = {}) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...options,
});

export const mockUseMutation = (data: unknown = null, options: Partial<{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null }> = {}) => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
  data,
  ...options,
});

// Wait for async operations
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

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