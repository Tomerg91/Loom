'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/auth/auth-provider';
import { Loader2 } from 'lucide-react';
import { resolveAuthPath, resolveRedirect } from '@/lib/utils/redirect';

interface SigninFormProps {
  redirectTo?: string;
}

export function SigninForm({ redirectTo = '/dashboard' }: SigninFormProps) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn(email, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      const targetPath = resolveRedirect(locale, redirectTo || '/dashboard');

      // Check if MFA is required
      if (result.user?.mfaEnabled) {
        const query = new URLSearchParams({
          userId: result.user.id,
          redirectTo: targetPath,
        });
        const mfaPath = resolveAuthPath(locale, `/auth/mfa-verify?${query.toString()}`);
        router.push(mfaPath);
      } else {
        // Auth state is now updated, safe to redirect
        router.push(targetPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signin.error'));
    }
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white border border-neutral-300 shadow-lg rounded-xl">
      <CardHeader className="space-y-4 text-center px-8 pt-8 pb-6">
        <CardTitle className="text-3xl font-light text-neutral-900">{t('signin.title')}</CardTitle>
        <CardDescription className="text-base font-light text-neutral-600">
          {t('signin.description')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 px-8">
          {error && (
            <div
              className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded"
              role="alert"
              data-testid="error-message"
            >
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-neutral-900">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              name="email"
              required
              data-testid="email-input"
              variant="default"
              inputSize="md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-neutral-900">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('passwordPlaceholder')}
              name="password"
              required
              data-testid="password-input"
              variant="default"
              inputSize="md"
            />
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
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('signin.loading')}
              </span>
            ) : (
              t('signin.button')
            )}
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
