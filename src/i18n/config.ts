import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type AppLocale,
  normalizeLocale,
} from '@/modules/i18n/config';

export const locales = SUPPORTED_LOCALES;
export type Locale = AppLocale;
export const defaultLocale = DEFAULT_LOCALE;

export default getRequestConfig(async ({ locale }) => {
  const normalized = normalizeLocale(locale);
  if (!SUPPORTED_LOCALES.includes(normalized)) {
    notFound();
  }

  const messages = (await import(`../messages/${normalized}.json`)).default;

  return {
    locale: normalized,
    messages,
    timeZone: 'UTC',
    // Gracefully handle missing translation keys
    onError(error) {
      // Only log in development to avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.warn('i18n error:', error.message);
      }
    },
    getMessageFallback({ namespace, key }) {
      // Return the key itself as fallback (e.g., "coach" for "navigation.coach")
      return key;
    }
  };
});
