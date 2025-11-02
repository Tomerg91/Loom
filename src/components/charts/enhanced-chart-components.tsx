'use client';

/**
 * Enhanced Chart Components (Lazy-Loaded)
 *
 * This file exports dynamically imported enhanced chart components to reduce initial bundle size.
 * The actual chart implementations with recharts are in enhanced-chart-components.inner.tsx
 * and are loaded on-demand when charts are displayed.
 *
 * @module components/charts/enhanced-chart-components
 */

import dynamic from 'next/dynamic';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Loading skeleton for charts
const ChartLoadingSkeleton = ({ height = 400 }: { height?: number }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="bg-gray-100 rounded animate-pulse" style={{ height: `${height}px` }} />
    </CardContent>
  </Card>
);

// Dynamically import enhanced chart components with recharts
// ssr: false ensures charts only load on client side
export const EnhancedUserGrowthChart = dynamic(
  () => import('./enhanced-chart-components.inner').then(mod => ({ default: mod.EnhancedUserGrowthChart })),
  {
    loading: () => <ChartLoadingSkeleton height={400} />,
    ssr: false
  }
);

export const EnhancedSessionMetricsChart = dynamic(
  () => import('./enhanced-chart-components.inner').then(mod => ({ default: mod.EnhancedSessionMetricsChart })),
  {
    loading: () => <ChartLoadingSkeleton height={400} />,
    ssr: false
  }
);

// Re-export types
export type {
  EnhancedUserGrowthChartProps,
  EnhancedSessionMetricsChartProps,
} from './enhanced-chart-components.inner';
