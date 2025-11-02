import { Suspense } from 'react';

import { SessionCreatePage } from '@/components/sessions/session-create-page';
import { AppLayout } from '@/components/layout/app-layout';
import { requireUser } from '@/lib/auth/auth';

interface SessionCreateRouteProps {
  params: Promise<{ locale: string }>;
}

export default async function SessionCreateRoute({ params }: SessionCreateRouteProps) {
  const { locale } = await params;
  const user = await requireUser({ locale, redirectTo: `/${locale}/sessions/new` });

  return (
    <AppLayout user={user}>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading session creator...</div>}>
          <SessionCreatePage />
        </Suspense>
      </div>
    </AppLayout>
  );
}