import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AppLayout } from '@/components/layout/app-layout';
import { RouteGuard } from '@/components/auth/route-guard';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

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
  
  // Load translations for the page
  const [translationsResult, commonTranslationsResult] = await Promise.allSettled([
    getTranslations({ locale, namespace: 'dashboard' }),
    getTranslations({ locale, namespace: 'common' }),
  ]);

  return (
    <RouteGuard requireAuth={true}>
      <AppLayout>
        <DashboardContent 
          translations={{
            dashboard: translationsResult.status === 'fulfilled' ? translationsResult.value : (() => (key: string) => key)(),
            common: commonTranslationsResult.status === 'fulfilled' ? commonTranslationsResult.value : (() => (key: string) => key)(),
          }}
          locale={locale}
        />
      </AppLayout>
    </RouteGuard>
  );
}
