'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

interface LocaleLayoutClientProps {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
}

export function LocaleLayoutClient({ children, locale, messages }: LocaleLayoutClientProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        // Only log in development to avoid console spam in production
        if (process.env.NODE_ENV === 'development') {
          console.warn('i18n error:', error.message);
        }
      }}
      getMessageFallback={({ namespace, key }) => {
        // Return the key itself as fallback (e.g., "coach" for "navigation.coach")
        return key;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
