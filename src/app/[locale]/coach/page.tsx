import { Suspense } from 'react';

import { CoachOrAdminRoute } from '@/components/auth/route-guard';
import { CoachDashboard } from '@/components/coach/coach-dashboard';

export default function CoachPage() {
  return (
    <CoachOrAdminRoute>
      <div className="container mx-auto py-6">
        <Suspense fallback={<div>Loading dashboard...</div>}>
          <CoachDashboard />
        </Suspense>
      </div>
    </CoachOrAdminRoute>
  );
}