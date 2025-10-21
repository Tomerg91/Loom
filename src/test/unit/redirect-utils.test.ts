import { describe, it, expect } from 'vitest';

import { resolveRedirect } from '@/lib/utils/redirect';

describe('resolveRedirect', () => {
  it('prefixes locale and normalizes path', () => {
    expect(resolveRedirect('en', '/dashboard')).toBe('/en/dashboard');
    expect(resolveRedirect('he', 'settings')).toBe('/he/settings');
  });

  it('defaults to /<locale>/dashboard for empty or invalid', () => {
    expect(resolveRedirect('en', '')).toBe('/en/dashboard');
    expect(resolveRedirect('he')).toBe('/he/dashboard');
  });

  it('rejects external URLs', () => {
    expect(resolveRedirect('en', 'http://evil.com')).toBe('/en/dashboard');
    expect(resolveRedirect('en', '//evil.com')).toBe('/en/dashboard');
  });

  it('keeps existing locale prefix', () => {
    expect(resolveRedirect('en', '/he/profile')).toBe('/he/profile');
    expect(resolveRedirect('he', '/en')).toBe('/en');
  });

  it('prevents redirecting back to auth routes', () => {
    expect(resolveRedirect('en', '/auth/signin')).toBe('/en/dashboard');
    expect(resolveRedirect('he', '/auth/signup')).toBe('/he/dashboard');
    expect(resolveRedirect('en', '/en/auth/signin?redirectTo=%2Fen%2Fdashboard')).toBe('/en/dashboard');
  });

  it('allows auth routes when explicitly permitted', () => {
    expect(resolveRedirect('en', '/auth/signin', { allowAuthPaths: true })).toBe('/en/auth/signin');
    expect(resolveRedirect('he', '/auth/signup', { allowAuthPaths: true })).toBe('/he/auth/signup');
  });
});

