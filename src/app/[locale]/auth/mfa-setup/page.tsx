'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClientAuthService } from '@/lib/auth/client-auth';
import { MfaSetupForm } from '@/components/auth/mfa-setup-form';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield } from 'lucide-react';

export default function MfaSetupPage() {
  const t = useTranslations('auth.mfa');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const isRequired = searchParams.get('required') === 'true';

  useEffect(() => {
    async function initializeMfaSetup() {
      try {
        // Get current authenticated user
        const authService = createClientAuthService();
        const user = await authService.getCurrentUser();

        if (!user) {
          router.push('/auth/signin');
          return;
        }

        if (user.mfaEnabled && user.mfaSetupCompleted) {
          // User already has MFA set up, redirect to dashboard or manage page
          router.push(redirectTo === '/dashboard' ? '/settings/security' : redirectTo);
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email);
      } catch (err) {
        console.error('Error initializing MFA setup:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize MFA setup');
      } finally {
        setIsLoading(false);
      }
    }

    initializeMfaSetup();
  }, [router, redirectTo]);

  const handleSuccess = () => {
    router.push(redirectTo);
    router.refresh();
  };

  const handleCancel = () => {
    if (isRequired) {
      // If MFA is required, redirect to dashboard with a message
      router.push('/dashboard?mfa_required=true');
    } else {
      // Otherwise go back to security settings
      router.push('/settings/security');
    }
  };

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <p className="text-destructive">{error}</p>
              <button
                onClick={() => router.push('/dashboard')}
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
            <AlertDescription>
              {t('setup.adminRequired')}
            </AlertDescription>
          </Alert>
        )}
        
        <MfaSetupForm
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
