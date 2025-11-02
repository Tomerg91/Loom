import { Suspense } from 'react';

import { SessionDetailsPage } from '@/components/sessions/session-details-page';
import { AppLayout } from '@/components/layout/app-layout';
import { requireUser } from '@/lib/auth/auth';

interface SessionPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id, locale } = await params;
  const user = await requireUser({ locale, redirectTo: `/${locale}/sessions/${id}` });

  return (
    <AppLayout user={user}>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading session...</div>}>
          <SessionDetailsPage sessionId={id} />
        </Suspense>
      </div>
    </AppLayout>
  );
}