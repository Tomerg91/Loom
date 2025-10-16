import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import './globals.css';

import {
  LocaleDirectionProvider,
  getLocaleDirection,
} from '@/modules/i18n/config';
import { negotiateRequestLocale } from '@/modules/i18n/routing';

interface RootLayoutProps {
  children: ReactNode;
}

/**
 * Root layout primes locale direction context using the request headers. The
 * locale-specific layout refines these values once the `[locale]` segment has
 * been resolved, but providing a fallback prevents flashes of incorrect
 * alignment while streaming.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  const headerList = headers();
  const fallbackLocale = negotiateRequestLocale(headerList.get('accept-language'));
  const fallbackDirection = getLocaleDirection(fallbackLocale);

  return (
    <LocaleDirectionProvider value={{ locale: fallbackLocale, direction: fallbackDirection }}>
      {children}
    </LocaleDirectionProvider>
  );
}
