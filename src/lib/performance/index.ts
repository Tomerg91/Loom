// Performance optimization exports
export * from './optimization';
export * from './lazy-loading'; 
export * from './caching';
export * from './web-vitals-monitor';
export * from './database-optimization';

// Re-export commonly used optimizations
export { 
  // Lazy loading
  LazyComponents,
  preloadComponentsByRole,
  preloadRouteComponents,
  
  // Caching
  cachedSessionOperations,
  cachedUserOperations,
  cachedAnalyticsOperations,
  cachedNotificationOperations,
  ClientCache,
  invalidateCache,
  invalidateUserCache,
  invalidateSessionCache,
  
  // Database optimization
  dbOptimizer,
  withDatabaseOptimization,
  
  // Web vitals monitoring
  webVitalsMonitor,
  measurePerformance,
  usePerformanceTracking,
  
  // General optimizations
  debounce,
  throttle,
  advancedDebounce,
  advancedThrottle,
  deduplicateRequest,
  performanceMiddleware,
  preloadResource,
  preloadRoute,
} from './optimization';

// Bundle analyzer script
export const analyzeBundleScript = `
  if (process.env.ANALYZE === 'true') {
    const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
    
    module.exports = {
      webpack: (config, { isServer }) => {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: isServer 
              ? '../analyze/server.html' 
              : './analyze/client.html',
          })
        );
        return config;
      },
    };
  }
`;

// Performance configuration constants
export const PERFORMANCE_CONFIG = {
  // Image optimization
  IMAGE_SIZES: [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920],
  IMAGE_FORMATS: ['image/avif', 'image/webp'],
  IMAGE_QUALITY: {
    low: 50,
    medium: 75,
    high: 90,
  },
  
  // Caching durations (in seconds)
  CACHE_DURATIONS: {
    STATIC: 31536000, // 1 year
    DYNAMIC: 3600,    // 1 hour
    API: 300,         // 5 minutes
    USER: 60,         // 1 minute
  },
  
  // Performance thresholds
  THRESHOLDS: {
    LCP: 2500,        // Largest Contentful Paint (ms)
    FID: 100,         // First Input Delay (ms)
    CLS: 0.1,         // Cumulative Layout Shift
    TTFB: 800,        // Time to First Byte (ms)
    FCP: 1800,        // First Contentful Paint (ms)
  },
  
  // Bundle size limits (in bytes)
  BUNDLE_LIMITS: {
    JAVASCRIPT: 250000,  // 250KB
    CSS: 50000,          // 50KB
    TOTAL: 500000,       // 500KB
  },
  
  // Database query limits
  QUERY_LIMITS: {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
    BATCH_SIZE: 100,
    TIMEOUT: 30000,      // 30 seconds
  },
} as const;

// Performance utilities
export const PerformanceUtils = {
  // Format bytes to human readable
  formatBytes: (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },
  
  // Format duration to human readable
  formatDuration: (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  },
  
  // Calculate performance score (0-100)
  calculatePerformanceScore: (metrics: {
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
    fcp?: number;
  }): number => {
    const scores: number[] = [];
    
    if (metrics.lcp !== undefined) {
      scores.push(metrics.lcp <= 2500 ? 100 : metrics.lcp <= 4000 ? 50 : 0);
    }
    
    if (metrics.fid !== undefined) {
      scores.push(metrics.fid <= 100 ? 100 : metrics.fid <= 300 ? 50 : 0);
    }
    
    if (metrics.cls !== undefined) {
      scores.push(metrics.cls <= 0.1 ? 100 : metrics.cls <= 0.25 ? 50 : 0);
    }
    
    if (metrics.ttfb !== undefined) {
      scores.push(metrics.ttfb <= 800 ? 100 : metrics.ttfb <= 1800 ? 50 : 0);
    }
    
    if (metrics.fcp !== undefined) {
      scores.push(metrics.fcp <= 1800 ? 100 : metrics.fcp <= 3000 ? 50 : 0);
    }
    
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;
  },
  
  // Check if device has limited resources
  isLowEndDevice: (): boolean => {
    if (typeof navigator === 'undefined') return false;
    
    // Check memory (if available)
    const memory = (navigator as any).deviceMemory;
    if (memory && memory <= 4) return true;
    
    // Check connection (if available)
    const connection = (navigator as any).connection;
    if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
      return true;
    }
    
    // Check hardware concurrency
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
      return true;
    }
    
    return false;
  },
  
  // Get optimal image format
  getOptimalImageFormat: (): 'avif' | 'webp' | 'jpg' => {
    if (typeof window === 'undefined') return 'jpg';
    
    // Check AVIF support
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      const avifSupport = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
      if (avifSupport) return 'avif';
    } catch {
      // AVIF not supported
    }
    
    try {
      const webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      if (webpSupport) return 'webp';
    } catch {
      // WebP not supported
    }
    
    return 'jpg';
  },
};

// Performance monitoring hooks for React
export const usePerformanceMonitoring = () => {
  if (typeof window === 'undefined') {
    return {
      trackEvent: () => {},
      trackTiming: () => {},
      getMetrics: () => ({}),
    };
  }
  
  return {
    trackEvent: (name: string, properties?: Record<string, any>) => {
      if ('gtag' in window) {
        (window as any).gtag('event', name, properties);
      }
    },
    
    trackTiming: (name: string, duration: number) => {
      if ('gtag' in window) {
        (window as any).gtag('event', 'timing_complete', {
          name,
          value: Math.round(duration),
        });
      }
    },
    
    getMetrics: () => {
      const memory = (performance as any).memory;
      return {
        memory: memory ? {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        } : null,
        timing: performance.timing,
        navigation: performance.navigation,
      };
    },
  };
};