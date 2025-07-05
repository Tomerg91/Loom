import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import { trackWebVitals } from '@/lib/monitoring/analytics';

// Web Vitals thresholds
const VITALS_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

// Rating function
const getRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds = VITALS_THRESHOLDS[name as keyof typeof VITALS_THRESHOLDS];
  if (!thresholds) return 'good';
  
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
};

// Enhanced metric interface
interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: any[];
  id: string;
  navigationType: string;
}

// Web Vitals collection
export const collectWebVitals = (callback?: (metric: WebVital) => void) => {
  const reportMetric = (metric: any) => {
    const enhancedMetric: WebVital = {
      ...metric,
      rating: getRating(metric.name, metric.value),
    };
    
    // Track with analytics
    trackWebVitals(enhancedMetric);
    
    // Custom callback
    if (callback) {
      callback(enhancedMetric);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${metric.name}:`, {
        value: metric.value,
        rating: enhancedMetric.rating,
        delta: metric.delta,
      });
    }
  };

  // Collect all Core Web Vitals
  getCLS(reportMetric);
  getFID(reportMetric);
  getFCP(reportMetric);
  getLCP(reportMetric);
  getTTFB(reportMetric);
};

// Performance observer for custom metrics
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Monitor long tasks
  observeLongTasks(callback: (entries: PerformanceEntry[]) => void) {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      try {
        observer.observe({ entryTypes: ['longtask'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('Long task observer not supported');
      }
    }
  }

  // Monitor layout shifts
  observeLayoutShifts(callback: (entries: PerformanceEntry[]) => void) {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      try {
        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('Layout shift observer not supported');
      }
    }
  }

  // Monitor paint timing
  observePaintTiming(callback: (entries: PerformanceEntry[]) => void) {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      try {
        observer.observe({ entryTypes: ['paint'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('Paint timing observer not supported');
      }
    }
  }

  // Monitor resource loading
  observeResourceTiming(callback: (entries: PerformanceEntry[]) => void) {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      try {
        observer.observe({ entryTypes: ['resource'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('Resource timing observer not supported');
      }
    }
  }

  // Disconnect all observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Custom performance metrics
export const measureCustomMetric = (name: string, startTime: number) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Track the metric
  trackWebVitals({
    name: `custom_${name}`,
    value: duration,
    rating: duration < 1000 ? 'good' : duration < 3000 ? 'needs-improvement' : 'poor',
    delta: duration,
    entries: [],
    id: `custom_${name}_${Date.now()}`,
    navigationType: 'navigate',
  });
  
  return duration;
};

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const monitor = PerformanceMonitor.getInstance();
  
  const measureAsync = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await fn();
      measureCustomMetric(name, startTime);
      return result;
    } catch (error) {
      measureCustomMetric(`${name}_error`, startTime);
      throw error;
    }
  };

  const measureSync = <T>(name: string, fn: () => T): T => {
    const startTime = performance.now();
    try {
      const result = fn();
      measureCustomMetric(name, startTime);
      return result;
    } catch (error) {
      measureCustomMetric(`${name}_error`, startTime);
      throw error;
    }
  };

  return {
    monitor,
    measureAsync,
    measureSync,
  };
};

// Performance budget checker
export const checkPerformanceBudget = (metrics: Record<string, number>) => {
  const budgets = {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    FCP: 1800,
    TTFB: 800,
  };

  const violations = Object.entries(metrics)
    .filter(([metric, value]) => {
      const budget = budgets[metric as keyof typeof budgets];
      return budget && value > budget;
    })
    .map(([metric, value]) => ({
      metric,
      value,
      budget: budgets[metric as keyof typeof budgets],
      violation: value - budgets[metric as keyof typeof budgets],
    }));

  return {
    passed: violations.length === 0,
    violations,
  };
};