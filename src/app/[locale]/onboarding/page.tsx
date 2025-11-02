import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { OnboardingContainer } from '@/components/onboarding/onboarding-container';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { requireUser } from '@/lib/auth/auth';

interface OnboardingPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboarding' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function LocaleOnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = await params; // ensure params awaited for consistency with other routes
  await requireUser({ locale, redirectTo: `/${locale}/onboarding` });

  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><LoadingSpinner /></div>}>
      <OnboardingContainer />
    </Suspense>
  );
}
