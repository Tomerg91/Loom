import { Suspense } from 'react';

import { ClientOrAdminRoute } from '@/components/auth/route-guard';
import { SessionsListPage } from '@/components/client/sessions-list-page';

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

