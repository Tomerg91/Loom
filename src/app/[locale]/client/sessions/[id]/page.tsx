import { Suspense } from 'react';

import { ClientOrAdminRoute } from '@/components/auth/route-guard';
import { SessionDetailView } from '@/components/client/session-detail-view';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <ClientOrAdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading session details...</div>}>
          <SessionDetailView sessionId={id} />
        </Suspense>
      </div>
    </ClientOrAdminRoute>
  );
}
