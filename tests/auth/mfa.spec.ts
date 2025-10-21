import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST as signInPost } from '@/app/api/auth/signin/route';
import { POST as mfaCompletePost } from '@/app/api/auth/mfa/complete/route';

const createServerClientWithRequestMock = vi.hoisted(() => vi.fn());
const signInMock = vi.hoisted(() => vi.fn());
const getCurrentUserMock = vi.hoisted(() => vi.fn());
const requiresMfaMock = vi.hoisted(() => vi.fn());
const getMfaStatusMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createServerClientWithRequest: createServerClientWithRequestMock,
}));

vi.mock('@/lib/auth/auth', () => ({
  createAuthService: vi.fn(() => ({
    signIn: signInMock,
    getCurrentUser: getCurrentUserMock,
  })),
}));

const createMfaServiceFactory = () => ({
  requiresMFA: requiresMfaMock,
  getMFAStatus: getMfaStatusMock,
});

vi.mock('@/lib/services/mfa-service', () => ({
  createMfaService: vi.fn(() => createMfaServiceFactory()),
  createMFAService: vi.fn(() => createMfaServiceFactory()),
  getClientIP: vi.fn(() => '127.0.0.1'),
  getUserAgent: vi.fn(() => 'TestAgent'),
}));

const mockUser = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  email: 'user@example.com',
  role: 'coach',
  firstName: 'Casey',
  lastName: 'Smith',
  avatarUrl: null,
  language: 'en',
  status: 'active',
  lastSeenAt: '2024-01-01T00:00:00.000Z',
  onboardingStatus: 'completed',
  onboardingStep: 4,
  onboardingCompletedAt: '2024-01-05T00:00:00.000Z',
  mfaEnabled: true,
};

const mockSession = {
  accessToken: 'api-access-token',
  refreshToken: 'api-refresh-token',
  expiresAt: 1700000000,
};

const baseHeaders = { 'Content-Type': 'application/json' };
let latestSupabaseAuth: {
  getSession: ReturnType<typeof vi.fn>;
  refreshSession: ReturnType<typeof vi.fn>;
  setSession: ReturnType<typeof vi.fn>;
} | null = null;

describe('authentication MFA cookie propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestSupabaseAuth = null;

    createServerClientWithRequestMock.mockImplementation((_request, response) => {
      response.cookies.set({
        name: 'sb-access-token',
        value: 'initial-access',
        path: '/',
        httpOnly: true,
      });
      response.cookies.set({
        name: 'sb-refresh-token',
        value: 'initial-refresh',
        path: '/',
        httpOnly: true,
      });

      const auth = {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'initial-access',
              refresh_token: 'initial-refresh',
              expires_at: 111,
            },
          },
          error: null,
        }),
        refreshSession: vi.fn().mockImplementation(async () => {
          response.cookies.set({
            name: 'sb-access-token',
            value: 'refreshed-access',
            path: '/',
            httpOnly: true,
          });
          response.cookies.set({
            name: 'sb-refresh-token',
            value: 'refreshed-refresh',
            path: '/',
            httpOnly: true,
          });

          return {
            data: {
              session: {
                access_token: 'refreshed-access',
                refresh_token: 'refreshed-refresh',
                expires_at: 222,
              },
            },
            error: null,
          };
        }),
        setSession: vi.fn(),
      };

      latestSupabaseAuth = auth;
      return { auth } as unknown as ReturnType<typeof createServerClientWithRequestMock>;
    });

    requiresMfaMock.mockResolvedValue(false);
    getMfaStatusMock.mockResolvedValue({ backupCodesRemaining: 3 });

    signInMock.mockResolvedValue({
      user: mockUser,
      error: null,
      session: mockSession,
    });

    getCurrentUserMock.mockResolvedValue(mockUser);
  });

  it('forwards Supabase cookies on non-MFA sign-in', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'ValidPass1!',
        rememberMe: true,
      }),
    });

    const response = await signInPost(request);
    const payload = await response.json();

    expect(response.cookies.get('sb-access-token')?.value).toBe('initial-access');
    expect(response.cookies.get('sb-refresh-token')?.value).toBe('initial-refresh');
    expect(payload.data.session).toEqual({
      accessToken: mockSession.accessToken,
      refreshToken: mockSession.refreshToken,
      expiresAt: mockSession.expiresAt,
    });
  });

  it('includes session tokens when MFA is required', async () => {
    requiresMfaMock.mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'ValidPass1!',
        rememberMe: false,
      }),
    });

    const response = await signInPost(request);
    const payload = await response.json();

    expect(payload.data.requiresMFA).toBe(true);
    expect(payload.data.session).toEqual({
      accessToken: mockSession.accessToken,
      refreshToken: mockSession.refreshToken,
      expiresAt: mockSession.expiresAt,
    });
    expect(response.cookies.get('sb-access-token')?.value).toBe('initial-access');
    expect(response.cookies.get('sb-refresh-token')?.value).toBe('initial-refresh');
  });

  it('refreshes Supabase cookies during MFA completion', async () => {
    getMfaStatusMock.mockResolvedValue({ backupCodesRemaining: 1 });

    const request = new NextRequest('http://localhost:3000/api/auth/mfa/complete', {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ userId: mockUser.id }),
    });

    const response = await mfaCompletePost(request);
    const payload = await response.json();

    expect(latestSupabaseAuth?.refreshSession).toHaveBeenCalledTimes(1);
    expect(response.cookies.get('sb-access-token')?.value).toBe('refreshed-access');
    expect(response.cookies.get('sb-refresh-token')?.value).toBe('refreshed-refresh');
    expect(response.cookies.get('mfa_pending')?.value).toBe('');
    expect(payload.data.session).toEqual({
      accessToken: 'refreshed-access',
      refreshToken: 'refreshed-refresh',
      expiresAt: 222,
    });
    expect(payload.data.user.id).toBe(mockUser.id);
    expect(payload.data.mfa.backupCodesRemaining).toBe(1);
  });
});
