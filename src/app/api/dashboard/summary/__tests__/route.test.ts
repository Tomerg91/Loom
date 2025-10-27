import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../route';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('GET /api/dashboard/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dashboard summary data', async () => {
    const { createClient } = await import('@/lib/supabase/server');

    // Mock authenticated user and successful data fetch
    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'actions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    { id: '1', title: 'Review pending tasks', count: 5 },
                    { id: '2', title: 'Schedule sessions', count: 3 },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'user_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    active_clients: 10,
                    upcoming_sessions: 5,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('actions');
    expect(data).toHaveProperty('stats');
    expect(data.actions).toHaveLength(2);
    expect(data.stats.active_clients).toBe(10);
    expect(data.stats.upcoming_sessions).toBe(5);
  });

  it('returns 401 if not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server');

    // Mock unauthenticated user
    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

    const response = await GET();

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 500 if database query fails', async () => {
    const { createClient } = await import('@/lib/supabase/server');

    // Mock authenticated user but failed data fetch
    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

    const response = await GET();

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch summary');
  });

  it('includes cache headers in response', async () => {
    const { createClient } = await import('@/lib/supabase/server');

    // Mock authenticated user and successful data fetch
    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'actions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'user_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    active_clients: 0,
                    upcoming_sessions: 0,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

    const response = await GET();

    expect(response.status).toBe(200);
    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toBe('public, max-age=30');
  });
});
