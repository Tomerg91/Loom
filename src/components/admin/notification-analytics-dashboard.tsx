'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Loading skeleton for the dashboard
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  </div>
);

// Dynamic import of the dashboard inner component
const NotificationAnalyticsDashboardInner = dynamic(
  () => import('./notification-analytics-dashboard.inner').then(mod => ({ default: mod.NotificationAnalyticsDashboard })),
  {
    ssr: false,
    loading: () => <DashboardSkeleton />
  }
);

export function NotificationAnalyticsDashboard() {
  return <NotificationAnalyticsDashboardInner />;
}
