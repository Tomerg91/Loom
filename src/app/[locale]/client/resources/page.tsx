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
import { redirect } from 'next/navigation';

import { LoadingSpinner } from '@/components/lazy-components';
import { ClientResourceLibraryPage } from '@/components/resources/client-resource-library-page';
import { AppLayout } from '@/components/layout/app-layout';
import { requireUser } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

interface ClientResourcesProps {
  params: Promise<{ locale: string }>;
}

export default async function ClientResources({ params }: ClientResourcesProps) {
  const { locale } = await params;
  const user = await requireUser({ locale, redirectTo: `/${locale}/client/resources` });

  if (user.role !== 'client') {
    redirect(`/${locale}/unauthorized`);
  }

  return (
    <AppLayout user={user}>
      <Suspense fallback={<LoadingSpinner message="Loading your resources..." />}>
        <ClientResourceLibraryPage />
      </Suspense>
    </AppLayout>
  );
}
