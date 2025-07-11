import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
 
export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as 'en' | 'he')) {
    // Instead of notFound(), redirect to default locale
    // This will be handled by the middleware redirect logic
    console.warn(`Invalid locale requested: ${locale}, falling back to default`);
    locale = routing.defaultLocale;
  }
 
  return {
    locale: locale as string,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});