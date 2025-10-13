import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

// Import from routing to maintain DRY principle
export const locales = routing.locales;
export type Locale = typeof locales[number];
export const defaultLocale = routing.defaultLocale;

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) notFound();

  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale: locale as Locale,
    messages,
  };
});