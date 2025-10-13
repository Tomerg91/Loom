import { Suspense } from 'react';

import { CoachOrAdminRoute } from '@/components/auth/route-guard';
import { CoachInsightsPage } from '@/components/coach/insights-page';

export default function CoachInsightsPageRoute() {
  return (
    <CoachOrAdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading insights...</div>}>
          <CoachInsightsPage />
        </Suspense>
      </div>
    </CoachOrAdminRoute>
  );
}