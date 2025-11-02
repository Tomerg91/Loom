import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { RouteGuard } from '@/components/auth/route-guard';
import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { AppLayout } from '@/components/layout/app-layout';

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;

  return (
    <RouteGuard requireAuth={true}>
      <AppLayout>
        <DashboardContent locale={locale} />
      </AppLayout>
    </RouteGuard>
  );
}
