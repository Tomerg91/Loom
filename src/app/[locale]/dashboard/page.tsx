import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { RouteGuard } from '@/components/auth/route-guard';
import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { AppLayout } from '@/components/layout/app-layout';
import { getServerUser } from '@/lib/auth/auth';
import { getCoachDashboardSummaryQueryOptions } from '@/modules/dashboard/api/useCoachDashboardSummary';
import { loadDashboardSummary } from '@/modules/sessions/server/queries';

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  const user = await getServerUser();

  const queryClient = new QueryClient();

  if (user?.role === 'coach') {
    await queryClient.prefetchQuery(
      getCoachDashboardSummaryQueryOptions({
        coachId: user.id,
        loadSummary: () => loadDashboardSummary({ id: user.id, role: 'coach' }),
      })
    );
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <RouteGuard requireAuth={true}>
      <HydrationBoundary state={dehydratedState}>
        <AppLayout>
          <DashboardContent locale={locale} initialUser={user} />
        </AppLayout>
      </HydrationBoundary>
    </RouteGuard>
  );
}
