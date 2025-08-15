'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Loading skeleton for charts
const ChartSkeleton = ({ 
  title = "Loading chart...", 
  description, 
  className,
  height = 300 
}: {
  title?: string;
  description?: string;
  className?: string;
  height?: number;
}) => (
  <Card className={cn("animate-pulse", className)}>
    <CardHeader>
      <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
      {description && <div className="h-4 bg-gray-100 rounded w-48" />}
    </CardHeader>
    <CardContent>
      <div className={`bg-gray-100 rounded`} style={{ height: `${height}px` }} />
    </CardContent>
  </Card>
);

// Error fallback component
const ChartErrorFallback = ({ 
  title = "Chart Unavailable", 
  onRetry 
}: {
  title?: string;
  onRetry?: () => void;
}) => (
  <Card className="border-destructive/50">
    <CardContent className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-destructive mb-4">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-destructive">!</span>
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-muted-foreground mb-4">
        Unable to load chart component
      </p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Retry
        </button>
      )}
    </CardContent>
  </Card>
);

// Lazy-loaded chart components with optimized chunking
export const LazyUserGrowthChart = dynamic(
  () => import('./chart-components').then(mod => ({ 
    default: mod.UserGrowthChart 
  })),
  {
    loading: () => <ChartSkeleton title="Loading user growth chart..." />,
    ssr: false
  }
);

export const LazySessionMetricsChart = dynamic(
  () => import('./chart-components').then(mod => ({ 
    default: mod.SessionMetricsChart 
  })),
  {
    loading: () => <ChartSkeleton title="Loading session metrics chart..." />,
    ssr: false
  }
);

export const LazyRevenueChart = dynamic(
  () => import('./chart-components').then(mod => ({ 
    default: mod.RevenueChart 
  })),
  {
    loading: () => <ChartSkeleton title="Loading revenue chart..." />,
    ssr: false
  }
);

export const LazyProgressChart = dynamic(
  () => import('./chart-components').then(mod => ({ 
    default: mod.ProgressChart 
  })),
  {
    loading: () => <ChartSkeleton title="Loading progress chart..." />,
    ssr: false
  }
);

export const LazyGoalProgressChart = dynamic(
  () => import('./chart-components').then(mod => ({ 
    default: mod.GoalProgressChart 
  })),
  {
    loading: () => <ChartSkeleton title="Loading goal progress chart..." />,
    ssr: false
  }
);

export const LazyCompletionRateChart = dynamic(
  () => import('./chart-components').then(mod => ({ 
    default: mod.CompletionRateChart 
  })),
  {
    loading: () => <ChartSkeleton title="Loading completion rate chart..." />,
    ssr: false
  }
);

// Enhanced chart components with lazy loading
export const LazyEnhancedUserGrowthChart = dynamic(
  () => import('./enhanced-chart-components').then(mod => ({ 
    default: mod.EnhancedUserGrowthChart 
  })),
  {
    loading: () => <ChartSkeleton title="Loading enhanced user growth chart..." />,
    ssr: false
  }
);

export const LazyEnhancedSessionMetricsChart = dynamic(
  () => import('./enhanced-chart-components').then(mod => ({ 
    default: mod.EnhancedSessionMetricsChart 
  })),
  {
    loading: () => <ChartSkeleton title="Loading enhanced session metrics chart..." />,
    ssr: false
  }
);

// Dashboard charts bundle (combines multiple charts)
export const LazyDashboardCharts = dynamic(
  () => import('./dashboard-charts'),
  {
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton title="Loading dashboard charts..." />
        <ChartSkeleton title="Loading dashboard charts..." />
      </div>
    ),
    ssr: false
  }
);

// Wrapper component for better error handling and suspense
interface LazyChartWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

export const LazyChartWrapper = ({ 
  children, 
  fallback,
  onError 
}: LazyChartWrapperProps) => {
  try {
    return (
      <Suspense 
        fallback={fallback || <ChartSkeleton />}
      >
        {children}
      </Suspense>
    );
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    return <ChartErrorFallback onRetry={() => window.location.reload()} />;
  }
};

// High-level component for analytics dashboards
export const LazyAnalyticsDashboard = dynamic(
  () => import('../admin/analytics-page').then(mod => ({ 
    default: mod.AdminAnalyticsPage 
  })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-64 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    ),
    ssr: false
  }
);

// Export everything
export {
  ChartSkeleton,
  ChartErrorFallback
};