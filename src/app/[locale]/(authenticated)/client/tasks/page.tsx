import { Suspense } from 'react';

import { ClientOrAdminRoute } from '@/components/auth/route-guard';
import { ClientTaskBoard } from '@/modules/tasks/components';

export default function ClientTasksPageRoute() {
  return (
    <ClientOrAdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <ClientTaskBoard />
        </Suspense>
      </div>
    </ClientOrAdminRoute>
  );
}
