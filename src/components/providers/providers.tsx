'use client';

import dynamic from 'next/dynamic';
import { NextIntlClientProvider } from 'next-intl';
import { useEffect, useState } from 'react';

import { AuthProvider } from '@/components/auth/auth-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { ToastProvider } from '@/components/ui/toast-provider';
import type { AuthUser } from '@/lib/auth/auth';
import { webVitalsMonitor } from '@/lib/performance';

import { QueryProvider } from './query-provider';
import { StoreProvider } from './store-provider';



// Lazy load non-critical providers with increased delay for better LCP
const _RealtimeProvider = dynamic(() => import('./realtime-provider').then(mod => ({ default: mod.RealtimeProvider })), {
  ssr: false,
  loading: () => null,
});

const _AnalyticsProvider = dynamic(() => import('./analytics-provider').then(mod => ({ default: mod.AnalyticsProvider })), {
  ssr: false,
  loading: () => null,
});

// Lazy load performance monitor - only load after interaction or 3 seconds
const _PerformanceMonitor = dynamic(
  () => import('@/components/monitoring/performance-monitor').then(mod => ({ default: mod.PerformanceMonitorComponent })),
  {
    ssr: false,
    loading: () => null,
  }
);

// Layout stabilizer to prevent CLS
const _LayoutStabilizer = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}
    aria-hidden="true"
  />
);

interface ProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown>;
  initialUser?: AuthUser | null;
}

export function Providers({ children, locale, messages, initialUser }: ProvidersProps) {
  const [_mounted, _setMounted] = useState(false);
  const [_loadAnalytics, _setLoadAnalytics] = useState(false);

  // Initialize performance monitoring and preloading
  useEffect(() => {
    _setMounted(true);
    
    if (initialUser) {
      // Set user ID for performance tracking
      webVitalsMonitor.setUserId(initialUser.id);
    }
    
    // Delay analytics loading even more to prioritize LCP
    const loadAnalyticsDelayed = () => {
      // Wait for user interaction OR 3 seconds, whichever comes first
      let loaded = false;
      const load = () => {
        if (!loaded) {
          loaded = true;
          _setLoadAnalytics(true);
        }
      };
      
      // Load on first interaction
      const events = ['click', 'scroll', 'keydown', 'touchstart'];
      const cleanupListeners: (() => void)[] = [];
      
      events.forEach(event => {
        const listener = () => {
          load();
          cleanupListeners.forEach(cleanup => cleanup());
        };
        document.addEventListener(event, listener, { once: true, passive: true });
        cleanupListeners.push(() => document.removeEventListener(event, listener));
      });
      
      // Fallback after 3 seconds
      const fallbackTimer = setTimeout(load, 3000);
      
      return () => {
        clearTimeout(fallbackTimer);
        cleanupListeners.forEach(cleanup => cleanup());
      };
    };
    
    return loadAnalyticsDelayed();
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
                      <ToastProvider>
                        {/* Load realtime and analytics after critical path */}
                        {/* <Suspense fallback={mounted ? null : <LayoutStabilizer />}> */}
                          {/* <RealtimeProvider> */}
                            {/* {mounted && loadAnalytics && (
                              <AnalyticsProvider>
                                <Suspense fallback={null}>
                                  <PerformanceMonitor />
                                </Suspense>
                              </AnalyticsProvider>
                            )} */}
                            {children}
                          {/* </RealtimeProvider> */}
                        {/* </Suspense> */}
                      </ToastProvider>
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