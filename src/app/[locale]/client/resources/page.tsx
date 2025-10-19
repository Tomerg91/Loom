/**
 * Client Resource Library Page
 *
 * Allows clients to:
 * - Browse resources shared with them by their coach(es)
 * - Filter by categories, tags, and collections
 * - Track progress (viewed/completed)
 * - Download/view resources
 *
 * Security:
 * - RLS enforced: clients only see resources shared with them
 * - No access to other coaches' resources
 * - Progress tracking is client-specific
 *
 * @module app/[locale]/client/resources/page
 */

import { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/route-guard';
import { ClientResourceLibraryPage } from '@/components/resources/client-resource-library-page';
import { LoadingSpinner } from '@/components/lazy-components';

export const dynamic = 'force-dynamic';

export default function ClientResources() {
  return (
    <RouteGuard requireRole="client">
      <Suspense fallback={<LoadingSpinner message="Loading your resources..." />}>
        <ClientResourceLibraryPage />
      </Suspense>
    </RouteGuard>
  );
}
