'use client';

import { NextIntlClientProvider } from 'next-intl';
import { QueryProvider } from './query-provider';
import { StoreProvider } from './store-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import type { AuthUser } from '@/lib/auth/auth';

interface ProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown>;
  initialUser?: AuthUser | null;
}

export function Providers({ children, locale, messages, initialUser }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryProvider>
        <StoreProvider initialUser={initialUser}>
          <AuthProvider initialUser={initialUser}>
            {children}
          </AuthProvider>
        </StoreProvider>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}