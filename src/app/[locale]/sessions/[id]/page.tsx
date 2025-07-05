import { Suspense } from 'react';
import { SessionDetailsPage } from '@/components/sessions/session-details-page';
import { RouteGuard } from '@/components/auth/route-guard';

interface SessionPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;
  
  return (
    <RouteGuard requireAuth={true}>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading session...</div>}>
          <SessionDetailsPage sessionId={id} />
        </Suspense>
      </div>
    </RouteGuard>
  );
}