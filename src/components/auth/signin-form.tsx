'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createAuthService } from '@/lib/auth/auth';
import { basicPasswordSchema } from '@/lib/security/password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';

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
        router.push(redirectTo as '/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

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
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {showPassword ? t('hidePassword') : t('showPassword')}
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('signin.button')}
          </Button>
          
          <div className="text-center space-y-2">
            <Link
              href="/auth/reset-password"
              className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            >
              {t('forgotPassword')}
            </Link>
            
            <div className="text-sm text-muted-foreground">
              {t('noAccount')}{' '}
              <Link
                href="/auth/signup"
                className="text-primary underline-offset-4 hover:underline"
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