import { Suspense } from 'react';

import { RouteGuard } from '@/components/auth/route-guard';
import { SettingsPage } from '@/components/settings/settings-page';

export default function SettingsPageRoute() {
  return (
    <RouteGuard requireAuth={true}>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading settings...</div>}>
          <SettingsPage />
        </Suspense>
      </div>
    </RouteGuard>
  );
}