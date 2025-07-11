'use client';

import { NextIntlClientProvider } from 'next-intl';
import { QueryProvider } from './query-provider';
import { StoreProvider } from './store-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { RealtimeProvider } from './realtime-provider';
import { AnalyticsProvider } from './analytics-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import type { AuthUser } from '@/lib/auth/auth';

interface ProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown>;
  initialUser?: AuthUser | null;
}

export function Providers({ children, locale, messages, initialUser }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ErrorBoundary>
          <QueryProvider>
            <ErrorBoundary>
              <StoreProvider initialUser={initialUser}>
                <ErrorBoundary>
                  <AuthProvider initialUser={initialUser}>
                    <ErrorBoundary>
                      <RealtimeProvider>
                        <ErrorBoundary>
                          <AnalyticsProvider>
                            {children}
                          </AnalyticsProvider>
                        </ErrorBoundary>
                      </RealtimeProvider>
                    </ErrorBoundary>
                  </AuthProvider>
                </ErrorBoundary>
              </StoreProvider>
            </ErrorBoundary>
          </QueryProvider>
        </ErrorBoundary>
      </NextIntlClientProvider>
    </ErrorBoundary>
  );
}