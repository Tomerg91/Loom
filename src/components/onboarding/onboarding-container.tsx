'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';

import { useAuthLoading, useUser, useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { ClientOnboardingForm } from './client-onboarding-form';
import { CoachOnboardingForm } from './coach-onboarding-form';

export function OnboardingContainer() {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const router = useRouter();
  const user = useUser();
  const isAuthLoading = useAuthLoading();
  const updateUser = useAuthStore((state) => state.updateUser);

  const status = user?.onboardingStatus ?? 'pending';

  const statusBadgeVariant: 'default' | 'secondary' | 'success' = useMemo(() => {
    if (status === 'completed') {
      return 'success';
    }
    if (status === 'in_progress') {
      return 'secondary';
    }
    return 'default';
  }, [status]);

  const statusLabel = useMemo(() => {
    if (status === 'completed') return t('status.completed');
    if (status === 'in_progress') return t('status.in_progress');
    return t('status.pending');
  }, [status, t]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{t('loading')}</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>{t('loadErrorTitle')}</CardTitle>
            <CardDescription>{t('loadErrorDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Button onClick={() => router.refresh()}>{t('retry')}</Button>
            <Button variant="secondary" asChild>
              <Link href="/auth/signin">{t('returnToSignIn')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showClientOnboarding = user.role === 'client';
  const showCoachOnboarding = user.role === 'coach';

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-10">
      <Card className="border-dashed">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClipboardList className="h-6 w-6 text-teal-600" aria-hidden="true" />
              {t('title', { name: user.firstName || user.email })}
            </CardTitle>
            <CardDescription>{t('subtitle')}</CardDescription>
          </div>
          <Badge variant={statusBadgeVariant} className="flex items-center gap-1 text-sm">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {statusLabel}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t('guidance.primary')}</p>
          </div>
          <div className="rounded-xl border border-dashed border-sand-200 bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>{t('guidance.secondary')}</p>
            {status === 'completed' && user.onboardingCompletedAt && (
              <p className="mt-2 text-xs text-muted-foreground/80">
                {t('completedAt', {
                  date: new Date(user.onboardingCompletedAt).toLocaleDateString(locale),
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {showClientOnboarding && (
        <ClientOnboardingForm user={user} onUserUpdate={updateUser} />
      )}

      {showCoachOnboarding && (
        <CoachOnboardingForm user={user} onUserUpdate={updateUser} />
      )}

      {!showClientOnboarding && !showCoachOnboarding && (
        <Card>
          <CardHeader>
            <CardTitle>{t('notRequired.title')}</CardTitle>
            <CardDescription>{t('notRequired.description')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t('notRequired.helper')}</p>
            <Button asChild>
              <Link href="/dashboard">{t('goToDashboard')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
