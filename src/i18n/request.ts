import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

export default getRequestConfig(async ({ locale }: { locale?: string }) => {
  // Handle undefined or invalid locale parameter
  let resolvedLocale = locale;
  if (!resolvedLocale || !routing.locales.includes(resolvedLocale as 'en' | 'he')) {
    // Use default locale for undefined or invalid locales
    // Only warn if locale was provided but invalid (not undefined)
    if (resolvedLocale && resolvedLocale !== routing.defaultLocale) {
      logger.warn(`Invalid locale requested: ${resolvedLocale}, falling back to default`);
    }
    resolvedLocale = routing.defaultLocale;
  }

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
    timeZone: 'UTC'
  };
});