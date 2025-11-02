'use client';

/**
 * Resource Library Analytics Chart Components (Lazy-Loaded)
 *
 * This file exports dynamically imported chart components to reduce initial bundle size.
 * The actual chart implementations with recharts are in analytics-charts.inner.tsx
 * and are loaded on-demand when charts are displayed.
 *
 * @module components/resources/analytics-charts
 */

import dynamic from 'next/dynamic';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Loading skeleton for charts
const ChartLoadingSkeleton = ({ height = 300 }: { height?: number }) => (
  <Card>
    <CardHeader>
      <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
      <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="bg-gray-100 rounded animate-pulse" style={{ height: `${height}px` }} />
    </CardContent>
  </Card>
);

// Dynamically import chart components with recharts
// ssr: false ensures charts only load on client side, reducing server-side bundle
export const TopResourcesChart = dynamic(
  () => import('./analytics-charts.inner').then(mod => ({ default: mod.TopResourcesChart })),
  {
    loading: () => <ChartLoadingSkeleton height={350} />,
    ssr: false
  }
);

export const CategoryPerformanceChart = dynamic(
  () => import('./analytics-charts.inner').then(mod => ({ default: mod.CategoryPerformanceChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

export const EngagementTrendsChart = dynamic(
  () => import('./analytics-charts.inner').then(mod => ({ default: mod.EngagementTrendsChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

export const CompletionRateChart = dynamic(
  () => import('./analytics-charts.inner').then(mod => ({ default: mod.CompletionRateChart })),
  {
    loading: () => <ChartLoadingSkeleton height={250} />,
    ssr: false
  }
);

export const ResourceROIChart = dynamic(
  () => import('./analytics-charts.inner').then(mod => ({ default: mod.ResourceROIChart })),
  {
    loading: () => <ChartLoadingSkeleton height={300} />,
    ssr: false
  }
);

// Re-export types if needed
export type { ResourcePerformanceSummary, CategoryAnalytics } from '@/types/resources';
