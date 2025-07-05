import { Suspense } from 'react';
import { AdminAnalyticsPage } from '@/components/admin/analytics-page';
import { AdminRoute } from '@/components/auth/route-guard';

export default function AdminAnalyticsPageRoute() {
  return (
    <AdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <AdminAnalyticsPage />
        </Suspense>
      </div>
    </AdminRoute>
  );
}