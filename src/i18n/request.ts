import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
 
export default getRequestConfig(async ({ locale }: { locale: string }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as any)) {
    // Instead of notFound(), redirect to default locale
    // This will be handled by the middleware redirect logic
    console.warn(`Invalid locale requested: ${locale}, falling back to default`);
    locale = routing.defaultLocale;
  }
 
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});