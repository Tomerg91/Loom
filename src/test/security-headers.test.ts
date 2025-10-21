import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect } from 'vitest';

import { applySecurityHeaders } from '@/lib/security/headers';

describe('Security Headers - Snapshot Tests', () => {
  it('should apply correct security headers to HTML responses', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res = NextResponse.next();
    res.headers.set('content-type', 'text/html');

    const secureRes = applySecurityHeaders(req, res);

    const headers: Record<string, string> = {};
    secureRes.headers.forEach((value, key) => {
      // Normalize nonce values for snapshot testing
      if (key.toLowerCase() === 'content-security-policy') {
        headers[key] = value.replace(/nonce-[a-zA-Z0-9+/=]+/g, 'nonce-NORMALIZED');
      } else {
        headers[key] = value;
      }
    });

    expect(headers).toMatchSnapshot();
  });

  it('should apply correct security headers to JSON API responses', () => {
    const req = new NextRequest(new URL('http://localhost:3000/api/sessions'));
    const res = NextResponse.json({ data: [] });

    const secureRes = applySecurityHeaders(req, res);

    const headers: Record<string, string> = {};
    secureRes.headers.forEach((value, key) => {
      // Normalize nonce values for snapshot testing
      if (key.toLowerCase() === 'content-security-policy') {
        headers[key] = value.replace(/nonce-[a-zA-Z0-9+/=]+/g, 'nonce-NORMALIZED');
      } else {
        headers[key] = value;
      }
    });

    expect(headers).toMatchSnapshot();
  });

  it('should include X-Frame-Options header', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res = NextResponse.next();

    const secureRes = applySecurityHeaders(req, res);

    expect(secureRes.headers.has('X-Frame-Options')).toBe(true);
    expect(secureRes.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('should include X-Content-Type-Options header', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res = NextResponse.next();

    const secureRes = applySecurityHeaders(req, res);

    expect(secureRes.headers.has('X-Content-Type-Options')).toBe(true);
    expect(secureRes.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('should include Referrer-Policy header', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res = NextResponse.next();

    const secureRes = applySecurityHeaders(req, res);

    expect(secureRes.headers.has('Referrer-Policy')).toBe(true);
    expect(secureRes.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('should include Permissions-Policy header', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res = NextResponse.next();

    const secureRes = applySecurityHeaders(req, res);

    expect(secureRes.headers.has('Permissions-Policy')).toBe(true);
  });

  it('should include Strict-Transport-Security header in production', () => {
    const originalEnv = process.env.NODE_ENV;
    vi.stubEnv('NODE_ENV', 'production');

    const req = new NextRequest(new URL('https://example.com/en/dashboard'));
    const res = NextResponse.next();

    const secureRes = applySecurityHeaders(req, res);

    expect(secureRes.headers.has('Strict-Transport-Security')).toBe(true);
    expect(secureRes.headers.get('Strict-Transport-Security')).toContain('max-age=');

    process.env.NODE_ENV = originalEnv;
  });

  it('should include Content-Security-Policy header', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res = NextResponse.next();

    const secureRes = applySecurityHeaders(req, res);

    expect(secureRes.headers.has('Content-Security-Policy')).toBe(true);
    const csp = secureRes.headers.get('Content-Security-Policy');
    expect(csp).toContain("default-src 'self'");
  });

  it('should generate unique nonce for each request when CSP_NONCE_ENABLED=true', () => {
    const originalEnv = process.env.CSP_NONCE_ENABLED;
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.CSP_NONCE_ENABLED = 'true';
    vi.stubEnv('NODE_ENV', 'production');

    const req1 = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res1 = NextResponse.next();
    const secureRes1 = applySecurityHeaders(req1, res1);

    const req2 = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res2 = NextResponse.next();
    const secureRes2 = applySecurityHeaders(req2, res2);

    const csp1 = secureRes1.headers.get('Content-Security-Policy') || '';
    const csp2 = secureRes2.headers.get('Content-Security-Policy') || '';

    const nonce1Match = csp1.match(/nonce-([a-zA-Z0-9+/=]+)/);
    const nonce2Match = csp2.match(/nonce-([a-zA-Z0-9+/=]+)/);

    expect(nonce1Match).toBeTruthy();
    expect(nonce2Match).toBeTruthy();
    expect(nonce1Match?.[1]).not.toBe(nonce2Match?.[1]);

    process.env.CSP_NONCE_ENABLED = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
  });
});

describe('Security Headers - CSP Directives', () => {
  it('should allow Supabase domains in CSP', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res = NextResponse.next();

    const secureRes = applySecurityHeaders(req, res);
    const csp = secureRes.headers.get('Content-Security-Policy') || '';

    expect(csp).toContain('*.supabase.co');
  });

  it('should allow Vercel Live in CSP', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res = NextResponse.next();

    const secureRes = applySecurityHeaders(req, res);
    const csp = secureRes.headers.get('Content-Security-Policy') || '';

    expect(csp).toContain('vercel.live');
  });

  it('should have strict default-src policy', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res = NextResponse.next();

    const secureRes = applySecurityHeaders(req, res);
    const csp = secureRes.headers.get('Content-Security-Policy') || '';

    expect(csp).toMatch(/default-src[^;]*'self'/);
  });

  it('should allow inline scripts with nonce when CSP_NONCE_ENABLED=true', () => {
    const originalEnv = process.env.CSP_NONCE_ENABLED;
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.CSP_NONCE_ENABLED = 'true';
    vi.stubEnv('NODE_ENV', 'production');

    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res = NextResponse.next();

    const secureRes = applySecurityHeaders(req, res);
    const csp = secureRes.headers.get('Content-Security-Policy') || '';

    expect(csp).toMatch(/script-src[^;]*'nonce-/);

    process.env.CSP_NONCE_ENABLED = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should allow unsafe-inline scripts by default (when nonce disabled)', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    const res = NextResponse.next();

    const secureRes = applySecurityHeaders(req, res);
    const csp = secureRes.headers.get('Content-Security-Policy') || '';

    expect(csp).toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
