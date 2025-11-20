'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Shield,
  Smartphone,
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptimizedQRImage } from '@/components/ui/optimized-image';
import {
  mfaQueryKeys,
  useMfaEnable,
  useMfaSetup,
} from '@/modules/auth/hooks/useMfa';
import type { MfaSetupResponse } from '@/modules/auth/types';

const mfaSetupSchema = z.object({
  verificationCode: z
    .string()
    .min(6, 'Verification code must be 6 digits')
    .max(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});

type MfaSetupFormData = z.infer<typeof mfaSetupSchema>;

interface MfaSetupFormProps {
  userId: string;
  userEmail: string;
  isRequired?: boolean;
  redirectTo?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MfaSetupForm({
  userId,
  userEmail,
  isRequired = false,
  redirectTo = '/dashboard',
  onSuccess,
  onCancel,
}: MfaSetupFormProps) {
  const t = useTranslations('auth.mfa');
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setupMutation = useMfaSetup();
  const enableMutation = useMfaEnable();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [currentStep, setCurrentStep] = useState<
    'setup' | 'verify' | 'backup' | 'complete'
  >('setup');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState<number[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const rawRedirectTo =
    redirectTo || searchParams.get('redirectTo') || '/dashboard';
  const safeRedirectTo =
    rawRedirectTo && rawRedirectTo.startsWith('/')
      ? rawRedirectTo
      : '/dashboard';
  const finalRedirectTo = useMemo(
    () =>
      /^\/(en|he)\//.test(safeRedirectTo)
        ? safeRedirectTo
        : `/${locale}${safeRedirectTo}`,
    [locale, safeRedirectTo]
  );
  const required = isRequired || searchParams.get('required') === 'true';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MfaSetupFormData>({
    resolver: zodResolver(mfaSetupSchema),
  });

  const bootstrapSetup = useCallback(async () => {
    if (!userId) {
      setSetupData(null);
      setIsBootstrapping(false);
      return;
    }

    setError(null);
    setIsBootstrapping(true);
    try {
      const data = await setupMutation.mutateAsync();
      setSetupData(data);
      setCurrentStep('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('setup.error'));
    } finally {
      setIsBootstrapping(false);
    }
  }, [setupMutation, t, userId]);

  useEffect(() => {
    void bootstrapSetup();
  }, [bootstrapSetup]);

  const onSubmit = async (data: MfaSetupFormData) => {
    if (!setupData) {
      return;
    }

    setError(null);
    try {
      await enableMutation.mutateAsync({
        totpCode: data.verificationCode,
        secret: setupData.secret,
        backupCodes: setupData.backupCodes,
      });

      setCurrentStep('backup');
      await queryClient.invalidateQueries({ queryKey: mfaQueryKeys.status() });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('setup.verificationFailed')
      );
      reset();
    }
  };

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyBackupCode = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedCodes(prev => [...prev, index]);
    setTimeout(() => {
      setCopiedCodes(prev => prev.filter(i => i !== index));
    }, 2000);
  };

  const handleDownloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = [
      'Loom MFA Backup Codes',
      '========================',
      '',
      'IMPORTANT: Save these backup codes in a secure location.',
      'Each code can only be used once.',
      '',
      ...setupData.backupCodes.map((code, index) => `${index + 1}. ${code}`),
      '',
      `Generated on: ${new Date().toLocaleString()}`,
      `Account: ${userEmail}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loom-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      router.push(finalRedirectTo);
      router.refresh();
    }
  };

  const handleCancel = () => {
    if (required) {
      router.push(`/${locale}/dashboard`);
    } else if (onCancel) {
      onCancel();
    } else {
      router.push(`/${locale}/settings`);
    }
  };

  const handleBackToSetup = () => {
    setError(null);
    setCurrentStep('setup');
  };

  const isLoading =
    isBootstrapping || setupMutation.isPending || enableMutation.isPending;

  const renderSetupStep = () => (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {required && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>{t('setup.required')}</AlertDescription>
        </Alert>
      )}

      <div className="text-center">
        <div className="mb-4">
          {setupData?.qrCodeUrl ? (
            <OptimizedQRImage
              src={setupData.qrCodeUrl}
              alt={t('setup.qrCodeAlt')}
              size={200}
            />
          ) : (
            <div className="w-48 h-48 mx-auto bg-muted animate-pulse rounded-lg" />
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t('setup.scanInstructions')}
        </p>

        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <Label className="text-xs font-medium">
              {t('setup.manualEntry')}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-sm font-mono bg-background px-2 py-1 rounded border">
                {setupData?.secret || '••••••••••••••••'}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopySecret}
                disabled={!setupData?.secret}
              >
                {copiedSecret ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {t('setup.compatibleApps')}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep('verify')}
          disabled={!setupData || isLoading}
          className="flex-1"
        >
          <Smartphone className="w-4 h-4 mr-2" />
          {t('setup.continue')}
        </Button>

        {!required && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {t('cancel')}
          </Button>
        )}
      </div>
    </div>
  );

  const renderVerifyStep = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="verification-code">{t('setup.verificationCode')}</Label>
        <Input
          id="verification-code"
          placeholder={t('setup.verificationCodePlaceholder')}
          {...register('verificationCode')}
          error={errors.verificationCode?.message}
          disabled={isLoading}
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          className="text-center text-lg tracking-widest"
          data-testid="verification-code-input"
        />
        <p className="text-sm text-muted-foreground">
          {t('setup.verificationInstructions')}
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleBackToSetup}
          disabled={isLoading}
        >
          {t('back')}
        </Button>

        <Button
          type="submit"
          className="flex-1"
          disabled={isLoading}
          data-testid="verify-setup-button"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('setup.verify')}
        </Button>
      </div>
    </form>
  );

  const renderBackupStep = () => (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>{t('backup.importance')}</AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">{t('backup.codes')}</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowBackupCodes(!showBackupCodes)}
            >
              {showBackupCodes ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadBackupCodes}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {setupData?.backupCodes.map((code, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-muted rounded border"
            >
              <Badge
                variant="outline"
                className="text-xs min-w-[24px] justify-center"
              >
                {index + 1}
              </Badge>
              <code className="flex-1 text-sm font-mono">
                {showBackupCodes ? code : '••••••••'}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopyBackupCode(code, index)}
                className="h-6 w-6 p-0"
                disabled={!showBackupCodes}
              >
                {copiedCodes.includes(index) ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>• {t('backup.instructions.1')}</p>
          <p>• {t('backup.instructions.2')}</p>
          <p>• {t('backup.instructions.3')}</p>
        </div>
      </div>

      <Button
        onClick={() => setCurrentStep('complete')}
        className="w-full"
        data-testid="save-backup-codes-button"
      >
        {t('backup.saved')}
      </Button>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600" />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          {t('complete.title')}
        </h3>
        <p className="text-muted-foreground">{t('complete.description')}</p>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>✓ {t('complete.features.1')}</p>
        <p>✓ {t('complete.features.2')}</p>
        <p>✓ {t('complete.features.3')}</p>
      </div>

      <Button
        onClick={handleComplete}
        className="w-full"
        data-testid="complete-mfa-setup-button"
      >
        {t('complete.continue')}
      </Button>
    </div>
  );

  if (isBootstrapping && !setupData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">
          {currentStep === 'complete' ? t('complete.title') : t('setup.title')}
        </CardTitle>
        <CardDescription>
          {currentStep === 'setup' && t('setup.description')}
          {currentStep === 'verify' && t('setup.verifyDescription')}
          {currentStep === 'backup' && t('backup.description')}
          {currentStep === 'complete' && t('complete.description')}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {currentStep === 'setup' && renderSetupStep()}
        {currentStep === 'verify' && renderVerifyStep()}
        {currentStep === 'backup' && renderBackupStep()}
        {currentStep === 'complete' && renderCompleteStep()}
      </CardContent>
    </Card>
  );
}
