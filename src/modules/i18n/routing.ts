/**
 * @fileoverview Locale-aware routing helpers built on top of next-intl.
 */

import { headers } from 'next/headers';
import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type AppLocale,
  getLocaleDirection,
  normalizeLocale,
} from './config';

/** Central routing definition shared by navigation helpers and middleware. */
export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  localeDetection: true,
});

/** next-intl navigation bindings wired to the routing definition above. */
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);

/**
 * Parses an `Accept-Language` header and returns preferred locales ordered by
 * quality value (descending). The logic intentionally remains dependency-free
 * to avoid inflating the client bundle.
 */
function parseAcceptLanguage(headerValue: string | null | undefined): string[] {
  if (!headerValue) {
    return [];
  }

  return headerValue
    .split(',')
    .map(entry => {
      const [rawLocale, rawWeight] = entry.trim().split(';q=');
      const weight = rawWeight ? Number.parseFloat(rawWeight) : 1;
      return {
        locale: rawLocale.toLowerCase(),
        weight: Number.isNaN(weight) ? 1 : weight,
      };
    })
    .filter(item => Boolean(item.locale))
    .sort((a, b) => b.weight - a.weight)
    .map(item => item.locale);
}

/**
 * Negotiates the best matching locale using the provided `Accept-Language`
 * header value.
 */
export function negotiateRequestLocale(headerValue: string | null | undefined): AppLocale {
  const candidates = parseAcceptLanguage(headerValue);

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    if (SUPPORTED_LOCALES.includes(normalized)) {
      return normalized;
    }
  }

  return DEFAULT_LOCALE;
}

/** Convenience helper that reads the current request headers to negotiate. */
export function negotiateRequestLocaleFromHeaders(): AppLocale {
  return negotiateRequestLocale(headers().get('accept-language'));
}

/**
 * Ensures a pathname is scoped to the requested locale (defaults to the
 * configured default when none is provided).
 */
export function buildLocalizedPath(
  pathname: string,
  locale?: string | null,
): `/${string}` {
  const normalizedLocale = normalizeLocale(locale ?? undefined);
  const sanitizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const trimmed = sanitizedPath === '/' ? '' : sanitizedPath;
  return `/${normalizedLocale}${trimmed}`;
}

export interface LocalePathDetails {
  locale: AppLocale;
  pathname: `/${string}`;
  direction: 'ltr' | 'rtl';
}

/**
 * Extracts locale information from a pathname shaped as `/locale/segment`.
 */
export function stripLocaleFromPath(pathname: string): LocalePathDetails {
  const sanitized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const [, possibleLocale, ...rest] = sanitized.split('/');
  const normalizedLocale = normalizeLocale(possibleLocale);
  const resolvedPath = rest.length ? `/${rest.join('/')}` : '/' as const;

  return {
    locale: normalizedLocale,
    pathname: resolvedPath,
    direction: getLocaleDirection(normalizedLocale),
  };
}
