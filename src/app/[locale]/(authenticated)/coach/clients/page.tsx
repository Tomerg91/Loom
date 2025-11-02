import { Suspense } from 'react';

import { CoachOrAdminRoute } from '@/components/auth/route-guard';
import { CoachClientsPage } from '@/components/coach/clients-page';

export default function CoachClientsPageRoute() {
  return (
    <CoachOrAdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading clients...</div>}>
          <CoachClientsPage />
        </Suspense>
      </div>
    </CoachOrAdminRoute>
  );
}