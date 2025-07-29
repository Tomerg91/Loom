'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createAuthService } from '@/lib/auth/auth';
import { strongPasswordSchema } from '@/lib/security/password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import type { Language } from '@/types';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: strongPasswordSchema,
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['client', 'coach'] as const),
  phone: z.string().optional(),
  language: z.enum(['en', 'he'] as const),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  redirectTo?: string;
}

export function SignupForm({ redirectTo = '/dashboard' }: SignupFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      language: 'en',
      role: 'client',
    },
  });

  const watchRole = watch('role');
  const watchLanguage = watch('language');

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const authService = createAuthService(false);
      const { user, error: authError } = await authService.signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone,
        language: data.language,
      });

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
        <CardTitle className="text-2xl text-center">{t('signup.title')}</CardTitle>
        <CardDescription className="text-center">
          {t('signup.description')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('firstName')}</Label>
              <Input
                id="firstName"
                placeholder={t('firstNamePlaceholder')}
                {...register('firstName')}
                error={errors.firstName?.message}
                disabled={isLoading}
                data-testid="first-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('lastName')}</Label>
              <Input
                id="lastName"
                placeholder={t('lastNamePlaceholder')}
                {...register('lastName')}
                error={errors.lastName?.message}
                disabled={isLoading}
                data-testid="last-name-input"
              />
            </div>
          </div>

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
            <Label htmlFor="phone">{t('phone')} ({t('optional')})</Label>
            <Input
              id="phone"
              type="tel"
              placeholder={t('phonePlaceholder')}
              {...register('phone')}
              error={errors.phone?.message}
              disabled={isLoading}
              data-testid="phone-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('role')}</Label>
              <Select
                value={watchRole}
                onValueChange={(value: 'client' | 'coach') => setValue('role', value)}
                disabled={isLoading}
              >
                <SelectTrigger data-testid="role-select">
                  <SelectValue placeholder={t('selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">{t('roles.client')}</SelectItem>
                  <SelectItem value="coach">{t('roles.coach')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('language')}</Label>
              <Select
                value={watchLanguage}
                onValueChange={(value: Language) => setValue('language', value)}
                disabled={isLoading}
              >
                <SelectTrigger data-testid="language-select">
                  <SelectValue placeholder={t('selectLanguage')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('languages.en')}</SelectItem>
                  <SelectItem value="he">{t('languages.he')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.language && (
                <p className="text-sm text-destructive">{errors.language.message}</p>
              )}
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('confirmPasswordPlaceholder')}
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
                disabled={isLoading}
                data-testid="confirm-password-input"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                aria-pressed={showConfirmPassword}
                aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="sr-only">
                  {showConfirmPassword ? t('hidePassword') : t('showPassword')}
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading} data-testid="signup-button">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('signup.button')}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            {t('haveAccount')}{' '}
            <Link
              href="/auth/signin"
              className="text-primary underline-offset-4 hover:underline"
              data-testid="signin-link"
            >
              {t('signin.link')}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}