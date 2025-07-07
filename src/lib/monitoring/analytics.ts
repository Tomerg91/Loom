import { env } from '@/env.mjs';

// Google Analytics
export const GA_TRACKING_ID = env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

// Window interface is declared in analytics-provider.tsx to avoid duplication

// PostHog
export const POSTHOG_KEY = env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST = env.NEXT_PUBLIC_POSTHOG_HOST;

// Analytics events
export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  userId?: string;
  properties?: Record<string, unknown>;
}

// Google Analytics functions
export const pageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID!, {
      page_path: url,
    });
  }
};

export const event = ({ action, category, label, value }: AnalyticsEvent) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// PostHog functions
export const posthogEvent = (name: string, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(name, properties);
  }
};

export const posthogIdentify = (userId: string, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.identify(userId, properties);
  }
};

// Unified analytics function
export const trackEvent = (event: AnalyticsEvent) => {
  // Track with Google Analytics
  if (GA_TRACKING_ID) {
    window.gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
    });
  }

  // Track with PostHog
  if (POSTHOG_KEY) {
    posthogEvent(`${event.category}_${event.action}`, {
      label: event.label,
      value: event.value,
      userId: event.userId,
      ...event.properties,
    });
  }
};

// Common tracking events
export const trackUserLogin = (userId: string, method: string) => {
  trackEvent({
    action: 'login',
    category: 'user',
    label: method,
    userId,
    properties: { method },
  });
};

export const trackSessionBooked = (userId: string, sessionType: string) => {
  trackEvent({
    action: 'session_booked',
    category: 'engagement',
    label: sessionType,
    userId,
    properties: { sessionType },
  });
};

export const trackPageView = (page: string, userId?: string) => {
  trackEvent({
    action: 'page_view',
    category: 'navigation',
    label: page,
    userId,
    properties: { page },
  });
};

export const trackError = (error: string, page: string, userId?: string) => {
  trackEvent({
    action: 'error',
    category: 'system',
    label: error,
    userId,
    properties: { error, page },
  });
};

// Performance tracking
export const trackPerformance = (metric: string, value: number, page: string) => {
  trackEvent({
    action: 'performance',
    category: 'metrics',
    label: metric,
    value,
    properties: { metric, page },
  });
};

// Web Vitals tracking
export const trackWebVitals = (metric: { name: string; value: number; rating: string; delta: number }) => {
  trackEvent({
    action: 'web_vitals',
    category: 'performance',
    label: metric.name,
    value: Math.round(metric.value),
    properties: {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    },
  });
};

// Export collectWebVitals function
export { collectWebVitals } from '@/lib/performance/web-vitals';