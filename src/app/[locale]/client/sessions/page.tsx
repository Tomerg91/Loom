import { Suspense } from 'react';
import { SessionsListPage } from '@/components/client/sessions-list-page';
import { ClientOrAdminRoute } from '@/components/auth/route-guard';

export default function ClientSessionsPage() {
  return (
    <ClientOrAdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading sessions...</div>}>
          <SessionsListPage />
        </Suspense>
      </div>
    </ClientOrAdminRoute>
  );
}

