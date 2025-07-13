import { Suspense } from 'react';
import { CoachClientsPage } from '@/components/coach/clients-page';
import { CoachRoute } from '@/components/auth/route-guard';

export default function CoachClientsPageRoute() {
  return (
    <CoachRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading clients...</div>}>
          <CoachClientsPage />
        </Suspense>
      </div>
    </CoachRoute>
  );
}