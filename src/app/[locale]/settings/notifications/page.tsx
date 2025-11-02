import { Suspense } from 'react';

import { NotificationSettingsPage } from '@/components/settings/notification-settings-page';
import { AppLayout } from '@/components/layout/app-layout';
import { requireUser } from '@/lib/auth/auth';

interface NotificationSettingsPageRouteProps {
  params: Promise<{ locale: string }>;
}

export default async function NotificationSettingsPageRoute({ params }: NotificationSettingsPageRouteProps) {
  const { locale } = await params;
  const user = await requireUser({ locale, redirectTo: `/${locale}/settings/notifications` });

  return (
    <AppLayout user={user}>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading notification settings...</div>}>
          <NotificationSettingsPage />
        </Suspense>
      </div>
    </AppLayout>
  );
}