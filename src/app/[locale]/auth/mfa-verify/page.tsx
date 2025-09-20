'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { createMfaService } from '@/lib/services/mfa-service';
import { createClientAuthService } from '@/lib/auth/client-auth';
import { MfaVerificationForm } from '@/components/auth/mfa-verification-form';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function MfaVerifyPage() {
  const t = useTranslations('auth.mfa');
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [mfaSessionToken, setMfaSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rawRedirectTo = searchParams.get('redirectTo') || '/dashboard';
  const safeRedirectTo = rawRedirectTo && rawRedirectTo.startsWith('/') ? rawRedirectTo : '/dashboard';
  const redirectTo = /^\/(en|he)\//.test(safeRedirectTo)
    ? safeRedirectTo
    : `/${locale}${safeRedirectTo}`;

  useEffect(() => {
    async function initializeMfaVerification() {
      try {
        // Get current authenticated user
        const authService = createClientAuthService();
        const user = await authService.getCurrentUser();

        if (!user) {
          router.push(`/${locale}/auth/signin`);
          return;
        }

        if (!user.mfaEnabled) {
          // User doesn't have MFA enabled, redirect to setup or dashboard
          router.push(redirectTo);
          return;
        }

        setUserId(user.id);

        // Check for existing MFA session
        const mfaSessionCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('mfa_session='))
          ?.split('=')[1];

        if (mfaSessionCookie) {
          // Validate the session
          const mfaService = createMfaService(false);
          const { session } = await mfaService.validateMfaSession(mfaSessionCookie);
          
          if (session) {
            setMfaSessionToken(session.sessionToken);
            
            // If already verified, redirect
            if (session.mfaVerified) {
              router.push(redirectTo);
              return;
            }
          } else {
            // Invalid session, create new one
            const { session: newSession, error: sessionError } = await mfaService.createMfaSession(user.id);
            
            if (sessionError) {
              setError(sessionError);
              return;
            }

            if (newSession) {
              setMfaSessionToken(newSession.sessionToken);
              // Set session cookie
              document.cookie = `mfa_session=${newSession.sessionToken}; path=/; secure; samesite=strict; max-age=600`;
            }
          }
        } else {
          // No session exists, create one
          const mfaService = createMfaService(false);
          const { session, error: sessionError } = await mfaService.createMfaSession(user.id);
          
          if (sessionError) {
            setError(sessionError);
            return;
          }

          if (session) {
            setMfaSessionToken(session.sessionToken);
            // Set session cookie
            document.cookie = `mfa_session=${session.sessionToken}; path=/; secure; samesite=strict; max-age=600`;
          }
        }
      } catch (err) {
        console.error('Error initializing MFA verification:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize MFA verification');
      } finally {
        setIsLoading(false);
      }
    }

    initializeMfaVerification();
  }, [router, redirectTo]);

  const handleSuccess = () => {
    router.push(redirectTo);
    router.refresh();
  };

  const handleCancel = () => {
    // Clear MFA session and redirect to signin
    document.cookie = 'mfa_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push(`/${locale}/auth/signin`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-muted-foreground">{t('verify.loading')}</p>
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
                onClick={() => router.push(`/${locale}/auth/signin`)}
                className="text-primary hover:underline"
              >
                {t('backToSignin')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <MfaVerificationForm
        userId={userId}
        mfaSessionToken={mfaSessionToken || undefined}
        redirectTo={redirectTo}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
