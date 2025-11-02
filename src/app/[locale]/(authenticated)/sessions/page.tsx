import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SessionsPageClient } from './sessions-page-client';

interface SessionsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'session' });

  return {
    title: t('sessions'),
    description: t('sessionsDescription'),
  };
}

export default async function SessionsPage({ params }: SessionsPageProps) {
  const { locale } = await params;
  
  return <SessionsPageClient locale={locale} />;
}