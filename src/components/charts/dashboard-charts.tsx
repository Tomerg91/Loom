'use client';

/**
 * Dashboard Charts (Lazy-Loaded)
 *
 * This file exports dynamically imported chart components to reduce initial bundle size.
 * The actual chart implementations with recharts are in dashboard-charts.inner.tsx
 * and are loaded on-demand when charts are displayed.
 *
 * @module components/charts/dashboard-charts
 */

import dynamic from 'next/dynamic';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Loading skeleton for charts
const ChartLoadingSkeleton = ({ height = 300 }: { height?: number }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="bg-gray-100 rounded animate-pulse" style={{ height: `${height}px` }} />
    </CardContent>
  </Card>
);

// Dynamically import individual chart components
export const CoachPerformanceChart = dynamic(
  () => import('./dashboard-charts.inner').then(mod => ({ default: mod.CoachPerformanceChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

export const SessionTimeDistributionChart = dynamic(
  () => import('./dashboard-charts.inner').then(mod => ({ default: mod.SessionTimeDistributionChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

export const ClientProgressCorrelationChart = dynamic(
  () => import('./dashboard-charts.inner').then(mod => ({ default: mod.ClientProgressCorrelationChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

export const RetentionRateChart = dynamic(
  () => import('./dashboard-charts.inner').then(mod => ({ default: mod.RetentionRateChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

export const GoalCategoryChart = dynamic(
  () => import('./dashboard-charts.inner').then(mod => ({ default: mod.GoalCategoryChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

// Default export for dashboard charts bundle
const DashboardChartsBundle = dynamic(
  () => import('./dashboard-charts.inner'),
  {
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartLoadingSkeleton />
        <ChartLoadingSkeleton />
      </div>
    ),
    ssr: false
  }
);

export default DashboardChartsBundle;
