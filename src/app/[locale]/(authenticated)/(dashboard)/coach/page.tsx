/**
 * @fileoverview Server component powering the coach dashboard entry point.
 * Prefetches the overview query and hydrates the client component with the
 * resulting cache state.
 */

import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { redirect } from 'next/navigation';

import { getServerUser } from '@/lib/auth/auth';
import { getCoachOverviewQueryOptions } from '@/modules/dashboard/api/useCoachOverview';
import { CoachOverview } from '@/modules/dashboard/components/CoachOverview';
import { fetchCoachOverviewData } from '@/modules/dashboard/server/loaders';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CoachDashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CoachDashboardPage({
  params,
}: CoachDashboardPageProps) {
  const { locale } = await params;
  const user = await getServerUser();

  if (!user || user.role !== 'coach') {
    redirect(`/${locale}/dashboard`);
  }

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery(
    getCoachOverviewQueryOptions({
      fetchCoachOverview: () =>
        fetchCoachOverviewData(user.id, {
          upcomingLimit: 5,
          taskLimit: 5,
        }),
    })
  );

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <CoachOverview
        locale={locale}
        coachId={user.id}
        userId={user.id}
      />
    </HydrationBoundary>
  );
}
