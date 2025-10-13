'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff, MailCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from '@/i18n/routing';
import { strongPasswordSchema } from '@/lib/security/password';
import type { Language } from '@/types';

const signupSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    role: z.enum(['client', 'coach'] as const),
    phone: z.string().optional(),
    language: z.enum(['en', 'he'] as const),
    acceptedTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  redirectTo?: string;
}

export function SignupForm({}: SignupFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      language: 'he',
      role: 'client',
      acceptedTerms: false,
    },
  });

  const watchRole = watch('role');
  const watchLanguage = watch('language');

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the API route for signup to ensure proper validation and user creation
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          phone: data.phone,
          language: data.language,
          acceptedTerms: data.acceptedTerms,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || result?.message || 'An unexpected error occurred');
        return;
      }

      const responseData = result.data ?? {};
      const sessionActive = Boolean(responseData.sessionActive);
      const apiMessage = responseData.message ?? result.message;
      const emailForMessage = (responseData.user?.email as string | undefined) || data.email;

      if (sessionActive) {
        const safeRedirectTo =
          redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
        const finalRedirectTo = /^\/(en|he)\//.test(safeRedirectTo)
          ? safeRedirectTo
          : `/${locale}${safeRedirectTo}`;
        router.push(finalRedirectTo);
        router.refresh();
        return;
      }

      reset();
      setIsSuccess(true);
      setSuccessEmail(emailForMessage);
      setSuccessMessage(apiMessage ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-lg mx-auto bg-white border border-neutral-300 shadow-lg rounded-xl">
        <CardHeader className="space-y-4 text-center px-8 pt-10 pb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <MailCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <CardTitle className="text-3xl font-light text-neutral-900">
            {t('signup.success.title')}
          </CardTitle>
          <CardDescription className="text-base font-light text-neutral-600">
            {successMessage
              ? successMessage
              : t('signup.success.subtitle', { email: successEmail })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-8 text-left">
          <p className="text-sm font-light text-neutral-600">
            {t('signup.success.description', { email: successEmail })}
          </p>
          <p className="text-sm font-light text-neutral-600">
            {t('signup.success.spamHint')}
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 px-8 pb-10">
          <Button asChild variant="default" size="lg" className="w-full">
            <Link href="/auth/signin">{t('signup.success.cta')}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full"
            data-testid="open-email-app"
          >
            <a href="mailto:">{t('signup.success.openEmailApp')}</a>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto bg-white border border-neutral-300 shadow-lg rounded-xl">
      <CardHeader className="space-y-4 text-center px-8 pt-8 pb-6">
        <CardTitle className="text-3xl font-light text-neutral-900">
          {t('signup.title')}
        </CardTitle>
        <CardDescription className="text-base font-light text-neutral-600">
          {t('signup.description')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5 px-8">
          {error && (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-50 text-red-800"
            >
              <AlertDescription className="font-light">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="firstName"
                className="text-sm font-medium text-neutral-900"
              >
                {t('firstName')}
              </Label>
              <Input
                id="firstName"
                placeholder={t('firstNamePlaceholder')}
                {...register('firstName')}
                error={errors.firstName?.message}
                disabled={isLoading}
                data-testid="first-name-input"
                variant="default"
                inputSize="md"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="lastName"
                className="text-sm font-medium text-neutral-900"
              >
                {t('lastName')}
              </Label>
              <Input
                id="lastName"
                placeholder={t('lastNamePlaceholder')}
                {...register('lastName')}
                error={errors.lastName?.message}
                disabled={isLoading}
                data-testid="last-name-input"
                variant="default"
                inputSize="md"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-neutral-900"
            >
              {t('email')}
            </Label>
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
            <Label
              htmlFor="phone"
              className="text-sm font-medium text-neutral-900"
            >
              {t('phone')} ({t('optional')})
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder={t('phonePlaceholder')}
              {...register('phone')}
              error={errors.phone?.message}
              disabled={isLoading}
              data-testid="phone-input"
              variant="default"
              inputSize="md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-neutral-900">
                {t('role')}
              </Label>
              <Select
                value={watchRole}
                onValueChange={(value: 'client' | 'coach') =>
                  setValue('role', value)
                }
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
                <p className="text-sm font-light text-red-600">
                  {errors.role.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-neutral-900">
                {t('language')}
              </Label>
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
                <p className="text-sm font-light text-red-600">
                  {errors.language.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-neutral-900"
            >
              {t('password')}
            </Label>
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

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-neutral-900"
            >
              {t('confirmPassword')}
            </Label>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('confirmPasswordPlaceholder')}
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
              disabled={isLoading}
              data-testid="confirm-password-input"
              variant="default"
              inputSize="md"
              rightIcon={showConfirmPassword ? EyeOff : Eye}
              onRightIconClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
            />
          </div>

          <div className="flex items-start space-x-3">
            <input
              id="acceptedTerms"
              type="checkbox"
              {...register('acceptedTerms')}
              disabled={isLoading}
              className="mt-1 h-4 w-4 text-orange-600 bg-white border-neutral-300 rounded focus:ring-orange-500 focus:ring-2"
              data-testid="terms-checkbox"
            />
            <Label
              htmlFor="acceptedTerms"
              className="text-sm font-light text-neutral-700 leading-relaxed"
            >
              {t('acceptTerms')}{' '}
              <Link
                href="/terms"
                target="_blank"
                className="text-orange-600 underline-offset-4 hover:underline font-normal transition-colors duration-200"
              >
                {t('termsAndConditions')}
              </Link>
            </Label>
          </div>
          {errors.acceptedTerms && (
            <p className="text-sm font-light text-red-600">
              {errors.acceptedTerms.message}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-6 px-8 pb-8">
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full"
            disabled={isLoading}
            data-testid="signup-button"
          >
            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {t('signup.button')}
          </Button>

          <div className="text-center text-sm font-light text-neutral-600">
            {t('haveAccount')}{' '}
            <Link
              href="/auth/signin"
              className="text-orange-600 underline-offset-4 hover:underline font-normal transition-colors duration-200"
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
