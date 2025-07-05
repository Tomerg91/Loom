import { Suspense } from 'react';
import { NotificationSettingsPage } from '@/components/settings/notification-settings-page';
import { RouteGuard } from '@/components/auth/route-guard';

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