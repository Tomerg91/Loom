'use client';

import { OnboardingContainer } from '@/components/onboarding/onboarding-container';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ClientOnly } from '@/components/wrappers/client-only';

export default function OnboardingPage() {
  return (
    <ClientOnly fallback={<div className="flex min-h-[50vh] items-center justify-center"><LoadingSpinner /></div>}>
      <OnboardingContainer />
    </ClientOnly>
  );
}
