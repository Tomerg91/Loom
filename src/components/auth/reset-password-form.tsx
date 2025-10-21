'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { config } from '@/lib/config';
import { commonValidators } from '@/lib/validation/common';

const AUTH_ENDPOINTS = config.endpoints.auth;
const HTTP_CONFIG = config.http;

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
  const [verificationStep, setVerificationStep] = useState<'email' | 'code' | 'password'>(token ? 'password' : 'email');
  const [verificationCode, setVerificationCode] = useState('');

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
      const response = await fetch(AUTH_ENDPOINTS.RESET_PASSWORD, {
        method: HTTP_CONFIG.methods.POST,
        headers: { 'Content-Type': HTTP_CONFIG.contentTypes.JSON },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reset email');
      }

      // Move to verification step instead of showing success immediately
      setVerificationStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would verify the code
      // For now, we'll simulate verification and move to password step
      if (verificationCode.length === 6) {
        setVerificationStep('password');
      } else {
        throw new Error('Please enter a valid 6-digit verification code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (data: PasswordUpdateData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(AUTH_ENDPOINTS.UPDATE_PASSWORD, {
        method: HTTP_CONFIG.methods.POST,
        headers: { 'Content-Type': HTTP_CONFIG.contentTypes.JSON },
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
      <Card className="w-full max-w-md mx-auto bg-white border border-neutral-300 shadow-lg rounded-xl">
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

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto bg-white border border-neutral-300 shadow-lg rounded-xl">
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

  // Verification code step
  if (verificationStep === 'code') {
    return (
      <Card className="w-full max-w-md mx-auto bg-white border border-neutral-300 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We&apos;ve sent a 6-digit verification code to your email. Please enter it below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                disabled={isLoading}
                data-testid="verification-code-input"
              />
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleVerificationCode}
                className="w-full"
                disabled={isLoading || verificationCode.length !== 6}
                data-testid="verify-code-button"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <Button
                type="button"
                onClick={() => setVerificationStep('email')}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {verificationStep === 'password' ? t('setNewPassword') : t('resetPassword')}
        </CardTitle>
        <CardDescription>
          {verificationStep === 'password'
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

        {verificationStep === 'password' ? (
          <form onSubmit={passwordUpdateForm.handleSubmit(handlePasswordUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('newPassword')}</Label>
              <PasswordInput
                id="password"
                {...passwordUpdateForm.register('password')}
                disabled={isLoading}
                aria-describedby={passwordUpdateForm.formState.errors.password ? 'password-error' : undefined}
                data-testid="new-password-input"
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
                data-testid="confirm-new-password-input"
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
                data-testid="update-password-button"
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
                data-testid="email-input"
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
                data-testid="reset-button"
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