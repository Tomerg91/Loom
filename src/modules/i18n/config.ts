/**
 * @fileoverview Locale configuration and direction helpers for the Loom app.
 *
 * Centralizes knowledge about supported locales, their metadata, and how the
 * UI should respond to locale-specific nuances like text direction. This module
 * intentionally stays free of any React-specific logic so it can be shared
 * safely between server and client environments.
 */

/** All locales supported by the marketing site and authenticated app. */
export const SUPPORTED_LOCALES = ['en', 'he'] as const;

/** Strongly typed representation of a supported locale. */
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/** Default locale used when negotiation cannot determine a better option. */
export const DEFAULT_LOCALE: AppLocale = 'he';

/** Locales that should render using right-to-left text direction. */
const RTL_LOCALES = new Set<AppLocale>(['he']);

/**
 * Metadata describing how each locale should be presented to the user.
 */
export interface LocaleMetadata {
  /** Canonical locale code (matches routing). */
  code: AppLocale;
  /** Display name in English for administrative interfaces. */
  englishLabel: string;
  /** Native language label used in language switchers. */
  nativeLabel: string;
  /** Text direction for the locale. */
  direction: 'ltr' | 'rtl';
}

/** Mapping of locale -> metadata used throughout the experience. */
export const LOCALE_METADATA: Record<AppLocale, LocaleMetadata> = {
  en: {
    code: 'en',
    englishLabel: 'English',
    nativeLabel: 'English',
    direction: 'ltr',
  },
  he: {
    code: 'he',
    englishLabel: 'Hebrew',
    nativeLabel: 'עברית',
    direction: 'rtl',
  },
};

/** Type guard to ensure a value is a supported locale. */
export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as AppLocale);
}

/**
 * Normalizes potentially complex locale strings (e.g., `en-US`) down to the
 * application's supported locale codes.
 */
export function normalizeLocale(input: string | null | undefined): AppLocale {
  if (typeof input === 'string' && input.trim().length > 0) {
    const lower = input.toLowerCase();
    const exactMatch = SUPPORTED_LOCALES.find(locale => locale === lower);
    if (exactMatch) {
      return exactMatch;
    }

    const shortCode = lower.split('-')[0];
    if (isAppLocale(shortCode)) {
      return shortCode;
    }
  }

  return DEFAULT_LOCALE;
}

/** Returns whether a locale should render using right-to-left direction. */
export function isRtlLocale(locale: string | AppLocale): boolean {
  return RTL_LOCALES.has(normalizeLocale(locale));
}

/** Resolves the direction attribute for a given locale. */
export function getLocaleDirection(locale: string | AppLocale): 'ltr' | 'rtl' {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

/** Retrieves metadata for a locale, applying normalization as needed. */
export function getLocaleMetadata(locale: string | AppLocale): LocaleMetadata {
  const normalized = normalizeLocale(locale);
  return LOCALE_METADATA[normalized];
}
