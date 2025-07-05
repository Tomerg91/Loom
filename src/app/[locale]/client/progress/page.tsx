import { Suspense } from 'react';
import { ClientProgressPage } from '@/components/client/progress-page';
import { ClientOrAdminRoute } from '@/components/auth/route-guard';

export default function ClientProgressPageRoute() {
  return (
    <ClientOrAdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <ClientProgressPage />
        </Suspense>
      </div>
    </ClientOrAdminRoute>
  );
}