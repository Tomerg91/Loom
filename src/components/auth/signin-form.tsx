'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClientAuthService } from '@/lib/auth/client-auth';
import { createMfaService } from '@/lib/services/mfa-service';
import { basicPasswordSchema } from '@/lib/security/password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { MfaVerificationForm } from './mfa-verification-form';

const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: basicPasswordSchema,
});

type SigninFormData = z.infer<typeof signinSchema>;

interface SigninFormProps {
  redirectTo?: string;
}

export function SigninForm({ redirectTo = '/dashboard' }: SigninFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [mfaData, setMfaData] = useState<{ userId: string; sessionToken?: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
  });

  const onSubmit = async (data: SigninFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const authService = createClientAuthService();
      const { user, error: authError } = await authService.signIn(data);

      if (authError) {
        setError(authError);
        return;
      }

      if (user) {
        // Check if user has MFA enabled
        const mfaService = createMfaService(false);
        
        // Check if device is already trusted
        const isDeviceTrusted = await mfaService.isDeviceTrusted(user.id);
        
        if (user.mfaEnabled && !isDeviceTrusted) {
          // Create MFA session for partial authentication
          const { session, error: sessionError } = await mfaService.createMfaSession(user.id);
          
          if (sessionError) {
            setError(sessionError);
            return;
          }

          if (session) {
            // Set MFA session cookie
            document.cookie = `mfa_session=${session.sessionToken}; path=/; secure; samesite=strict; max-age=600`;
            
            // Show MFA challenge
            setMfaData({
              userId: user.id,
              sessionToken: session.sessionToken,
            });
            setShowMfaChallenge(true);
            return;
          }
        }

        // No MFA required or device is trusted, proceed to dashboard
        const safeRedirectTo = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
        const finalRedirectTo = /^\/(en|he)\//.test(safeRedirectTo)
          ? safeRedirectTo
          : `/${locale}${safeRedirectTo}`;
        router.push(finalRedirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSuccess = () => {
    const safeRedirectTo = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
    const finalRedirectTo = /^\/(en|he)\//.test(safeRedirectTo)
      ? safeRedirectTo
      : `/${locale}${safeRedirectTo}`;
    router.push(finalRedirectTo);
    router.refresh();
  };

  const handleMfaCancel = () => {
    setShowMfaChallenge(false);
    setMfaData(null);
    // Clear MFA session cookie
    document.cookie = 'mfa_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  };

  // Show MFA challenge if required
  if (showMfaChallenge && mfaData) {
    return (
      <MfaVerificationForm
        userId={mfaData.userId}
        mfaSessionToken={mfaData.sessionToken}
        redirectTo={redirectTo}
        onSuccess={handleMfaSuccess}
        onCancel={handleMfaCancel}
      />
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white border border-neutral-300 shadow-lg rounded-xl">
      <CardHeader className="space-y-4 text-center px-8 pt-8 pb-6">
        <CardTitle className="text-3xl font-light text-neutral-900">{t('signin.title')}</CardTitle>
        <CardDescription className="text-base font-light text-neutral-600">
          {t('signin.description')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6 px-8">
          {error && (
            <Alert variant="destructive" className="border-red-500 bg-red-50 text-red-800">
              <AlertDescription className="font-light">{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-neutral-900">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              {...register('email')}
              error={errors.email?.message}
              disabled={isLoading}
              data-testid="email-input"
              variant="default"
              inputSize="md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-neutral-900">{t('password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('passwordPlaceholder')}
                {...register('password')}
                error={errors.password?.message}
                disabled={isLoading}
                data-testid="password-input"
                variant="default"
                inputSize="md"
                rightIcon={showPassword ? EyeOff : Eye}
                onRightIconClick={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-6 px-8 pb-8">
          <Button 
            type="submit" 
            variant="default" 
            size="lg" 
            className="w-full" 
            disabled={isLoading} 
            data-testid="signin-button"
          >
            {isLoading && <Loader2 className="rtl:ml-2 rtl:mr-0 ltr:mr-2 ltr:ml-0 h-4 w-4 animate-spin" />}
            {t('signin.button')}
          </Button>
          
          <div className="text-center space-y-3">
            <Link
              href="/auth/reset-password"
              className="text-sm font-light text-neutral-600 hover:text-orange-600 underline-offset-4 hover:underline transition-colors duration-200"
              data-testid="forgot-password-link"
            >
              {t('forgotPassword')}
            </Link>
            
            <div className="text-sm font-light text-neutral-600">
              {t('noAccount')}{' '}
              <Link
                href="/auth/signup"
                className="text-orange-600 underline-offset-4 hover:underline font-normal transition-colors duration-200"
                data-testid="signup-link"
              >
                {t('signup.link')}
              </Link>
            </div>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
