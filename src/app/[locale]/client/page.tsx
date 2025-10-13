import { Suspense } from 'react';

import { ClientOrAdminRoute } from '@/components/auth/route-guard';
import { ClientDashboard } from '@/components/client/client-dashboard';

export default function ClientPage() {
  return (
    <ClientOrAdminRoute>
      <div className="container mx-auto py-6">
        <Suspense fallback={<div>Loading dashboard...</div>}>
          <ClientDashboard />
        </Suspense>
      </div>
    </ClientOrAdminRoute>
  );
}