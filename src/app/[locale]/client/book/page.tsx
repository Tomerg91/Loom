import { Suspense } from 'react';
import { ClientBookPage } from '@/components/client/book-page';
import { ClientOrAdminRoute } from '@/components/auth/route-guard';

export default function ClientBookPageRoute() {
  return (
    <ClientOrAdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <ClientBookPage />
        </Suspense>
      </div>
    </ClientOrAdminRoute>
  );
}