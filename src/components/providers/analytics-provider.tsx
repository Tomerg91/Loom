'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import posthog from 'posthog-js';

// Use the app's active AuthProvider hook to avoid context mismatch
import { useUser } from '@/lib/auth/use-user';
import {
  GA_TRACKING_ID,
  POSTHOG_KEY,
  POSTHOG_HOST,
  pageView,
  trackPageView,
  posthogIdentify,
} from '@/lib/monitoring/analytics';
import { collectWebVitals } from '@/lib/performance/web-vitals';

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event',
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
    dataLayer: unknown[];
    posthog?: {
      init: (key: string, config: Record<string, unknown>) => void;
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
      reset: () => void;
      opt_in_capturing?: () => void;
      opt_out_capturing?: () => void;
    };
    __POSTHOG_LOADED__?: boolean;
  }
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useUser();

  // Initialize Google Analytics
  useEffect(() => {
    if (GA_TRACKING_ID) {
      // Check if GA is already initialized to prevent duplicates
      const existingGA = document.querySelector('script[data-analytics="ga"]');
      if (existingGA) return;

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
      script.setAttribute('data-analytics', 'ga');
      document.head.appendChild(script);

      const configScript = document.createElement('script');
      configScript.setAttribute('data-analytics', 'ga-config');
      configScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_TRACKING_ID}', {
          page_path: window.location.pathname,
        });
      `;
      document.head.appendChild(configScript);

      // Initialize Web Vitals collection
      collectWebVitals();

      // Cleanup function
      return () => {
        // Remove GA scripts
        const gaScripts = document.querySelectorAll('script[data-analytics]');
        gaScripts.forEach(script => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        });

        // Clear dataLayer to prevent memory accumulation
        if (typeof window !== 'undefined' && window.dataLayer) {
          window.dataLayer.length = 0;
        }

        // Remove gtag function
        if (typeof window !== 'undefined' && 'gtag' in window) {
          delete (window as unknown).gtag;
        }
      };
    }
  }, []);

  // Initialize PostHog
  useEffect(() => {
    if (POSTHOG_KEY && POSTHOG_HOST && typeof window !== 'undefined') {
      // Check if PostHog is already initialized to prevent duplicates
      if (window.__POSTHOG_LOADED__) return;

      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST || 'https://app.posthog.com',
        person_profiles: 'identified_only',
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('PostHog loaded');
          }
          window.posthog = posthog;
          window.__POSTHOG_LOADED__ = true;
        },
        capture_pageview: false, // We handle this manually
        capture_pageleave: true,
        autocapture: {
          dom_event_allowlist: ['click', 'change', 'submit'],
          element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea'],
        },
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '[data-private]',
        },
        advanced_disable_decide: false,
      });

      // Cleanup function
      return () => {
        if (window.posthog && typeof window.posthog.reset === 'function') {
          try {
            window.posthog.reset();
          } catch (error) {
            console.warn('PostHog reset failed:', error);
          }
        }

        if (typeof window !== 'undefined') {
          delete window.posthog;
          delete window.__POSTHOG_LOADED__;
        }
      };
    }
  }, []);

  // Track page views
  useEffect(() => {
    const url = pathname + searchParams.toString();

    // Track with Google Analytics
    if (GA_TRACKING_ID) {
      pageView(url);
    }

    // Track with unified analytics
    trackPageView(url, user?.id);
  }, [pathname, searchParams, user?.id]);

  // Update user context when user changes
  useEffect(() => {
    if (user) {
      // PostHog identify
      if (POSTHOG_KEY && window.posthog) {
        posthogIdentify(user.id, {
          email: user.email,
          role: user.role,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        });
      }

      // Google Analytics user properties
      if (GA_TRACKING_ID && window.gtag) {
        window.gtag('config', GA_TRACKING_ID, {
          user_id: user.id,
          custom_map: {
            user_role: user.role,
          },
        });
      }
    }
  }, [user]);

  return <>{children}</>;
}
