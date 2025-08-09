'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/auth/auth-context';
import { 
  GA_TRACKING_ID, 
  POSTHOG_KEY, 
  POSTHOG_HOST,
  pageView,
  trackPageView,
  posthogIdentify,
  collectWebVitals 
} from '@/lib/monitoring/analytics';

declare global {
  interface Window {
    gtag?: (command: 'config' | 'event', targetId: string, config?: Record<string, unknown>) => void;
    dataLayer: any[];
    posthog?: {
      init: (key: string, config: Record<string, unknown>) => void;
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
      reset: () => void;
    };
    __POSTHOG_LOADED__?: boolean;
  }
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();

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
          delete (window as any).gtag;
        }
      };
    }
  }, []);

  // Initialize PostHog
  useEffect(() => {
    if (POSTHOG_KEY && POSTHOG_HOST) {
      // Check if PostHog is already initialized to prevent duplicates
      const existingPostHog = document.querySelector('script[data-analytics="posthog"]');
      if (existingPostHog) return;
      
      const script = document.createElement('script');
      script.setAttribute('data-analytics', 'posthog');
      script.innerHTML = `
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);var n=t;if("undefined"!=typeof console&&console.error)console.error("PostHog disabled");else{for(var p="get identify capture register register_once alias unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset distinct_id isFeatureEnabled getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),r=0;r<p.length;r++)!function(t){n[t]=function(){var e=Array.prototype.slice.call(arguments);e.unshift(t),n._i.push(e)}}(p[r])}(p=t,r=e,p[r]=function(){p._i.push([r].concat(Array.prototype.slice.call(arguments,0)))},p._i=[],i=document.createElement("script"),i.type="text/javascript",i.async=!0,i.src=s.api_host+"/static/array.js",(a=document.getElementsByTagName("script")[0]).parentNode.insertBefore(i,a),t.__SV=1)}(window,document,window.posthog||[]);
        window.posthog.init('${POSTHOG_KEY}', {
          api_host: '${POSTHOG_HOST}',
          person_profiles: 'identified_only',
          loaded: function(posthog) {
            console.log('PostHog loaded');
          }
        });
      `;
      document.head.appendChild(script);

      // Cleanup function
      return () => {
        // Properly shutdown PostHog before cleanup
        if (window.posthog && typeof window.posthog.reset === 'function') {
          try {
            window.posthog.reset();
          } catch (error) {
            console.warn('PostHog reset failed:', error);
          }
        }
        
        // Remove PostHog scripts
        const posthogScripts = document.querySelectorAll('script[data-analytics="posthog"]');
        posthogScripts.forEach(script => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        });
        
        // Remove additional PostHog scripts that might be loaded dynamically
        const dynamicPostHogScripts = document.querySelectorAll('script[src*="posthog"]');
        dynamicPostHogScripts.forEach(script => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        });
        
        // Clean up PostHog instance and related properties
        if (typeof window !== 'undefined') {
          delete window.posthog;
          // Clean up PostHog-related window properties
          if (window.__POSTHOG_LOADED__) {
            delete window.__POSTHOG_LOADED__;
          }
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