/**
 * Resource Library Analytics Dashboard Page
 *
 * Comprehensive analytics for resource library usage:
 * - Top performing resources by views/completions
 * - Client engagement metrics
 * - Resource ROI (progress correlation)
 * - Category performance breakdown
 * - Trend analysis over time
 *
 * Note: Analytics may show cached data; refresh updates stats
 *
 * @module app/[locale]/coach/resources/analytics/page
 */

import { Suspense } from 'react';
import { CoachRoute } from '@/components/auth/route-guard';
import { ResourceAnalyticsDashboard } from '@/components/resources/resource-analytics-dashboard';
import { LoadingSpinner } from '@/components/lazy-components';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Resource Analytics | Loom',
  description: 'View analytics and insights for your resource library',
};

export default function ResourceAnalyticsPage() {
  return (
    <CoachRoute>
      <Suspense fallback={<LoadingSpinner message="Loading analytics..." />}>
        <ResourceAnalyticsDashboard />
      </Suspense>
    </CoachRoute>
  );
}
