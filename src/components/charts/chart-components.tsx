'use client';

/**
 * Chart Components (Lazy-Loaded)
 *
 * This file exports dynamically imported chart components to reduce initial bundle size.
 * The actual chart implementations with recharts are in chart-components.inner.tsx
 * and are loaded on-demand when charts are displayed.
 *
 * For even more optimized loading, use the components from lazy-chart-components.tsx
 * which provide better loading states and error handling.
 *
 * @module components/charts/chart-components
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

// Dynamically import chart components with recharts
// ssr: false ensures charts only load on client side
export const UserGrowthChart = dynamic(
  () => import('./chart-components.inner').then(mod => ({ default: mod.UserGrowthChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

export const SessionMetricsChart = dynamic(
  () => import('./chart-components.inner').then(mod => ({ default: mod.SessionMetricsChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

export const RevenueChart = dynamic(
  () => import('./chart-components.inner').then(mod => ({ default: mod.RevenueChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

export const ProgressChart = dynamic(
  () => import('./chart-components.inner').then(mod => ({ default: mod.ProgressChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

export const GoalProgressChart = dynamic(
  () => import('./chart-components.inner').then(mod => ({ default: mod.GoalProgressChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

export const CompletionRateChart = dynamic(
  () => import('./chart-components.inner').then(mod => ({ default: mod.CompletionRateChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

// Re-export types and constants
export type {
  UserGrowthChartProps,
  SessionMetricsChartProps,
  RevenueChartProps,
  ProgressChartProps,
  GoalProgressChartProps,
  CompletionRateChartProps,
} from './chart-components.inner';

// Re-export constants and utilities for use by other chart components
export { CHART_COLORS, MULTI_COLORS, CustomTooltip } from './chart-components.inner';
