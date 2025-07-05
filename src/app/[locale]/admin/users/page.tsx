import { Suspense } from 'react';
import { AdminUsersPage } from '@/components/admin/users-page';
import { AdminRoute } from '@/components/auth/route-guard';

export default function AdminUsersPageRoute() {
  return (
    <AdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <AdminUsersPage />
        </Suspense>
      </div>
    </AdminRoute>
  );
}