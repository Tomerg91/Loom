import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useUserProfile, useDashboardSummary } from '../dashboard';

// Unmock TanStack Query for this test
vi.unmock('@tanstack/react-query');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'QueryClientProviderWrapper';
  return Wrapper;
};

describe('Dashboard Queries', () => {
  beforeEach(() => {
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  it('useUserProfile returns user data', async () => {
    const mockUserProfile = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: 'https://example.com/avatar.jpg',
      language: 'en',
    };

    const mockFetch = global.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserProfile,
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toHaveProperty('name');
    expect(result.current.data).toHaveProperty('email');
    expect(result.current.data?.name).toBe('Test User');
    expect(result.current.data?.email).toBe('test@example.com');
  });

  it('useDashboardSummary returns summary data', async () => {
    const mockDashboardSummary = {
      actions: [
        { id: '1', title: 'Complete profile', count: 1 },
        { id: '2', title: 'Schedule session', count: 3 },
      ],
      stats: { active_clients: 5, upcoming_sessions: 2 },
    };

    const mockFetch = global.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardSummary,
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toHaveProperty('actions');
    expect(result.current.data?.actions).toHaveLength(2);
    expect(result.current.data?.stats).toHaveProperty('active_clients');
  });
});
