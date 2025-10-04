import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createServerClient } from '@/lib/supabase/server';
import { CoachOnboardingWizard } from '@/components/onboarding/coach/coach-onboarding-wizard';

interface CoachOnboardingPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboarding.coach.wizard' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function CoachOnboardingPage({ params }: CoachOnboardingPageProps) {
  const { locale } = await params;

  // Check authentication and role
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('users')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'coach') {
    // Not a coach, redirect to appropriate dashboard
    redirect(`/${locale}/dashboard`);
  }

  // Check if onboarding already completed
  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('onboarding_completed_at')
    .eq('coach_id', user.id)
    .single();

  if (coachProfile?.onboarding_completed_at) {
    // Already completed onboarding
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0,0,0)_1px,transparent_0)] bg-[length:20px_20px]" />
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full opacity-20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-200 rounded-full opacity-20 blur-3xl" />

      <div className="relative py-12 px-4">
        <CoachOnboardingWizard
          userId={user.id}
          userEmail={user.email || ''}
          userName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
          redirectTo={`/${locale}/dashboard`}
        />
      </div>
    </div>
  );
}
