import { describe, it, expect } from 'vitest';

import { resolveRedirect } from '@/lib/utils/redirect';
import { buildLocalizedPath } from '@/modules/i18n/routing';

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
    expect(
      resolveRedirect('en', '/en/auth/signin?redirectTo=%2Fen%2Fdashboard')
    ).toBe('/en/dashboard');
  });

  it('allows auth routes when explicitly permitted', () => {
    expect(
      resolveRedirect('en', '/auth/signin', { allowAuthPaths: true })
    ).toBe('/en/auth/signin');
    expect(
      resolveRedirect('he', '/auth/signup', { allowAuthPaths: true })
    ).toBe('/he/auth/signup');
  });
});

describe('buildLocalizedPath', () => {
  it('prefixes locale when none is present', () => {
    expect(buildLocalizedPath('/dashboard', 'he')).toBe('/he/dashboard');
    expect(buildLocalizedPath('settings/profile', 'en')).toBe(
      '/en/settings/profile'
    );
  });

  it('replaces existing locale prefix with the requested one', () => {
    expect(buildLocalizedPath('/en/dashboard', 'he')).toBe('/he/dashboard');
    expect(buildLocalizedPath('/he/client/tasks', 'en')).toBe(
      '/en/client/tasks'
    );
  });

  it('handles root paths and empty values', () => {
    expect(buildLocalizedPath('/', 'he')).toBe('/he');
    expect(buildLocalizedPath('', 'en')).toBe('/en');
  });

  it('normalizes duplicate slashes and preserves search/hash fragments', () => {
    expect(buildLocalizedPath('//en//dashboard//', 'he')).toBe('/he/dashboard');
    expect(buildLocalizedPath('/en/sessions?tab=upcoming#top', 'he')).toBe(
      '/he/sessions?tab=upcoming#top'
    );
  });
});
