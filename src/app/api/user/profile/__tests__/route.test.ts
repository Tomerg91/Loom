import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../route';

// Mock dependencies
vi.mock('@/lib/services/auth-service', () => ({
  authService: {
    getSession: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

describe('GET /api/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user profile data for authenticated user', async () => {
    const { authService } = await import('@/lib/services/auth-service');
    const { createServerClient } = await import('@/lib/supabase/server');

    // Mock authenticated session
    vi.mocked(authService.getSession).mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'client',
        createdAt: '2024-01-01T00:00:00Z',
      },
    });

    // Mock Supabase client
    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-user-id',
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User',
                avatar_url: 'https://example.com/avatar.jpg',
                language: 'en',
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any);

    const request = new NextRequest(
      new URL('http://localhost:3000/api/user/profile')
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    expect(data.data).toHaveProperty('email');
    expect(data.data.id).toBe('test-user-id');
    expect(data.data.email).toBe('test@example.com');
  });

  it('returns 401 if not authenticated', async () => {
    const { authService } = await import('@/lib/services/auth-service');

    // Mock unauthenticated session
    vi.mocked(authService.getSession).mockResolvedValue(null);

    const request = new NextRequest(
      new URL('http://localhost:3000/api/user/profile')
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('returns 500 if database query fails', async () => {
    const { authService } = await import('@/lib/services/auth-service');
    const { createServerClient } = await import('@/lib/supabase/server');

    // Mock authenticated session
    vi.mocked(authService.getSession).mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'client',
        createdAt: '2024-01-01T00:00:00Z',
      },
    });

    // Mock Supabase client with error
    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any);

    const request = new NextRequest(
      new URL('http://localhost:3000/api/user/profile')
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('includes cache headers in response', async () => {
    const { authService } = await import('@/lib/services/auth-service');
    const { createServerClient } = await import('@/lib/supabase/server');

    // Mock authenticated session
    vi.mocked(authService.getSession).mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'client',
        createdAt: '2024-01-01T00:00:00Z',
      },
    });

    // Mock Supabase client
    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-user-id',
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User',
                language: 'en',
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any);

    const request = new NextRequest(
      new URL('http://localhost:3000/api/user/profile')
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toContain('max-age');
  });
});
