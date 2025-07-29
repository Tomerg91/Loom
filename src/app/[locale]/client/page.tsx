import { Suspense } from 'react';
import { ClientDashboard } from '@/components/client/client-dashboard';
import { ClientOrAdminRoute } from '@/components/auth/route-guard';

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