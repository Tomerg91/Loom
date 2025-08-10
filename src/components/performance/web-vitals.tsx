'use client';

import { useEffect } from 'react';
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

// Track and report Web Vitals metrics
export function WebVitals() {
  useEffect(() => {
    // Core Web Vitals
    onCLS((metric) => {
      reportWebVital(metric);
    });
    
    onFID((metric) => {
      reportWebVital(metric);
    });
    
    onLCP((metric) => {
      reportWebVital(metric);
    });
    
    // Additional metrics
    onFCP((metric) => {
      reportWebVital(metric);
    });
    
    onTTFB((metric) => {
      reportWebVital(metric);
    });
  }, []);

  return null;
}

function reportWebVital(metric: WebVitalsMetric) {
  // Report to analytics service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      custom_map: { metric_id: 'custom_metric' },
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
    });
  }
  
  // Report to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta
    });
  }
  
  // Report to Sentry or other monitoring service
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureMessage(`Web Vital: ${metric.name}`, {
      level: 'info',
      tags: {
        webVital: metric.name,
        rating: metric.rating,
      },
      extra: {
        value: metric.value,
        delta: metric.delta,
      },
    });
  }
}

// Performance observer for additional metrics
export function usePerformanceMonitoring() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Monitor long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn('[Performance] Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      });
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long task API not supported
      }
      
      // Monitor layout shifts
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).hadRecentInput) continue;
          
          const layoutShiftScore = (entry as any).value;
          if (layoutShiftScore > 0.1) {
            console.warn('[Performance] Significant layout shift:', {
              value: layoutShiftScore,
              startTime: entry.startTime,
              sources: (entry as any).sources,
            });
          }
        }
      });
      
      try {
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // Layout shift API not supported
      }
      
      return () => {
        longTaskObserver.disconnect();
        layoutShiftObserver.disconnect();
      };
    }
  }, []);
}

// Component to track route changes and performance
export function RoutePerformanceTracker({ route }: { route: string }) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const routeLoadTime = endTime - startTime;
      
      if (routeLoadTime > 2000) { // Routes taking longer than 2 seconds
        console.warn(`[Performance] Slow route transition to ${route}:`, {
          duration: routeLoadTime,
          route,
        });
      }
    };
  }, [route]);
  
  return null;
}

// Hook to track component render performance
export function useRenderTracking(componentName: string) {
  useEffect(() => {
    const renderStart = performance.now();
    
    return () => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      if (renderTime > 16) { // Renders taking longer than 16ms (60fps threshold)
        console.log(`[Render Performance] ${componentName}:`, {
          duration: renderTime,
          timestamp: renderStart,
        });
      }
    };
  });
}