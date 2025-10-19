/**
 * Coach Resource Library Page
 *
 * Main page for coaches to manage their resource library:
 * - View and filter resources
 * - Upload new resources
 * - Organize resources into collections
 * - Share resources with clients
 * - View analytics and insights
 *
 * @module app/[locale]/coach/resources/page
 */

import { Suspense } from 'react';
import { CoachRoute } from '@/components/auth/route-guard';
import { ResourceLibraryPage } from '@/components/resources/resource-library-page';
import { LoadingSpinner } from '@/components/lazy-components';

export const dynamic = 'force-dynamic';

export default function CoachResourcesPage() {
  return (
    <CoachRoute>
      <Suspense fallback={<LoadingSpinner message="Loading resource library..." />}>
        <ResourceLibraryPage />
      </Suspense>
    </CoachRoute>
  );
}
