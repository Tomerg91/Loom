import { Suspense } from 'react';
import { CoachClientDetailPage } from '@/components/coach/client-detail-page';
import { CoachRoute } from '@/components/auth/route-guard';

interface CoachClientDetailPageRouteProps {
  params: Promise<{ id: string }>;
}

export default async function CoachClientDetailPageRoute({ params }: CoachClientDetailPageRouteProps) {
  const { id } = await params;

  return (
    <CoachRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading client details...</div>}>
          <CoachClientDetailPage clientId={id} />
        </Suspense>
      </div>
    </CoachRoute>
  );
}