import { Suspense } from 'react';

import { AdminRoute } from '@/components/auth/route-guard';
import { LazyAdminAnalytics, LoadingSpinner } from '@/components/lazy-components';

export default function AdminAnalyticsPageRoute() {
  return (
    <AdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSpinner message="Loading analytics dashboard..." />}>
          <LazyAdminAnalytics />
        </Suspense>
      </div>
    </AdminRoute>
  );
}