'use client';

import { useEffect, useState } from 'react';
import { collectWebVitals, PerformanceMonitor, checkPerformanceBudget } from '@/lib/performance/web-vitals';
import { monitorMemoryUsage } from '@/lib/performance/optimization';
import { trackPerformance } from '@/lib/monitoring/analytics';

interface PerformanceData {
  webVitals: Record<string, number>;
  memoryUsage: any;
  budgetStatus: any;
  longTasks: PerformanceEntry[];
  layoutShifts: PerformanceEntry[];
}

export function PerformanceMonitorComponent() {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    webVitals: {},
    memoryUsage: null,
    budgetStatus: null,
    longTasks: [],
    layoutShifts: [],
  });

  useEffect(() => {
    const monitor = PerformanceMonitor.getInstance();
    
    // Collect Web Vitals
    collectWebVitals((metric) => {
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

    // Monitor long tasks
    monitor.observeLongTasks((entries) => {
      setPerformanceData(prev => ({
        ...prev,
        longTasks: [...prev.longTasks, ...entries],
      }));
      
      entries.forEach(entry => {
        if (entry.duration > 50) {
          trackPerformance('long_task', entry.duration, window.location.pathname);
        }
      });
    });

    // Monitor layout shifts
    monitor.observeLayoutShifts((entries) => {
      setPerformanceData(prev => ({
        ...prev,
        layoutShifts: [...prev.layoutShifts, ...entries],
      }));
    });

    // Monitor memory usage
    const memoryInterval = setInterval(() => {
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
    }, 10000); // Check every 10 seconds

    // Check performance budget
    const budgetInterval = setInterval(() => {
      const budgetStatus = checkPerformanceBudget(performanceData.webVitals);
      setPerformanceData(prev => ({
        ...prev,
        budgetStatus,
      }));
    }, 30000); // Check every 30 seconds

    return () => {
      monitor.disconnect();
      clearInterval(memoryInterval);
      clearInterval(budgetInterval);
    };
  }, [performanceData.webVitals]);

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