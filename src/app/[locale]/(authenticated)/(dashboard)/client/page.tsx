/**
 * @fileoverview Server component powering the client dashboard entry point.
 * Prefetches the overview query and hydrates the client-side component with
 * the resulting cache state.
 */

import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { redirect } from 'next/navigation';

import { getServerUser } from '@/lib/auth/auth';
import { getClientOverviewQueryOptions } from '@/modules/dashboard/api/useClientOverview';
import { ClientOverview } from '@/modules/dashboard/components/ClientOverview';
import { fetchClientOverviewData } from '@/modules/dashboard/server/client-loaders';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ClientDashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ClientDashboardPage({
  params,
}: ClientDashboardPageProps) {
  const { locale } = await params;
  const user = await getServerUser();

  if (!user || user.role !== 'client') {
    redirect(`/${locale}/dashboard`);
  }

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery(
    getClientOverviewQueryOptions({
      fetchClientOverview: () =>
        fetchClientOverviewData(user.id, {
          upcomingLimit: 5,
          taskLimit: 5,
          goalLimit: 5,
        }),
    })
  );

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <ClientOverview locale={locale} />
    </HydrationBoundary>
  );
}
