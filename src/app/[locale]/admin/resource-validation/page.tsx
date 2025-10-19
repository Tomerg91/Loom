import { Suspense } from 'react';
import { AdminRoute } from '@/components/auth/route-guard';
import { ResourceValidationReport } from '@/components/admin/resource-validation-report';
import { LoadingSpinner } from '@/components/lazy-components';

export const dynamic = 'force-dynamic';

export default function ResourceValidationPage() {
  return (
    <AdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSpinner message="Loading validation report..." />}>
          <ResourceValidationReport />
        </Suspense>
      </div>
    </AdminRoute>
  );
}
