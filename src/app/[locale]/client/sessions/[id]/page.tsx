import { Suspense } from 'react';
import { SessionDetailView } from '@/components/client/session-detail-view';
import { ClientOrAdminRoute } from '@/components/auth/route-guard';

interface PageProps {
  params: {
    id: string;
  };
}

export default function SessionDetailPage({ params }: PageProps) {
  return (
    <ClientOrAdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading session details...</div>}>
          <SessionDetailView sessionId={params.id} />
        </Suspense>
      </div>
    </ClientOrAdminRoute>
  );
}
