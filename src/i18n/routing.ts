import { defineRouting } from 'next-intl/routing';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'he'],
 
  // Used when no locale matches
  defaultLocale: 'en',
  
  // Ensure locale prefixes are always used
  localePrefix: 'always',
  
  // Redirect to default locale for invalid locales
  localeDetection: true
});