'use client';

import { Suspense, lazy, ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Ultra-lazy chart loading - only load on user interaction or viewport entry
const RechartsComponents = {
  AreaChart: lazy(() => import('recharts').then(mod => ({ default: mod.AreaChart }))),
  LineChart: lazy(() => import('recharts').then(mod => ({ default: mod.LineChart }))),
  BarChart: lazy(() => import('recharts').then(mod => ({ default: mod.BarChart }))),
  PieChart: lazy(() => import('recharts').then(mod => ({ default: mod.PieChart }))),
  Area: lazy(() => import('recharts').then(mod => ({ default: mod.Area }))),
  Line: lazy(() => import('recharts').then(mod => ({ default: mod.Line }))),
  Bar: lazy(() => import('recharts').then(mod => ({ default: mod.Bar }))),
  Pie: lazy(() => import('recharts').then(mod => ({ default: mod.Pie }))),
  Cell: lazy(() => import('recharts').then(mod => ({ default: mod.Cell }))),
  XAxis: lazy(() => import('recharts').then(mod => ({ default: mod.XAxis }))),
  YAxis: lazy(() => import('recharts').then(mod => ({ default: mod.YAxis }))),
  CartesianGrid: lazy(() => import('recharts').then(mod => ({ default: mod.CartesianGrid }))),
  Tooltip: lazy(() => import('recharts').then(mod => ({ default: mod.Tooltip }))),
  Legend: lazy(() => import('recharts').then(mod => ({ default: mod.Legend }))),
  ResponsiveContainer: lazy(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })))
};

interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

function ChartSkeleton({ height = 300, className }: ChartSkeletonProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading chart...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface OptimizedChartProps {
  type: keyof typeof RechartsComponents;
  data: any[];
  height?: number;
  className?: string;
  config: Record<string, any>;
  children?: React.ReactNode;
  sampleSize?: number; // Limit data points for better performance
  lazyThreshold?: number; // Delay before loading (ms)
}

export function OptimizedLazyChart({
  type,
  data,
  height = 300,
  className,
  config,
  children,
  sampleSize = 100,
  lazyThreshold = 0
}: OptimizedChartProps) {
  // Sample data if too large
  const sampledData = data.length > sampleSize 
    ? data.filter((_, index) => index % Math.ceil(data.length / sampleSize) === 0)
    : data;

  const ChartComponent = RechartsComponents[type];
  const ResponsiveContainer = RechartsComponents.ResponsiveContainer;

  if (lazyThreshold > 0) {
    // Add intersection observer for even lazier loading
    return (
      <div className={className} style={{ height }}>
        <Suspense fallback={<ChartSkeleton height={height} className={className} />}>
          <LazyChartWithIntersection
            ChartComponent={ChartComponent}
            ResponsiveContainer={ResponsiveContainer}
            data={sampledData}
            height={height}
            config={config}
            lazyThreshold={lazyThreshold}
          >
            {children}
          </LazyChartWithIntersection>
        </Suspense>
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <Suspense fallback={<ChartSkeleton height={height} className={className} />}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={sampledData} {...config}>
            {children}
          </ChartComponent>
        </ResponsiveContainer>
      </Suspense>
    </div>
  );
}

interface LazyChartWithIntersectionProps {
  ChartComponent: ComponentType<any>;
  ResponsiveContainer: ComponentType<any>;
  data: any[];
  height: number;
  config: Record<string, any>;
  children?: React.ReactNode;
  lazyThreshold: number;
}

function LazyChartWithIntersection({
  ChartComponent,
  ResponsiveContainer,
  data,
  height,
  config,
  children,
  lazyThreshold
}: LazyChartWithIntersectionProps) {
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Intersection Observer for viewport detection
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(container);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Load after threshold when visible
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShouldLoad(true), lazyThreshold);
      return () => clearTimeout(timer);
    }
  }, [isVisible, lazyThreshold]);

  if (!shouldLoad) {
    return (
      <div ref={containerRef} style={{ height }}>
        <ChartSkeleton height={height} />
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={data} {...config}>
          {children}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

// Pre-built optimized chart components
export function OptimizedAreaChart(props: Omit<OptimizedChartProps, 'type'>) {
  return <OptimizedLazyChart {...props} type="AreaChart" />;
}

export function OptimizedLineChart(props: Omit<OptimizedChartProps, 'type'>) {
  return <OptimizedLazyChart {...props} type="LineChart" />;
}

export function OptimizedBarChart(props: Omit<OptimizedChartProps, 'type'>) {
  return <OptimizedLazyChart {...props} type="BarChart" />;
}

export function OptimizedPieChart(props: Omit<OptimizedChartProps, 'type'>) {
  return <OptimizedLazyChart {...props} type="PieChart" />;
}

// Chart component exports for dynamic imports
export { RechartsComponents };

// React import for hooks
import React from 'react';