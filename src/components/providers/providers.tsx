'use client';

import { NextIntlClientProvider } from 'next-intl';
import { QueryProvider } from './query-provider';
import { StoreProvider } from './store-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { RealtimeProvider } from './realtime-provider';
import { AnalyticsProvider } from './analytics-provider';
import { ErrorBoundary } from '@/components/error-boundary';import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import { webVitalsMonitor, preloadComponentsByRole, prefetchStrategies } from '@/lib/performance';
import type { AuthUser } from '@/lib/auth/auth';

// Lazy load performance monitor for better initial load
const PerformanceMonitor = dynamic(
  () => import('@/components/monitoring/performance-monitor'),
  { 
    ssr: false,
    loading: () => null,
  }
);

interface ProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown>;
  initialUser?: AuthUser | null;
}

export function Providers({ children, locale, messages, initialUser }: ProvidersProps) {
  // Initialize performance monitoring and preloading
  useEffect(() => {
    if (initialUser) {
      // Set user ID for performance tracking
      webVitalsMonitor.setUserId(initialUser.id);
      
      // Preload components based on user role
      preloadComponentsByRole(initialUser.role);
      
      // Prefetch user data
      prefetchStrategies.prefetchUserData(initialUser.id, initialUser.role).catch(() => {
        // Silently fail prefetching
      });
    }
  }, [initialUser]);

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
                            <Suspense fallback={null}>
                              <PerformanceMonitor />
                            </Suspense>
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