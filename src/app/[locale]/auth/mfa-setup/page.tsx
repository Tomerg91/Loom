'use client';

import { Loader2, Shield } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { createClientAuthService } from '@/lib/auth/client-auth';
import { MfaForm } from '@/modules/auth/components/MfaForm';
import { useMfaStatus } from '@/modules/auth/hooks/useMfa';

export default function MfaSetupPage() {
  const t = useTranslations('auth.mfa');
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const rawRedirectTo = searchParams.get('redirectTo') || '/dashboard';
  const safeRedirectTo =
    rawRedirectTo && rawRedirectTo.startsWith('/')
      ? rawRedirectTo
      : '/dashboard';
  const redirectTo = useMemo(
    () =>
      /^\/(en|he)\//.test(safeRedirectTo)
        ? safeRedirectTo
        : `/${locale}${safeRedirectTo}`,
    [locale, safeRedirectTo]
  );
  const isRequired = searchParams.get('required') === 'true';

  const {
    data: mfaStatus,
    isLoading: isStatusLoading,
    error: statusError,
  } = useMfaStatus({
    enabled: Boolean(userId),
    retry: 0,
  });

  useEffect(() => {
    async function initializeMfaSetup() {
      try {
        const authService = createClientAuthService();
        const user = await authService.getCurrentUser();

        if (!user) {
          router.push(`/${locale}/auth/signin`);
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email);
      } catch (err) {
        console.error('Error initializing MFA setup:', err);
        setBootstrapError(
          err instanceof Error ? err.message : 'Failed to initialize MFA setup'
        );
      } finally {
        setIsUserLoading(false);
      }
    }

    void initializeMfaSetup();
  }, [locale, router]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    if (mfaStatus?.isEnabled && mfaStatus?.isSetup) {
      router.push(
        redirectTo === `/${locale}/dashboard`
          ? `/${locale}/settings/security`
          : redirectTo
      );
    }
  }, [userId, mfaStatus, router, redirectTo, locale]);

  const handleSuccess = () => {
    router.push(redirectTo);
    router.refresh();
  };

  const handleCancel = () => {
    if (isRequired) {
      router.push(`/${locale}/dashboard?mfa_required=true`);
    } else {
      router.push(`/${locale}/settings/security`);
    }
  };

  const isLoading = isUserLoading || isStatusLoading;
  const errorMessage =
    bootstrapError ||
    (statusError instanceof Error ? statusError.message : null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-muted-foreground">{t('setup.loading')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <p className="text-destructive">{errorMessage}</p>
              <button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="text-primary hover:underline"
              >
                {t('backToDashboard')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userId || !userEmail) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {isRequired && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>{t('setup.adminRequired')}</AlertDescription>
          </Alert>
        )}

        <MfaForm
          variant="setup"
          userId={userId}
          userEmail={userEmail}
          isRequired={isRequired}
          redirectTo={redirectTo}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
