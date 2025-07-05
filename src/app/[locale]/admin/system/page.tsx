import { Suspense } from 'react';
import { AdminSystemPage } from '@/components/admin/system-page';
import { AdminRoute } from '@/components/auth/route-guard';

export default function AdminSystemPageRoute() {
  return (
    <AdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <AdminSystemPage />
        </Suspense>
      </div>
    </AdminRoute>
  );
}