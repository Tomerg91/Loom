import { Suspense } from 'react';
import { CoachInsightsPage } from '@/components/coach/insights-page';
import { CoachOrAdminRoute } from '@/components/auth/route-guard';

export default function CoachInsightsPageRoute() {
  return (
    <CoachOrAdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <CoachInsightsPage />
        </Suspense>
      </div>
    </CoachOrAdminRoute>
  );
}