'use client';

import { AlertTriangle, Zap } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

// Performance optimization wrapper for large datasets
interface PerformanceOptimizedChartProps {
  children: React.ReactNode;
  data: any[];
  maxDataPoints?: number;
  enableVirtualization?: boolean;
  showPerformanceWarning?: boolean;
}

export const PerformanceOptimizedChart: React.FC<PerformanceOptimizedChartProps> = ({
  children,
  data,
  maxDataPoints = 100,
  enableVirtualization = true,
  showPerformanceWarning = true,
}) => {
  const [useOptimization, setUseOptimization] = useState(true);
  const [samplingRate, setSamplingRate] = useState(1);

  // Optimize data for large datasets
  const optimizedData = useMemo(() => {
    if (!enableVirtualization || !useOptimization || data.length <= maxDataPoints) {
      return data;
    }

    // Calculate optimal sampling rate
    const optimalRate = Math.ceil(data.length / maxDataPoints);
    setSamplingRate(optimalRate);

    // Sample data points evenly
    return data.filter((_, index) => index % optimalRate === 0);
  }, [data, maxDataPoints, useOptimization, enableVirtualization]);

  const isDataOptimized = optimizedData.length < data.length;
  const performanceImpact = data.length > 1000 ? 'high' : data.length > 500 ? 'medium' : 'low';

  return (
    <div className="space-y-2">
      {/* Performance indicators */}
      {showPerformanceWarning && data.length > maxDataPoints && (
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span>Large dataset detected ({data.length} points)</span>
            {isDataOptimized && (
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Optimized ({optimizedData.length} points)
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant={performanceImpact === 'high' ? 'destructive' : performanceImpact === 'medium' ? 'secondary' : 'default'}>
              {performanceImpact} impact
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUseOptimization(!useOptimization)}
            >
              {useOptimization ? 'Show All' : 'Optimize'}
            </Button>
          </div>
        </div>
      )}

      {/* Render optimized chart */}
      {React.isValidElement(children) &&
        React.cloneElement(children as React.ReactElement<{ data?: any[] }>, {
          data: optimizedData,
        })}

      {/* Performance info */}
      {isDataOptimized && (
        <div className="text-xs text-muted-foreground text-center">
          Showing {optimizedData.length} of {data.length} data points (sampling rate: 1:{samplingRate})
        </div>
      )}
    </div>
  );
};

// Hook for chart performance monitoring
export const useChartPerformance = () => {
  const [renderTime, setRenderTime] = useState<number>(0);
  const [dataPoints, setDataPoints] = useState<number>(0);

  const measurePerformance = (data: any[], operation: () => void) => {
    const startTime = performance.now();
    setDataPoints(data.length);
    
    operation();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    setRenderTime(duration);

    // Log performance metrics for debugging
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Chart Performance: ${duration.toFixed(2)}ms for ${data.length} points`);
      if (duration > 100) {
        logger.warn('Slow chart render detected. Consider data optimization.');
      }
    }
  };

  const getPerformanceMetrics = () => ({
    renderTime,
    dataPoints,
    pointsPerSecond: dataPoints / (renderTime / 1000),
    isOptimal: renderTime < 50, // Less than 50ms is considered optimal
  });

  return {
    measurePerformance,
    getPerformanceMetrics,
    renderTime,
    dataPoints,
  };
};

// Memory-efficient data processing utilities
export const chartUtils = {
  // Downsample data using Largest-Triangle-Three-Buckets algorithm (simplified)
  downsampleData: (data: any[], targetPoints: number, xKey = 'date', yKey = 'value') => {
    if (data.length <= targetPoints) return data;

    const bucketSize = Math.floor(data.length / targetPoints);
    const downsampled: any[] = [];

    // Always include first and last points
    downsampled.push(data[0]);

    for (let i = 1; i < targetPoints - 1; i++) {
      const bucketStart = i * bucketSize;
      const bucketEnd = Math.min((i + 1) * bucketSize, data.length);
      
      // Find the point with maximum area within the bucket
      let maxAreaIndex = bucketStart;
      let maxArea = 0;

      for (let j = bucketStart; j < bucketEnd; j++) {
        if (j === 0 || j === data.length - 1) continue;
        
        const prevPoint = data[j - 1];
        const currPoint = data[j];
        const nextPoint = data[j + 1];
        
        // Calculate triangle area
        const area = Math.abs(
          (prevPoint[xKey] - nextPoint[xKey]) * (currPoint[yKey] - prevPoint[yKey]) -
          (prevPoint[xKey] - currPoint[xKey]) * (nextPoint[yKey] - prevPoint[yKey])
        ) / 2;

        if (area > maxArea) {
          maxArea = area;
          maxAreaIndex = j;
        }
      }

      downsampled.push(data[maxAreaIndex]);
    }

    downsampled.push(data[data.length - 1]);
    return downsampled;
  },

  // Aggregate data by time periods
  aggregateByPeriod: (
    data: any[], 
    period: 'hour' | 'day' | 'week' | 'month',
    dateKey = 'date',
    valueKeys: string[] = ['value']
  ) => {
    const grouped = new Map<string, any[]>();

    data.forEach(item => {
      const date = new Date(item[dateKey]);
      let key: string;

      switch (period) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    });

    // Aggregate values
    return Array.from(grouped.entries()).map(([key, items]) => {
      const aggregated: any = { [dateKey]: items[0][dateKey] };
      
      valueKeys.forEach(valueKey => {
        aggregated[valueKey] = items.reduce((sum, item) => sum + (item[valueKey] || 0), 0);
      });

      return aggregated;
    });
  },
};