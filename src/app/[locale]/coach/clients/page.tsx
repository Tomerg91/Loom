import { Suspense } from 'react';
import { CoachClientsPage } from '@/components/coach/clients-page';
import { CoachOrAdminRoute } from '@/components/auth/route-guard';

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