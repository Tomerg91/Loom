'use client';

import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';

// Web Vitals thresholds (Google's recommendations)
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (replaced FID in 2024)
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

// Performance data storage
interface PerformanceData {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userId?: string;
  sessionId: string;
}

class WebVitalsMonitor {
  private performanceData: PerformanceData[] = [];
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeMonitoring();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public setUserId(userId: string) {
    this.userId = userId;
  }

  private initializeMonitoring() {
    if (typeof window === 'undefined') return;

    // Core Web Vitals with error handling and browser compatibility
    this.initializeCoreWebVitals();

    // Custom performance monitoring
    this.monitorRouteChanges();
    this.monitorResourceLoading();
    this.monitorAPIPerformance();
  }

  private initializeCoreWebVitals() {
    try {
      // Cumulative Layout Shift - Available in all modern browsers
      onCLS(this.handleMetric.bind(this), { reportAllChanges: true });
      
      // Largest Contentful Paint - Available in Chromium-based browsers
      onLCP(this.handleMetric.bind(this), { reportAllChanges: true });
      
      // First Contentful Paint - Available in Chromium-based browsers
      onFCP(this.handleMetric.bind(this), { reportAllChanges: true });
      
      // Interaction to Next Paint - Available in Chromium-based browsers
      onINP(this.handleMetric.bind(this), { reportAllChanges: true });
      
      // Time to First Byte - Available in all browsers with Navigation Timing API
      onTTFB(this.handleMetric.bind(this), { reportAllChanges: true });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Web Vitals monitoring initialized successfully');
      }
    } catch (error) {
      console.warn('Failed to initialize Web Vitals monitoring:', error);
      
      // Report the initialization error but don't break the application
      if (typeof window !== 'undefined' && 'Sentry' in window) {
        (window as unknown).Sentry.captureException(error, {
          tags: { component: 'web-vitals-monitor' },
        });
      }
    }
  }

  private handleMetric(metric: Metric) {
    const rating = this.getMetricRating(metric.name as keyof typeof THRESHOLDS, metric.value);
    
    const performanceData: PerformanceData = {
      metric: metric.name,
      value: metric.value,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.performanceData.push(performanceData);
    this.reportMetric(performanceData);
    
    // Log additional metric details in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Web Vitals Metric:', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        entries: metric.entries,
      });
    }
  }

  private getMetricRating(metricName: keyof typeof THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[metricName];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private reportMetric(data: PerformanceData) {
    try {
      // Send to Google Analytics
      this.sendToGoogleAnalytics(data);
      
      // Send to Sentry for monitoring
      this.sendToSentry(data);
      
      // Send to Next.js Analytics (if available)
      this.sendToNextJSAnalytics(data);
      
      // Log performance issues in development
      if (process.env.NODE_ENV === 'development') {
        const color = data.rating === 'good' ? 'green' : data.rating === 'needs-improvement' ? 'orange' : 'red';
        console.log(
          `%c${data.metric}: ${data.value.toFixed(2)}ms (${data.rating})`,
          `color: ${color}; font-weight: bold;`
        );
      }

      // Send to API for server-side analytics
      this.sendToAPI(data);
    } catch (error) {
      console.warn('Error reporting metric:', error);
      
      // Don't let reporting errors break the monitoring
      if (typeof window !== 'undefined' && 'Sentry' in window) {
        (window as unknown).Sentry.captureException(error, {
          tags: { component: 'web-vitals-reporter' },
        });
      }
    }
  }

  private sendToGoogleAnalytics(data: PerformanceData) {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      try {
        (window as unknown).gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: data.metric,
          value: Math.round(data.value),
          custom_map: {
            rating: data.rating,
            session_id: data.sessionId,
            user_id: data.userId,
          },
        });
      } catch (error) {
        console.warn('Failed to send to Google Analytics:', error);
      }
    }
  }

  private sendToSentry(data: PerformanceData) {
    if (typeof window !== 'undefined' && 'Sentry' in window) {
      try {
        (window as unknown).Sentry.addBreadcrumb({
          category: 'performance',
          message: `${data.metric}: ${data.value.toFixed(2)}ms (${data.rating})`,
          level: data.rating === 'poor' ? 'warning' : 'info',
          data: {
            metric: data.metric,
            value: data.value,
            rating: data.rating,
            url: data.url,
          },
        });
      } catch (error) {
        console.warn('Failed to send to Sentry:', error);
      }
    }
  }

  private sendToNextJSAnalytics(data: PerformanceData) {
    // Next.js Analytics integration
    if (typeof window !== 'undefined' && 'NextWebVitalsMetric' in window) {
      try {
        (window as unknown).NextWebVitalsMetric({
          id: data.metric,
          label: data.rating === 'good' ? 'web-vital' : 'poor-web-vital',
          name: data.metric,
          startTime: data.timestamp,
          value: data.value,
        });
      } catch (error) {
        console.warn('Failed to send to Next.js Analytics:', error);
      }
    }
  }

  private async sendToAPI(_data: PerformanceData) {
    try {
      // Batch requests to avoid overwhelming the server
      if (this.performanceData.length % 5 === 0) {
        const batch = this.performanceData.slice(-5);
        await fetch('/api/monitoring/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics: batch }),
        });
      }
    } catch (error) {
      // Silently fail - don't impact user experience
      console.warn('Failed to send performance data:', error);
    }
  }

  private monitorRouteChanges() {
    if (typeof window === 'undefined') return;

    let navigationStart = performance.now();
    
    // Monitor Next.js route changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      const result = originalPushState.apply(this, args);
      const navigationTime = performance.now() - navigationStart;
      
      webVitalsMonitor.reportCustomMetric('route_change', navigationTime);
      navigationStart = performance.now();
      
      return result;
    };

    history.replaceState = function(...args) {
      const result = originalReplaceState.apply(this, args);
      const navigationTime = performance.now() - navigationStart;
      
      webVitalsMonitor.reportCustomMetric('route_change', navigationTime);
      navigationStart = performance.now();
      
      return result;
    };

    // Listen for popstate events (back/forward)
    window.addEventListener('popstate', () => {
      const navigationTime = performance.now() - navigationStart;
      this.reportCustomMetric('route_change', navigationTime);
      navigationStart = performance.now();
    });
  }

  private monitorResourceLoading() {
    if (typeof window === 'undefined') return;

    // Monitor resource loading performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Monitor slow resources
          if (resourceEntry.duration > 1000) {
            this.reportCustomMetric('slow_resource', resourceEntry.duration, {
              resource_name: resourceEntry.name,
              resource_type: resourceEntry.initiatorType,
            });
          }
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch () {
      // Observer not supported in this browser
      console.warn('Performance observer not supported');
    }
  }

  private monitorAPIPerformance() {
    if (typeof window === 'undefined') return;

    // Intercept fetch requests to monitor API performance
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      
      try {
        const response = await originalFetch.apply(this, args);
        const duration = performance.now() - startTime;
        
        // Monitor API calls to our endpoints
        if (url.includes('/api/')) {
          webVitalsMonitor.reportCustomMetric('api_request', duration, {
            endpoint: url,
            status: response.status,
            method: args[1]?.method || 'GET',
          });
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        webVitalsMonitor.reportCustomMetric('api_request_error', duration, {
          endpoint: url,
          error: (error as Error).message,
        });
        throw error;
      }
    };
  }

  public reportCustomMetric(name: string, value: number, metadata?: Record<string, any>) {
    const data: PerformanceData = {
      metric: name,
      value,
      rating: this.getCustomMetricRating(name, value),
      timestamp: Date.now(),
      url: window.location.href,
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.performanceData.push(data);
    
    // Send to analytics with metadata
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as unknown).gtag('event', 'custom_performance', {
        event_category: 'Performance',
        event_label: name,
        value: Math.round(value),
        ...metadata,
      });
    }

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance: ${name} = ${value.toFixed(2)}ms`, metadata);
    }
  }

  private getCustomMetricRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    // Define thresholds for custom metrics
    const customThresholds: Record<string, { good: number; poor: number }> = {
      route_change: { good: 200, poor: 500 },
      api_request: { good: 500, poor: 2000 },
      slow_resource: { good: 1000, poor: 3000 },
    };

    const threshold = customThresholds[metricName];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  public getPerformanceReport(): {
    summary: Record<string, { average: number; count: number; rating: string }>;
    details: PerformanceData[];
  } {
    const summary: Record<string, { average: number; count: number; rating: string }> = {};
    
    // Group by metric
    for (const data of this.performanceData) {
      if (!summary[data.metric]) {
        summary[data.metric] = { average: 0, count: 0, rating: 'good' };
      }
      
      summary[data.metric].count++;
      summary[data.metric].average = 
        (summary[data.metric].average * (summary[data.metric].count - 1) + data.value) / 
        summary[data.metric].count;
      
      // Use worst rating
      if (data.rating === 'poor' || 
          (data.rating === 'needs-improvement' && summary[data.metric].rating === 'good')) {
        summary[data.metric].rating = data.rating;
      }
    }

    return {
      summary,
      details: this.performanceData,
    };
  }

  public clearData() {
    this.performanceData = [];
  }
}

// Global instance
export const webVitalsMonitor = new WebVitalsMonitor();

// Utility functions for manual performance tracking
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T extends Promise<unknown> ? Promise<T> : T {
  const startTime = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - startTime;
      webVitalsMonitor.reportCustomMetric(name, duration);
    }) as unknown;
  } else {
    const duration = performance.now() - startTime;
    webVitalsMonitor.reportCustomMetric(name, duration);
    return result as unknown;
  }
}

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  if (typeof window === 'undefined') return { startTracking: () => {}, endTracking: () => {} };

  let startTime: number;

  const startTracking = () => {
    startTime = performance.now();
  };

  const endTracking = () => {
    if (startTime) {
      const duration = performance.now() - startTime;
      webVitalsMonitor.reportCustomMetric(`component_${componentName}`, duration);
    }
  };

  return { startTracking, endTracking };
}

// Initialize monitoring when module loads
if (typeof window !== 'undefined') {
  // Wait for page load to avoid interfering with initial metrics
  window.addEventListener('load', () => {
    console.log('Web Vitals monitoring initialized');
  });
}