'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { collectWebVitals, PerformanceMonitor, checkPerformanceBudget } from '@/lib/performance/web-vitals';
import { monitorMemoryUsage } from '@/lib/performance/optimization';
import { trackPerformance } from '@/lib/monitoring/analytics';

interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usage: number;
}

interface BudgetStatus {
  passed: boolean;
  violations: Array<{
    metric: string;
    value: number;
    budget: number;
    violation: number;
  }>;
}

interface PerformanceData {
  webVitals: Record<string, number>;
  memoryUsage: MemoryUsage | null;
  budgetStatus: BudgetStatus | null;
  longTasks: PerformanceEntry[];
  layoutShifts: PerformanceEntry[];
}

// Maximum entries to keep in arrays to prevent memory leaks
const MAX_ENTRIES = 50; // Reduced for better memory management
const MEMORY_CHECK_INTERVAL = 10000; // 10 seconds
const BUDGET_CHECK_INTERVAL = 30000; // 30 seconds
const CLEANUP_INTERVAL = 60000; // 1 minute

export function PerformanceMonitorComponent() {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    webVitals: {},
    memoryUsage: null,
    budgetStatus: null,
    longTasks: [],
    layoutShifts: [],
  });
  
  // Use refs to track intervals and observers for proper cleanup
  const memoryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const budgetIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const monitorRef = useRef<InstanceType<typeof PerformanceMonitor> | null>(null);
  
  // Memoized cleanup function to prevent excessive array operations
  const cleanupData = useCallback(() => {
    setPerformanceData(prev => {
      // Only update if arrays are getting large
      if (prev.longTasks.length <= MAX_ENTRIES && prev.layoutShifts.length <= MAX_ENTRIES) {
        return prev;
      }
      
      return {
        ...prev,
        longTasks: prev.longTasks.slice(-MAX_ENTRIES),
        layoutShifts: prev.layoutShifts.slice(-MAX_ENTRIES),
      };
    });
  }, []);

  useEffect(() => {
    // Initialize monitor only once
    if (!monitorRef.current) {
      monitorRef.current = PerformanceMonitor.getInstance();
    }
    const monitor = monitorRef.current;
    
    // Collect Web Vitals with throttling to prevent excessive updates
    const webVitalsThrottle = new Map<string, number>();
    collectWebVitals((metric) => {
      const lastUpdate = webVitalsThrottle.get(metric.name) || 0;
      const now = Date.now();
      
      // Throttle updates to once per second per metric
      if (now - lastUpdate < 1000) return;
      
      webVitalsThrottle.set(metric.name, now);
      
      setPerformanceData(prev => ({
        ...prev,
        webVitals: {
          ...prev.webVitals,
          [metric.name]: metric.value,
        },
      }));
      
      // Track performance metric
      trackPerformance(metric.name, metric.value, window.location.pathname);
    });

    // Monitor long tasks with better memory management
    monitor.observeLongTasks((entries) => {
      if (entries.length === 0) return;
      
      setPerformanceData(prev => {
        const newLongTasks = [...prev.longTasks, ...entries];
        // Only keep the most recent entries
        const trimmedTasks = newLongTasks.length > MAX_ENTRIES 
          ? newLongTasks.slice(-MAX_ENTRIES) 
          : newLongTasks;
          
        return {
          ...prev,
          longTasks: trimmedTasks,
        };
      });
      
      // Process entries without storing them all in memory
      entries.forEach(entry => {
        if (entry.duration > 50) {
          trackPerformance('long_task', entry.duration, window.location.pathname);
        }
      });
    });

    // Monitor layout shifts with better memory management
    monitor.observeLayoutShifts((entries) => {
      if (entries.length === 0) return;
      
      setPerformanceData(prev => {
        const newLayoutShifts = [...prev.layoutShifts, ...entries];
        // Only keep the most recent entries
        const trimmedShifts = newLayoutShifts.length > MAX_ENTRIES 
          ? newLayoutShifts.slice(-MAX_ENTRIES) 
          : newLayoutShifts;
          
        return {
          ...prev,
          layoutShifts: trimmedShifts,
        };
      });
    });

    // Monitor memory usage with proper interval management
    memoryIntervalRef.current = setInterval(() => {
      const memoryUsage = monitorMemoryUsage();
      if (memoryUsage) {
        setPerformanceData(prev => ({
          ...prev,
          memoryUsage,
        }));
        
        // Alert if memory usage is high
        if (memoryUsage.usage > 80) {
          trackPerformance('high_memory_usage', memoryUsage.usage, window.location.pathname);
        }
      }
    }, MEMORY_CHECK_INTERVAL);

    // Check performance budget with proper interval management
    budgetIntervalRef.current = setInterval(() => {
      setPerformanceData(prev => {
        const budgetStatus = checkPerformanceBudget(prev.webVitals);
        return {
          ...prev,
          budgetStatus,
        };
      });
    }, BUDGET_CHECK_INTERVAL);
    
    // Periodic cleanup to prevent memory leaks
    cleanupIntervalRef.current = setInterval(cleanupData, CLEANUP_INTERVAL);

    // Cleanup function
    return () => {
      // Disconnect monitor
      if (monitor) {
        monitor.disconnect();
      }
      
      // Clear all intervals
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current);
        memoryIntervalRef.current = null;
      }
      
      if (budgetIntervalRef.current) {
        clearInterval(budgetIntervalRef.current);
        budgetIntervalRef.current = null;
      }
      
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
      
      // Clear throttle maps
      webVitalsThrottle.clear();
    };
  }, [cleanupData]); // Only depend on cleanupData callback

  // Additional cleanup on unmount
  useEffect(() => {
    return () => {
      // Final cleanup when component unmounts
      setPerformanceData({
        webVitals: {},
        memoryUsage: null,
        budgetStatus: null,
        longTasks: [],
        layoutShifts: [],
      });
    };
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-50">
      <div className="mb-2 font-bold">Performance Monitor</div>
      
      {/* Web Vitals */}
      <div className="mb-2">
        <div className="font-semibold">Web Vitals:</div>
        {Object.entries(performanceData.webVitals).map(([name, value]) => (
          <div key={name} className="flex justify-between">
            <span>{name}:</span>
            <span className={getVitalColor(name, value)}>{Math.round(value)}</span>
          </div>
        ))}
      </div>

      {/* Memory Usage */}
      {performanceData.memoryUsage && (
        <div className="mb-2">
          <div className="font-semibold">Memory:</div>
          <div className="flex justify-between">
            <span>Used:</span>
            <span>{Math.round(performanceData.memoryUsage.usage)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Heap:</span>
            <span>{formatBytes(performanceData.memoryUsage.usedJSHeapSize)}</span>
          </div>
        </div>
      )}

      {/* Long Tasks */}
      <div className="mb-2">
        <div className="font-semibold">Long Tasks:</div>
        <div>{performanceData.longTasks.length} detected</div>
      </div>

      {/* Layout Shifts */}
      <div className="mb-2">
        <div className="font-semibold">Layout Shifts:</div>
        <div>{performanceData.layoutShifts.length} detected</div>
      </div>

      {/* Budget Status */}
      {performanceData.budgetStatus && (
        <div>
          <div className="font-semibold">Budget:</div>
          <div className={performanceData.budgetStatus.passed ? 'text-green-400' : 'text-red-400'}>
            {performanceData.budgetStatus.passed ? 'Passed' : 'Failed'}
          </div>
          {performanceData.budgetStatus.violations.length > 0 && (
            <div className="text-red-400 text-xs">
              {performanceData.budgetStatus.violations.length} violation(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getVitalColor(name: string, value: number): string {
  const thresholds: Record<string, { good: number; poor: number }> = {
    CLS: { good: 0.1, poor: 0.25 },
    FID: { good: 100, poor: 300 },
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[name];
  if (!threshold) return 'text-gray-400';

  if (value <= threshold.good) return 'text-green-400';
  if (value <= threshold.poor) return 'text-yellow-400';
  return 'text-red-400';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}