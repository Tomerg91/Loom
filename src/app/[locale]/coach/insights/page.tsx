import { Suspense } from 'react';
import { CoachInsightsPage } from '@/components/coach/insights-page';
import { CoachRoute } from '@/components/auth/route-guard';

export default function CoachInsightsPageRoute() {
  return (
    <CoachRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading insights...</div>}>
          <CoachInsightsPage />
        </Suspense>
      </div>
    </CoachRoute>
  );
}