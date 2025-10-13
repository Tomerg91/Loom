'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Smartphone, Key, Shield, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MfaMethod } from '@/types';

const mfaVerificationSchema = z.object({
  code: z.string()
    .min(6, 'Code must be at least 6 characters')
    .max(10, 'Code must be at most 10 characters')
    .regex(/^[0-9A-Z]+$/, 'Code must contain only numbers and uppercase letters'),
  rememberDevice: z.boolean(),
});

type MfaVerificationFormData = z.infer<typeof mfaVerificationSchema>;

interface MfaVerificationFormProps {
  userId: string;
  mfaSessionToken?: string;
  redirectTo?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MfaVerificationForm({ 
  userId, 
  mfaSessionToken, 
  redirectTo = '/dashboard',
  onSuccess,
  onCancel 
}: MfaVerificationFormProps) {
  const t = useTranslations('auth.mfa');
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMethod, setActiveMethod] = useState<MfaMethod>('totp');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const rawRedirectTo = redirectTo || searchParams.get('redirectTo') || '/dashboard';
  const safeRedirectTo = rawRedirectTo && rawRedirectTo.startsWith('/') ? rawRedirectTo : '/dashboard';
  const finalRedirectTo = /^\/(en|he)\//.test(safeRedirectTo)
    ? safeRedirectTo
    : `/${locale}${safeRedirectTo}`;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MfaVerificationFormData>({
    resolver: zodResolver(mfaVerificationSchema),
    defaultValues: {
      rememberDevice: false,
    },
  });

  const watchRememberDevice = watch('rememberDevice');

  const onSubmit = async (data: MfaVerificationFormData) => {
    if (isLocked) {
      setError(t('tooManyAttempts'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          code: data.code.toUpperCase(),
          method: activeMethod,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || t('verificationFailed'));
        setAttempts(prev => prev + 1);

        // Lock after 5 failed attempts
        if (attempts + 1 >= 5) {
          setIsLocked(true);
          setError(t('accountLocked'));
        }

        reset({ rememberDevice: data.rememberDevice });
        return;
      }

      if (result.success) {
        // Mark MFA complete for this browser session
        document.cookie = `mfa_verified=true; path=/; secure; samesite=strict; max-age=3600`;
        // Clear pending flag set during password sign-in
        document.cookie = `mfa_pending=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;

        if (onSuccess) {
          onSuccess();
        } else {
          router.push(finalRedirectTo);
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verificationFailed'));
      setAttempts(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodChange = (method: MfaMethod) => {
    setActiveMethod(method);
    setError(null);
    reset({ rememberDevice: watchRememberDevice });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push(`/${locale}/auth/signin`);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('verify.title')}</CardTitle>
        <CardDescription>
          {t('verify.description')}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {attempts > 0 && attempts < 5 && (
            <Alert>
              <AlertDescription>
                {t('attemptsRemaining', { remaining: 5 - attempts })}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeMethod} onValueChange={(value) => handleMethodChange(value as MfaMethod)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="totp" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                {t('methods.authenticator')}
              </TabsTrigger>
              <TabsTrigger value="backup_code" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                {t('methods.backupCode')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="totp" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totp-code">{t('authenticatorCode')}</Label>
                <Input
                  id="totp-code"
                  placeholder={t('authenticatorCodePlaceholder')}
                  {...register('code')}
                  error={errors.code?.message}
                  disabled={isLoading || isLocked}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  data-testid="totp-code-input"
                />
                <p className="text-sm text-muted-foreground">
                  {t('authenticatorInstructions')}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="backup_code" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backup-code">{t('backupCode')}</Label>
                <Input
                  id="backup-code"
                  placeholder={t('backupCodePlaceholder')}
                  {...register('code')}
                  error={errors.code?.message}
                  disabled={isLoading || isLocked}
                  autoComplete="one-time-code"
                  maxLength={10}
                  className="text-center text-lg tracking-widest"
                  data-testid="backup-code-input"
                />
                <p className="text-sm text-muted-foreground">
                  {t('backupCodeInstructions')}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center space-x-2">
            <Switch
              id="remember-device"
              checked={watchRememberDevice}
              onCheckedChange={(checked) => {
                reset({ code: '', rememberDevice: checked });
              }}
              disabled={isLoading || isLocked}
              data-testid="remember-device-switch"
            />
            <Label htmlFor="remember-device" className="text-sm">
              {t('rememberDevice')}
            </Label>
          </div>
          
          {watchRememberDevice && (
            <Alert>
              <AlertDescription className="text-sm">
                {t('rememberDeviceWarning')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || isLocked}
            data-testid="verify-mfa-button"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('verify.button')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full"
            data-testid="cancel-mfa-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('cancel')}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {t('troubleMessage')}{' '}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={() => handleMethodChange(activeMethod === 'totp' ? 'backup_code' : 'totp')}
              disabled={isLoading || isLocked}
            >
              {activeMethod === 'totp' ? t('useBackupCode') : t('useAuthenticator')}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
