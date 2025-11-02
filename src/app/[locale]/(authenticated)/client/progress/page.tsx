import { Suspense } from 'react';

import { ClientOrAdminRoute } from '@/components/auth/route-guard';
import { ClientProgressPage } from '@/components/client/progress-page';

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