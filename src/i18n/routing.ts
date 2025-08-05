import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'he'],
 
  // Used when no locale matches
  defaultLocale: 'he',
  
  // Ensure locale prefixes are always used
  localePrefix: 'always',
  
  // Redirect to default locale for invalid locales
  localeDetection: true
});

// Typed navigation APIs
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);