import { ComponentType } from 'react';
import dynamic from 'next/dynamic';

// Default loading component
const DefaultLoadingComponent = () => {
  return {
    __html: '<div class="flex items-center justify-center p-8"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>'
  };
};

// Higher-order component for lazy loading with loading state
export function withLazyLoading<T extends Record<string, unknown>>(
  componentLoader: () => Promise<{ default: ComponentType<T> }>,
  options?: {
    loading?: ComponentType;
    error?: ComponentType<{ error: Error; retry: () => void }>;
    ssr?: boolean;
  }
) {
  const LazyComponent = dynamic(componentLoader, {
    loading: options?.loading,
    ssr: options?.ssr ?? true,
  });

  return LazyComponent;
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
    () => import('@/components/admin/analytics-page'),
    { ssr: false }
  ),
  AdminSystemPage: withLazyLoading(
    () => import('@/components/admin/system-page'),
    { ssr: false }
  ),
  AdminUsersPage: withLazyLoading(
    () => import('@/components/admin/users-page'),
    { ssr: false }
  ),

  // Dashboard components
  DashboardCharts: withLazyLoading(
    () => import('@/components/charts/dashboard-charts'),
    { ssr: false }
  ),

  // Coach components
  CoachDashboard: withLazyLoading(
    () => import('@/components/coach/coach-dashboard'),
    { ssr: true }
  ),
  AvailabilityManager: withLazyLoading(
    () => import('@/components/coach/availability-manager'),
    { ssr: false }
  ),
  ClientDetailPage: withLazyLoading(
    () => import('@/components/coach/client-detail-page'),
    { ssr: true }
  ),

  // Client components
  ClientDashboard: withLazyLoading(
    () => import('@/components/client/client-dashboard'),
    { ssr: true }
  ),
  BookingPage: withLazyLoading(
    () => import('@/components/client/book-page'),
    { ssr: true }
  ),
  ProgressPage: withLazyLoading(
    () => import('@/components/client/progress-page'),
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
    () => import('@/components/sessions/session-calendar'),
    { ssr: false }
  ),

  // Settings components
  SettingsPage: withLazyLoading(
    () => import('@/components/settings/settings-page'),
    { ssr: true }
  ),
  NotificationSettingsPage: withLazyLoading(
    () => import('@/components/settings/notification-settings-page'),
    { ssr: false }
  ),

  // Notification components
  NotificationCenter: withLazyLoading(
    () => import('@/components/notifications/notification-center'),
    { ssr: false }
  ),
};

// Preload critical components based on user role
export function preloadComponentsByRole(role: 'admin' | 'coach' | 'client') {
  switch (role) {
    case 'admin':
      preloadComponent(() => import('@/components/admin/analytics-page'));
      preloadComponent(() => import('@/components/admin/users-page'));
      break;
    case 'coach':
      preloadComponent(() => import('@/components/coach/coach-dashboard'));
      preloadComponent(() => import('@/components/coach/availability-manager'));
      break;
    case 'client':
      preloadComponent(() => import('@/components/client/client-dashboard'));
      preloadComponent(() => import('@/components/client/book-page'));
      break;
  }
}

// Route-based preloading
export function preloadRouteComponents(pathname: string) {
  if (pathname.startsWith('/admin')) {
    preloadComponent(() => import('@/components/admin/analytics-page'));
  } else if (pathname.startsWith('/coach')) {
    preloadComponent(() => import('@/components/coach/coach-dashboard'));
  } else if (pathname.startsWith('/client')) {
    preloadComponent(() => import('@/components/client/client-dashboard'));
  } else if (pathname.startsWith('/sessions')) {
    preloadComponent(() => import('@/components/sessions/booking'));
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