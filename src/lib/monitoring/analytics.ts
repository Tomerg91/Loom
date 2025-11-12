// Direct access to client-safe environment variables
// Google Analytics
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

// Window interface is declared in analytics-provider.tsx to avoid duplication

// PostHog
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

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
  if (GA_TRACKING_ID && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
    });
  }

  // Track with PostHog
  if (POSTHOG_KEY && typeof window !== 'undefined') {
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

// CTA tracking
export const trackCtaClick = (
  ctaLocation: string,
  ctaLabel: string,
  ctaHref: string,
  locale: string,
  experimentId?: string,
  variantId?: string,
  userId?: string
) => {
  trackEvent({
    action: 'cta_click',
    category: 'marketing',
    label: `${ctaLocation}:${ctaLabel}`,
    userId,
    properties: {
      ctaLocation,
      ctaLabel,
      ctaHref,
      locale,
      experimentId,
      variantId,
      timestamp: new Date().toISOString(),
    },
  });
};

export const trackExperimentView = (
  experimentId: string,
  variantId: string,
  ctaLocation: string,
  locale: string,
  userId?: string
) => {
  trackEvent({
    action: 'experiment_view',
    category: 'experiments',
    label: `${experimentId}:${variantId}`,
    userId,
    properties: {
      experimentId,
      variantId,
      ctaLocation,
      locale,
      timestamp: new Date().toISOString(),
    },
  });
};

// Export collectWebVitals function
export { collectWebVitals } from '@/lib/performance/web-vitals';