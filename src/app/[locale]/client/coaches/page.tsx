import { Suspense } from 'react';
import { ClientCoachesPage } from '@/components/client/coaches-page';
import { ClientOrAdminRoute } from '@/components/auth/route-guard';

export default function ClientCoachesPageRoute() {
  return (
    <ClientOrAdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <ClientCoachesPage />
        </Suspense>
      </div>
    </ClientOrAdminRoute>
  );
}