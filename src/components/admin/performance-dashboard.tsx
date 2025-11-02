'use client';

import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';

// Loading skeleton for the dashboard
const DashboardSkeleton = () => (
  <div className="flex items-center justify-center h-64">
    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
    <span className="ml-2">Loading performance metrics...</span>
  </div>
);

// Dynamic import of the dashboard inner component
const PerformanceDashboardInner = dynamic(
  () => import('./performance-dashboard.inner').then(mod => ({ default: mod.PerformanceDashboard })),
  {
    ssr: false,
    loading: () => <DashboardSkeleton />
  }
);

export function PerformanceDashboard() {
  return <PerformanceDashboardInner />;
}
