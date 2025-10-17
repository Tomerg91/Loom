import type { Session } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionContext } from '@/modules/auth/server/session';

const getSessionContextMock =
  vi.fn<(request: NextRequest) => Promise<SessionContext>>();
const createServerClientWithRequestMock = vi.fn(() => ({
  auth: {
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
  },
}));

vi.mock('next-intl/middleware', () => ({
  default: () => () => {
    const response = NextResponse.next();
    response.headers.set('x-middleware-next', '1');
    return response;
  },
}));

vi.mock('@/modules/auth/server/session', () => ({
  getSessionContext: getSessionContextMock,
}));

vi.mock('@/modules/platform/supabase/server', () => ({
  createServerClientWithRequest: createServerClientWithRequestMock,
}));

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MIDDLEWARE_AUTH_ENABLED = 'true';
  });

  const baseContext: SessionContext = {
    session: null,
    user: null,
    role: null,
    mfaEnabled: false,
    mfaVerified: false,
  };

  function stubSessionContext(overrides: Partial<SessionContext>) {
    getSessionContextMock.mockResolvedValue({
      ...baseContext,
      ...overrides,
    });
  }

  it('redirects unauthenticated visitors to the locale-aware login page', async () => {
    stubSessionContext({});

    const { middleware } = await import('@/middleware');
    const request = new NextRequest('http://localhost:3000/en/dashboard');
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/en/auth/signin?redirectTo=%2Fen%2Fdashboard'
    );
  });

  it('routes authenticated coaches to the coach dashboard when visiting /dashboard', async () => {
    const session = { user: { id: '123' } } as unknown as Session;
    stubSessionContext({
      session,
      user: session.user,
      role: 'coach',
      mfaEnabled: false,
      mfaVerified: true,
    });

    const { middleware } = await import('@/middleware');
    const request = new NextRequest('http://localhost:3000/en/dashboard');
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/en/coach'
    );
  });

  it('prevents coaches from loading admin routes', async () => {
    const session = { user: { id: '123' } } as unknown as Session;
    stubSessionContext({
      session,
      user: session.user,
      role: 'coach',
      mfaEnabled: false,
      mfaVerified: true,
    });

    const { middleware } = await import('@/middleware');
    const request = new NextRequest('http://localhost:3000/en/admin');
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/en/coach'
    );
  });

  it('forces MFA verification when the pending cookie is present', async () => {
    const session = { user: { id: '123' } } as unknown as Session;
    stubSessionContext({
      session,
      user: session.user,
      role: 'coach',
      mfaEnabled: true,
      mfaVerified: false,
    });

    const { middleware } = await import('@/middleware');
    const request = new NextRequest('http://localhost:3000/en/settings', {
      headers: { cookie: 'mfa_pending=true' },
    });
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/en/auth/mfa-verify?redirectTo=%2Fen%2Fsettings'
    );
  });
});
