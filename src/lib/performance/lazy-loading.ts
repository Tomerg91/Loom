import dynamic from 'next/dynamic';
import { ComponentType, createElement, type ReactElement } from 'react';

// Default loading component
const DefaultLoadingComponent = (): ReactElement =>
  createElement(
    'div',
    { className: 'flex items-center justify-center p-8' },
    createElement('div', {
      className: 'h-6 w-6 animate-spin rounded-full border-b-2 border-primary'
    })
  );

// Higher-order component for lazy loading with loading state
export function withLazyLoading<T extends Record<string, unknown>>(
  componentLoader: () => Promise<{ default: ComponentType<T> }>,
  options?: {
    loading?: ComponentType;
    error?: ComponentType<{ error: Error; retry: () => void }>;
    ssr?: boolean;
  }
) {
  return dynamic(componentLoader, {
    loading: options?.loading ?? DefaultLoadingComponent,
    ssr: options?.ssr ?? true,
  });
}

// Preload component for performance
export function preloadComponent<T extends Record<string, unknown>>(
  componentLoader: () => Promise<{ default: ComponentType<T> }>
): void {
  // Preload the component
  componentLoader().catch(() => {
    // Silently fail preloading
  });
}

// Create lazy-loaded components for heavy components
export const LazyComponents = {
  // Admin components
  AdminAnalyticsPage: withLazyLoading(
    () => import('@/components/admin/analytics-page').then(mod => ({ default: mod.default })),
    { ssr: false }
  ),
  AdminSystemPage: withLazyLoading(
    () => import('@/components/admin/system-page').then(mod => ({ default: mod.default })),
    { ssr: false }
  ),
  AdminUsersPage: withLazyLoading(
    () => import('@/components/admin/users-page').then(mod => ({ default: mod.default })),
    { ssr: false }
  ),

  // Dashboard components
  DashboardCharts: withLazyLoading(
    () => import('@/components/charts/dashboard-charts').then(mod => ({ default: mod.default })),
    { ssr: false }
  ),

  // Coach components
  CoachDashboard: withLazyLoading(
    () => import('@/components/coach/coach-dashboard').then(mod => ({ default: mod.default })),
    { ssr: true }
  ),
  AvailabilityManager: withLazyLoading(
    () => import('@/components/coach/availability-manager').then(mod => ({ default: mod.default })),
    { ssr: false }
  ),
  ClientDetailPage: withLazyLoading(
    () => import('@/components/coach/client-detail-page').then(mod => ({ default: mod.default })),
    { ssr: true }
  ),

  // Client components
  ClientDashboard: withLazyLoading(
    () => import('@/components/client/client-dashboard').then(mod => ({ default: mod.default })),
    { ssr: true }
  ),
  BookingPage: withLazyLoading(
    () => import('@/components/client/book-page').then(mod => ({ default: mod.default })),
    { ssr: true }
  ),
  ProgressPage: withLazyLoading(
    () => import('@/components/client/progress-page').then(mod => ({ default: mod.default })),
    { ssr: false }
  ),

  // Session components (unified)
  SessionBookingForm: withLazyLoading(
    () => import('@/components/sessions/booking').then(mod => ({ default: mod.SessionBookingForm })),
    { ssr: true }
  ),
  EnhancedSessionBooking: withLazyLoading(
    () => import('@/components/sessions/booking').then(mod => ({ default: mod.EnhancedSessionBooking })),
    { ssr: true }
  ),
  RealtimeSessionBooking: withLazyLoading(
    () => import('@/components/sessions/booking').then(mod => ({ default: mod.RealtimeSessionBooking })),
    { ssr: true }
  ),
  UnifiedSessionBooking: withLazyLoading(
    () => import('@/components/sessions/unified-session-booking').then(mod => ({ default: mod.UnifiedSessionBooking })),
    { ssr: true }
  ),
  SessionCalendar: withLazyLoading(
    () => import('@/components/sessions/session-calendar').then(mod => ({ default: mod.default })),
    { ssr: false }
  ),

  // Settings components
  SettingsPage: withLazyLoading(
    () => import('@/components/settings/settings-page').then(mod => ({ default: mod.default })),
    { ssr: true }
  ),
  NotificationSettingsPage: withLazyLoading(
    () => import('@/components/settings/notification-settings-page').then(mod => ({ default: mod.default })),
    { ssr: false }
  ),

  // Notification components
  NotificationCenter: withLazyLoading(
    () => import('@/components/notifications/notification-center').then(mod => ({ default: mod.default })),
    { ssr: false }
  ),
};

// Preload critical components based on user role
export function preloadComponentsByRole(role: 'admin' | 'coach' | 'client') {
  switch (role) {
    case 'admin':
      preloadComponent(() => import('@/components/admin/analytics-page').then(mod => ({ default: mod.default })));
      preloadComponent(() => import('@/components/admin/users-page').then(mod => ({ default: mod.default })));
      break;
    case 'coach':
      preloadComponent(() => import('@/components/coach/coach-dashboard').then(mod => ({ default: mod.default })));
      preloadComponent(() => import('@/components/coach/availability-manager').then(mod => ({ default: mod.default })));
      break;
    case 'client':
      preloadComponent(() => import('@/components/client/client-dashboard').then(mod => ({ default: mod.default })));
      preloadComponent(() => import('@/components/client/book-page').then(mod => ({ default: mod.default })));
      break;
  }
}

// Route-based preloading
export function preloadRouteComponents(pathname: string) {
  if (pathname.startsWith('/admin')) {
    preloadComponent(() => import('@/components/admin/analytics-page').then(mod => ({ default: mod.default })));
  } else if (pathname.startsWith('/coach')) {
    preloadComponent(() => import('@/components/coach/coach-dashboard').then(mod => ({ default: mod.default })));
  } else if (pathname.startsWith('/client')) {
    preloadComponent(() => import('@/components/client/client-dashboard').then(mod => ({ default: mod.default })));
  } else if (pathname.startsWith('/sessions')) {
    preloadComponent(() => import('@/components/sessions/booking').then(mod => ({ default: mod.default })));
  }
}

// Intersection Observer based lazy loading for images
export function createImageObserver(callback: (entries: IntersectionObserverEntry[]) => void) {
  if (typeof window === 'undefined') return null;

  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
  });
}

// Prefetch resources based on user interaction
export function prefetchOnHover(href: string) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    });
  }
}

// Performance monitoring for lazy loaded components
export function trackComponentLoad(componentName: string, startTime: number) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const loadTime = performance.now() - startTime;
    
    // Send to analytics if available
    if ('gtag' in window) {
      (window as any).gtag('event', 'component_load_time', {
        component_name: componentName,
        load_time: Math.round(loadTime),
      });
    }

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Component ${componentName} loaded in ${Math.round(loadTime)}ms`);
    }
  }
}