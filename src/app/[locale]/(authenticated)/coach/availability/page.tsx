import { Suspense } from 'react';

import { CoachOrAdminRoute } from '@/components/auth/route-guard';
import { AvailabilityManager } from '@/components/coach/availability-manager';

export default function CoachAvailabilityPage() {
  return (
    <CoachOrAdminRoute>
      <div className="container mx-auto py-6">
        <Suspense fallback={<div>Loading availability...</div>}>
          <AvailabilityManager />
        </Suspense>
      </div>
    </CoachOrAdminRoute>
  );
}