'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createAuthService } from '@/lib/auth/auth';
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
      const authService = createAuthService(false);
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
        router.push(redirectTo as '/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSuccess = () => {
    router.push(redirectTo as '/dashboard');
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">{t('signin.title')}</CardTitle>
        <CardDescription className="text-center">
          {t('signin.description')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              {...register('email')}
              error={errors.email?.message}
              disabled={isLoading}
              data-testid="email-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('passwordPlaceholder')}
                {...register('password')}
                error={errors.password?.message}
                disabled={isLoading}
                data-testid="password-input"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-pressed={showPassword}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="sr-only">
                  {showPassword ? t('hidePassword') : t('showPassword')}
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading} data-testid="signin-button">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('signin.button')}
          </Button>
          
          <div className="text-center space-y-2">
            <Link
              href="/auth/reset-password"
              className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              data-testid="forgot-password-link"
            >
              {t('forgotPassword')}
            </Link>
            
            <div className="text-sm text-muted-foreground">
              {t('noAccount')}{' '}
              <Link
                href="/auth/signup"
                className="text-primary underline-offset-4 hover:underline"
                data-testid="signup-link"
              >
                {t('signup.link')}
              </Link>
            </div>

            {/* Test MFA Flow Button */}
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempCredentials({ email: 'test@example.com', password: 'password' });
                  setRequiresMfa(true);
                }}
                className="text-xs"
              >
                Test MFA Flow
              </Button>
            </div>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}