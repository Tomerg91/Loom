import { Suspense } from 'react';

import { SettingsPage } from '@/components/settings/settings-page';
import { AppLayout } from '@/components/layout/app-layout';
import { requireUser } from '@/lib/auth/auth';

interface SettingsPageRouteProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPageRoute({ params }: SettingsPageRouteProps) {
  const { locale } = await params;
  const user = await requireUser({ locale, redirectTo: `/${locale}/settings` });

  return (
    <AppLayout user={user}>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading settings...</div>}>
          <SettingsPage />
        </Suspense>
      </div>
    </AppLayout>
  );
}