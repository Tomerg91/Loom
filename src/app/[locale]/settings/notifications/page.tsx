import { Suspense } from 'react';

import { RouteGuard } from '@/components/auth/route-guard';
import { NotificationSettingsPage } from '@/components/settings/notification-settings-page';

export default function NotificationSettingsPageRoute() {
  return (
    <RouteGuard requireAuth={true}>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading notification settings...</div>}>
          <NotificationSettingsPage />
        </Suspense>
      </div>
    </RouteGuard>
  );
}