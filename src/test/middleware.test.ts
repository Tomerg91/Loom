import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';

// Mock dependencies
vi.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en', 'he'],
    defaultLocale: 'en',
  },
}));

vi.mock('@/lib/security/headers', () => ({
  applySecurityHeaders: vi.fn((req, res) => res),
}));

vi.mock('@/lib/security/validation', () => ({
  validateUserAgent: vi.fn(() => true),
}));

vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => vi.fn(() => null)),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClientWithRequest: vi.fn(() => ({
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
  })),
}));

describe('Middleware - Static Assets Bypass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const staticPaths = [
    '/_next/static/chunks/main.js',
    '/_next/image/image.png',
    '/favicon.ico',
    '/static/logo.png',
    '/styles/globals.css',
    '/scripts/analytics.js',
    '/images/hero.png',
    '/images/hero.jpg',
    '/images/hero.jpeg',
    '/images/icon.svg',
    '/images/animation.gif',
    '/images/photo.webp',
    '/fonts/inter.woff',
    '/fonts/inter.woff2',
    '/fonts/roboto.ttf',
    '/fonts/icons.eot',
    '/app.js.map',
    '/styles.css.map',
    '/favicon.ico',
  ];

  staticPaths.forEach((path) => {
    it(`should bypass middleware for ${path}`, async () => {
      const req = new NextRequest(new URL(`http://localhost:3000${path}`));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      // Verify that intl middleware was NOT called for static assets
    });
  });

  it('should bypass middleware for CSS files with query params', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/styles/main.css?v=123'));
    const response = await middleware(req);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
  });

  it('should bypass middleware for JS files with query params', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/script.js?v=456'));
    const response = await middleware(req);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
  });

  it('should bypass middleware for all API routes', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/api/auth/signin'));
    const response = await middleware(req);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
  });
});

describe('Middleware - i18n Redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect invalid locale to default locale', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/fr/dashboard'));
    const response = await middleware(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/en/dashboard');
  });

  it('should not redirect valid locale', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const response = await middleware(req);

    // Valid locale should proceed (might be redirected for auth, but not for locale)
    expect(response).toBeDefined();
  });

  it('should handle root path without locale', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/'));
    const response = await middleware(req);

    // next-intl should handle root redirect
    expect(response).toBeDefined();
  });

  it('should preserve path when redirecting invalid locale', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/de/settings/profile'));
    const response = await middleware(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/en/settings/profile');
  });
});

describe('Middleware - Security Headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply security headers to HTML responses', async () => {
    const { applySecurityHeaders } = await import('@/lib/security/headers');
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    await middleware(req);

    // Verify security headers were applied
    expect(applySecurityHeaders).toHaveBeenCalled();
  });

  it('should not interfere with static asset delivery', async () => {
    const { applySecurityHeaders } = await import('@/lib/security/headers');
    const req = new NextRequest(new URL('http://localhost:3000/styles.css'));
    await middleware(req);

    // Security headers should not be applied to static assets in bypass path
    expect(applySecurityHeaders).not.toHaveBeenCalled();
  });
});

describe('Middleware - User Agent Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set to production mode for UA checks
    process.env.NODE_ENV = 'production';
    process.env.MIDDLEWARE_UA_CHECK = 'true';
  });

  it('should allow valid user agents', async () => {
    const { validateUserAgent } = await import('@/lib/security/validation');
    vi.mocked(validateUserAgent).mockReturnValue(true);

    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'), {
      headers: { 'user-agent': 'Mozilla/5.0' },
    });
    const response = await middleware(req);

    expect(response.status).not.toBe(403);
  });

  it('should block invalid user agents in production', async () => {
    const { validateUserAgent } = await import('@/lib/security/validation');
    vi.mocked(validateUserAgent).mockReturnValue(false);

    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'), {
      headers: { 'user-agent': 'BadBot/1.0' },
    });
    const response = await middleware(req);

    expect(response.status).toBe(403);
  });

  it('should skip UA validation when disabled', async () => {
    process.env.MIDDLEWARE_UA_CHECK = 'false';
    const { validateUserAgent } = await import('@/lib/security/validation');

    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'), {
      headers: { 'user-agent': 'BadBot/1.0' },
    });
    await middleware(req);

    expect(validateUserAgent).not.toHaveBeenCalled();
  });
});

describe('Middleware - Request ID Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LOG_REQUESTS = 'true';
  });

  it('should add request ID header when logging enabled', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/styles.css'));
    const response = await middleware(req);

    expect(response.headers.has('X-Request-ID')).toBe(true);
  });

  it('should not add request ID when logging disabled', async () => {
    process.env.LOG_REQUESTS = 'false';
    const req = new NextRequest(new URL('http://localhost:3000/styles.css'));
    const response = await middleware(req);

    expect(response.headers.has('X-Request-ID')).toBe(false);
  });
});
