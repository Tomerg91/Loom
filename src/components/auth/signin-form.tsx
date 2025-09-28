'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface SigninFormProps {
  redirectTo?: string;
}

export function SigninForm({ redirectTo = '/dashboard' }: SigninFormProps) {
  const t = useTranslations('auth');
  const locale = useLocale();

  return (
    <Card className="w-full max-w-md mx-auto bg-white border border-neutral-300 shadow-lg rounded-xl">
      <CardHeader className="space-y-4 text-center px-8 pt-8 pb-6">
        <CardTitle className="text-3xl font-light text-neutral-900">{t('signin.title')}</CardTitle>
        <CardDescription className="text-base font-light text-neutral-600">
          {t('signin.description')}
        </CardDescription>
      </CardHeader>
      <form method="POST" action="/api/auth/signin/browser">
        <CardContent className="space-y-6 px-8">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input type="hidden" name="locale" value={locale} />
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
            data-testid="signin-button"
          >
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
