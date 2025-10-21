import { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '@/lib/auth/auth';
import { POST } from '@/app/api/auth/signin/route';
import {
  DEFAULT_SESSION_MAX_AGE,
  REMEMBER_ME_SESSION_MAX_AGE,
} from '@/lib/auth/auth';

const mocks = vi.hoisted(() => {
  return {
    applyCorsHeaders: vi.fn((response: Response) => response),
    validateRequestBody: vi.fn(),
    rateLimit: vi.fn(() => (handler: any) => handler),
    withRequestLogging: vi.fn((handler: any) => handler),
    withErrorHandling: vi.fn((handler: any) => handler),
    state: { latestSupabaseResponse: null as NextResponse | null },
    signIn: vi.fn(),
  };
});

vi.mock('@/lib/api/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/utils')>(
    '@/lib/api/utils'
  );
  return {
    ...actual,
    applyCorsHeaders: mocks.applyCorsHeaders,
    validateRequestBody: mocks.validateRequestBody,
    rateLimit: mocks.rateLimit,
    withRequestLogging: mocks.withRequestLogging,
    withErrorHandling: mocks.withErrorHandling,
  };
});

vi.mock('@/lib/services/mfa-service', () => ({
  createMfaService: vi.fn(() => ({
    requiresMFA: vi.fn().mockResolvedValue(false),
  })),
  createMFAService: vi.fn(() => ({
    requiresMFA: vi.fn().mockResolvedValue(false),
  })),
  getClientIP: vi.fn(() => '127.0.0.1'),
  getUserAgent: vi.fn(() => 'test-agent'),
}));

vi.mock('@/lib/supabase/server', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/server')>(
    '@/lib/supabase/server'
  );
  return {
    ...actual,
    createServerClientWithRequest: vi.fn(
      (_req: NextRequest, res: NextResponse) => {
        mocks.state.latestSupabaseResponse = res;
        return {
          auth: {
            getSession: vi.fn().mockResolvedValue({
              data: {
                session: {
                  access_token: 'access-token',
                  refresh_token: 'refresh-token',
                },
              },
              error: null,
            }),
            setSession: vi.fn().mockResolvedValue({
              data: {
                session: {
                  access_token: 'access-token',
                  refresh_token: 'refresh-token',
                },
              },
              error: null,
            }),
          },
        } as unknown;
      }
    ),
  };
});

vi.mock('@/lib/auth/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/auth')>(
    '@/lib/auth/auth'
  );
  return {
    ...actual,
    createAuthService: vi.fn((_options?: any) => ({
      signIn: mocks.signIn.mockImplementation(async () => {
        const user: AuthUser = {
          id: 'user-123',
          email: 'user@example.com',
          role: 'coach',
          language: 'en',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as AuthUser;

        const response = mocks.state.latestSupabaseResponse;
        response?.cookies.set({
          name: 'sb-access-token',
          value: 'access-token',
          path: '/',
          httpOnly: true,
        });
        response?.cookies.set({
          name: 'sb-refresh-token',
          value: 'refresh-token',
          path: '/',
          httpOnly: true,
        });

        return {
          user,
          error: null,
          session: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
          },
        };
      }),
    })),
  };
});

describe('POST /api/auth/signin remember-me lifetimes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.latestSupabaseResponse = null;
  });

  afterEach(() => {
    mocks.signIn.mockReset();
  });

  const createRequest = (rememberMe: boolean) => {
    const body = JSON.stringify({
      email: 'user@example.com',
      password: 'password123',
      rememberMe,
    });
    return new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  };

  it('sets a short-lived cookie when rememberMe is false', async () => {
    mocks.validateRequestBody.mockReturnValue({
      success: true,
      data: {
        email: 'user@example.com',
        password: 'password123',
        rememberMe: false,
      },
    });

    const request = createRequest(false);
    const response = await POST(request);
    const accessCookie = response.cookies.get('sb-access-token');
    const refreshCookie = response.cookies.get('sb-refresh-token');

    expect(accessCookie?.maxAge).toBe(DEFAULT_SESSION_MAX_AGE);
    expect(refreshCookie?.maxAge).toBe(DEFAULT_SESSION_MAX_AGE);

    const now = Date.now();
    const expectedMs = DEFAULT_SESSION_MAX_AGE * 1000;
    const accessExpires = accessCookie?.expires
      ? new Date(accessCookie.expires).getTime()
      : undefined;
    const refreshExpires = refreshCookie?.expires
      ? new Date(refreshCookie.expires).getTime()
      : undefined;
    const accessDelta = accessExpires ? accessExpires - now : undefined;
    const refreshDelta = refreshExpires ? refreshExpires - now : undefined;

    expect(accessDelta).toBeDefined();
    expect(refreshDelta).toBeDefined();
    expect(Math.abs((accessDelta ?? 0) - expectedMs)).toBeLessThan(5000);
    expect(Math.abs((refreshDelta ?? 0) - expectedMs)).toBeLessThan(5000);
  });

  it('extends the cookie lifetime when rememberMe is true', async () => {
    mocks.validateRequestBody.mockReturnValue({
      success: true,
      data: {
        email: 'user@example.com',
        password: 'password123',
        rememberMe: true,
      },
    });

    const request = createRequest(true);
    const response = await POST(request);
    const accessCookie = response.cookies.get('sb-access-token');
    const refreshCookie = response.cookies.get('sb-refresh-token');

    expect(accessCookie?.maxAge).toBe(REMEMBER_ME_SESSION_MAX_AGE);
    expect(refreshCookie?.maxAge).toBe(REMEMBER_ME_SESSION_MAX_AGE);

    const now = Date.now();
    const expectedMs = REMEMBER_ME_SESSION_MAX_AGE * 1000;
    const accessExpires = accessCookie?.expires
      ? new Date(accessCookie.expires).getTime()
      : undefined;
    const refreshExpires = refreshCookie?.expires
      ? new Date(refreshCookie.expires).getTime()
      : undefined;
    const accessDelta = accessExpires ? accessExpires - now : undefined;
    const refreshDelta = refreshExpires ? refreshExpires - now : undefined;

    expect(accessDelta).toBeDefined();
    expect(refreshDelta).toBeDefined();
    expect(Math.abs((accessDelta ?? 0) - expectedMs)).toBeLessThan(5000);
    expect(Math.abs((refreshDelta ?? 0) - expectedMs)).toBeLessThan(5000);
  });
});
