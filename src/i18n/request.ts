import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';
 
export default getRequestConfig(async ({ locale }: { locale: string }) => {
  // Handle undefined or invalid locale parameter
  if (!locale || !routing.locales.includes(locale as any)) {
    // Use default locale for undefined or invalid locales
    // Only warn if locale was provided but invalid (not undefined)
    if (locale && locale !== routing.defaultLocale) {
      console.warn(`Invalid locale requested: ${locale}, falling back to default`);
    }
    locale = routing.defaultLocale;
  }
 
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});