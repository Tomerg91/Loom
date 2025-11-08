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
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
