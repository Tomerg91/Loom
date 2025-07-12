'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordInput } from '@/components/ui/password-input';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { commonValidators } from '@/lib/validation/common';

// Schema for password reset request
const resetRequestSchema = z.object({
  email: commonValidators.email(),
});

// Schema for password update
const passwordUpdateSchema = z.object({
  password: commonValidators.password(true),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetRequestData = z.infer<typeof resetRequestSchema>;
type PasswordUpdateData = z.infer<typeof passwordUpdateSchema>;

interface ResetPasswordFormProps {
  token?: string; // If token is provided, show password update form
  onBack?: () => void;
  onSuccess?: () => void;
}

export function ResetPasswordForm({ token, onBack, onSuccess }: ResetPasswordFormProps) {
  const t = useTranslations('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form for requesting password reset
  const resetRequestForm = useForm<ResetRequestData>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: '' },
  });

  // Form for updating password
  const passwordUpdateForm = useForm<PasswordUpdateData>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleResetRequest = async (data: ResetRequestData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (data: PasswordUpdateData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: data.password,
          token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update password');
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (success && !token) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <CardTitle>{t('resetEmailSent')}</CardTitle>
          <CardDescription>
            {t('resetEmailSentDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToSignIn')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (success && token) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <CardTitle>{t('passwordUpdated')}</CardTitle>
          <CardDescription>
            {t('passwordUpdatedDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => window.location.href = '/auth/signin'}
            className="w-full"
          >
            {t('signIn')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {token ? t('setNewPassword') : t('resetPassword')}
        </CardTitle>
        <CardDescription>
          {token 
            ? t('setNewPasswordDescription')
            : t('resetPasswordDescription')
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {token ? (
          <form onSubmit={passwordUpdateForm.handleSubmit(handlePasswordUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('newPassword')}</Label>
              <PasswordInput
                id="password"
                {...passwordUpdateForm.register('password')}
                disabled={isLoading}
                aria-describedby={passwordUpdateForm.formState.errors.password ? 'password-error' : undefined}
              />
              {passwordUpdateForm.formState.errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {passwordUpdateForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <PasswordInput
                id="confirmPassword"
                {...passwordUpdateForm.register('confirmPassword')}
                disabled={isLoading}
                aria-describedby={passwordUpdateForm.formState.errors.confirmPassword ? 'confirm-password-error' : undefined}
              />
              {passwordUpdateForm.formState.errors.confirmPassword && (
                <p id="confirm-password-error" className="text-sm text-destructive">
                  {passwordUpdateForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? t('updating') : t('updatePassword')}
              </Button>

              {onBack && (
                <Button
                  type="button"
                  onClick={onBack}
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('back')}
                </Button>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={resetRequestForm.handleSubmit(handleResetRequest)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                {...resetRequestForm.register('email')}
                disabled={isLoading}
                placeholder={t('enterEmail')}
                aria-describedby={resetRequestForm.formState.errors.email ? 'email-error' : undefined}
              />
              {resetRequestForm.formState.errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {resetRequestForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? t('sending') : t('sendResetLink')}
              </Button>

              {onBack && (
                <Button
                  type="button"
                  onClick={onBack}
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('backToSignIn')}
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}