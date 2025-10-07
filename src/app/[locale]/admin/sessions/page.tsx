import { Suspense } from 'react';
import { LazyAdminSessions, LoadingSpinner } from '@/components/lazy-components';
import { AdminRoute } from '@/components/auth/route-guard';

// Force dynamic rendering to avoid prerender issues with event handlers
export const dynamic = 'force-dynamic';

export default function AdminSessionsPageRoute() {
  return (
    <AdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSpinner message="Loading sessions management..." />}>
          <LazyAdminSessions />
        </Suspense>
      </div>
    </AdminRoute>
  );
}
