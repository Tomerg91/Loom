import { Suspense } from 'react';
import { ReflectionsManagement } from '@/components/client/reflections-management';
import { ClientOrAdminRoute } from '@/components/auth/route-guard';

export default function ClientReflectionsPage() {
  return (
    <ClientOrAdminRoute>
      <div className="container mx-auto py-6">
        <Suspense fallback={<div>Loading reflections...</div>}>
          <ReflectionsManagement />
        </Suspense>
      </div>
    </ClientOrAdminRoute>
  );
}