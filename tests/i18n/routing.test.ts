import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  getLocaleDirection,
  isRtlLocale,
  normalizeLocale,
} from '@/modules/i18n/config';
import {
  buildLocalizedPath,
  negotiateRequestLocale,
  stripLocaleFromPath,
} from '@/modules/i18n/routing';

describe('i18n routing helpers', () => {
  it('negotiates locale from Accept-Language header', () => {
    expect(
      negotiateRequestLocale('en-US,en;q=0.8,he;q=0.6'),
    ).toBe('en');
    expect(
      negotiateRequestLocale('fr-CA,he;q=0.9,en;q=0.1'),
    ).toBe('he');
    expect(negotiateRequestLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it('normalizes locale strings consistently', () => {
    expect(normalizeLocale('EN-us')).toBe('en');
    expect(normalizeLocale('he')).toBe('he');
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE);
  });

  it('creates locale-scoped paths', () => {
    expect(buildLocalizedPath('/dashboard', 'he')).toBe('/he/dashboard');
    expect(buildLocalizedPath('dashboard', 'en')).toBe('/en/dashboard');
    expect(buildLocalizedPath('/', undefined)).toBe(`/${DEFAULT_LOCALE}`);
  });

  it('strips locale segments from paths', () => {
    expect(stripLocaleFromPath('/he/dashboard')).toEqual({
      locale: 'he',
      pathname: '/dashboard',
      direction: 'rtl',
    });

    expect(stripLocaleFromPath('/en')).toEqual({
      locale: 'en',
      pathname: '/',
      direction: 'ltr',
    });

    expect(stripLocaleFromPath('/unknown/path')).toEqual({
      locale: DEFAULT_LOCALE,
      pathname: '/path',
      direction: getLocaleDirection(DEFAULT_LOCALE),
    });
  });

  it('exposes rtl helpers', () => {
    expect(isRtlLocale('he')).toBe(true);
    expect(isRtlLocale('en')).toBe(false);
    expect(getLocaleDirection('he')).toBe('rtl');
    expect(getLocaleDirection('en')).toBe('ltr');
  });
});
