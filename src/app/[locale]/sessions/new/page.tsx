import { Suspense } from 'react';

import { RouteGuard } from '@/components/auth/route-guard';
import { SessionCreatePage } from '@/components/sessions/session-create-page';

export default function SessionCreateRoute() {
  return (
    <RouteGuard requireAuth={true}>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading session creator...</div>}>
          <SessionCreatePage />
        </Suspense>
      </div>
    </RouteGuard>
  );
}