import { Suspense } from 'react';

import { SessionEditPage } from '@/components/sessions/session-edit-page';
import { AppLayout } from '@/components/layout/app-layout';
import { requireUser } from '@/lib/auth/auth';

interface SessionEditPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function SessionEditRoute({ params }: SessionEditPageProps) {
  const { id, locale } = await params;
  const user = await requireUser({ locale, redirectTo: `/${locale}/sessions/${id}/edit` });

  return (
    <AppLayout user={user}>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading session editor...</div>}>
          <SessionEditPage sessionId={id} />
        </Suspense>
      </div>
    </AppLayout>
  );
}