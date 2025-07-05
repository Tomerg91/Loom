import { Suspense } from 'react';
import { SessionEditPage } from '@/components/sessions/session-edit-page';
import { RouteGuard } from '@/components/auth/route-guard';

interface SessionEditPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function SessionEditRoute({ params }: SessionEditPageProps) {
  const { id } = await params;
  
  return (
    <RouteGuard requireAuth={true}>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading session editor...</div>}>
          <SessionEditPage sessionId={id} />
        </Suspense>
      </div>
    </RouteGuard>
  );
}