import { Suspense } from 'react';
import { AdminRoute } from '@/components/auth/route-guard';
import { MfaHealthDashboard } from '@/components/admin/mfa-health-dashboard';
import { LoadingSpinner } from '@/components/lazy-components';

export const dynamic = 'force-dynamic';

export default function MfaHealthPage() {
  return (
    <AdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSpinner message="Loading MFA health dashboard..." />}>
          <MfaHealthDashboard />
        </Suspense>
      </div>
    </AdminRoute>
  );
}
