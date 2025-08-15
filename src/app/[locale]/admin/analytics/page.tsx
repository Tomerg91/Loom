import { Suspense } from 'react';
import { LazyAdminAnalytics, LoadingSpinner } from '@/components/lazy-components';
import { AdminRoute } from '@/components/auth/route-guard';

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