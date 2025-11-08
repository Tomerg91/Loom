'use client';

import { 
  Shield,
  Smartphone,
  Key,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Monitor
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';


import { MfaVerificationInput } from './mfa-verification-input';

export interface MfaChallengeFormProps {
  onVerify: (data: MfaChallengeData) => Promise<void>;
  onCancel?: () => void;
  onUseBackupCode: () => void;
  isLoading?: boolean;
  error?: string | null;
  allowTrustDevice?: boolean;
  canUseBackupCode?: boolean;
}

export interface MfaChallengeData {
  code: string;
  trustDevice?: boolean;
  type: 'totp' | 'backup';
}

type ChallengeMode = 'totp' | 'backup';

export function MfaChallengeForm({
  onVerify,
  onCancel,
  _onUseBackupCode,
  isLoading = false,
  error,
  allowTrustDevice = true,
  canUseBackupCode = true
}: MfaChallengeFormProps) {
  const t = useTranslations('mfa');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [mode, setMode] = useState<ChallengeMode>('totp');

  const handleSubmit = async () => {
    const code = mode === 'totp' ? verificationCode : backupCode;
    if (!code || (mode === 'totp' && code.length !== 6) || (mode === 'backup' && code.length !== 8)) {
      return;
    }

    await onVerify({
      code,
      trustDevice: allowTrustDevice ? trustDevice : undefined,
      type: mode
    });
  };

  const currentCode = mode === 'totp' ? verificationCode : backupCode;
  const _setCurrentCode = mode === 'totp' ? setVerificationCode : setBackupCode;
  const expectedLength = mode === 'totp' ? 6 : 8;
  const canSubmit = currentCode.length === expectedLength && !isLoading;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>{t('challenge.title')}</CardTitle>
        <CardDescription>
          {mode === 'totp' 
            ? t('challenge.description') 
            : t('challenge.backupDescription')
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Mode Toggle */}
        {canUseBackupCode && (
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant={mode === 'totp' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('totp')}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>{t('challenge.authenticatorApp')}</span>
            </Button>
            <Button
              variant={mode === 'backup' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('backup')}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Key className="w-4 h-4" />
              <span>{t('challenge.backupCode')}</span>
            </Button>
          </div>
        )}

        {/* Verification Input */}
        <div className="space-y-4">
          {mode === 'totp' ? (
            <MfaVerificationInput
              value={verificationCode}
              onChange={setVerificationCode}
              onSubmit={handleSubmit}
              error={error}
              disabled={isLoading}
              autoFocus
              label={t('challenge.totpLabel')}
              placeholder="••••••"
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="backup-code">{t('challenge.backupLabel')}</Label>
              <MfaVerificationInput
                value={backupCode}
                onChange={setBackupCode}
                onSubmit={handleSubmit}
                error={error}
                disabled={isLoading}
                autoFocus
                length={8}
                label=""
                placeholder="••••••••"
                className="max-w-sm mx-auto"
              />
              <p className="text-xs text-muted-foreground text-center">
                {t('challenge.backupHelp')}
              </p>
            </div>
          )}
        </div>

        {/* Trust Device Option */}
        {allowTrustDevice && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="trust-device" className="text-sm font-medium">
                    {t('challenge.trustDevice')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('challenge.trustDeviceDescription')}
                  </p>
                </div>
              </div>
              <Switch
                id="trust-device"
                checked={trustDevice}
                onCheckedChange={setTrustDevice}
                disabled={isLoading}
              />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-col space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('challenge.verifying')}
              </>
            ) : (
              t('challenge.verify')
            )}
          </Button>

          {/* Alternative Actions */}
          <div className="space-y-2">
            {canUseBackupCode && mode === 'totp' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('backup')}
                disabled={isLoading}
                className="w-full text-sm"
              >
                <Key className="w-4 h-4 mr-2" />
                {t('challenge.useBackupCode')}
              </Button>
            )}

            {mode === 'backup' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('totp')}
                disabled={isLoading}
                className="w-full text-sm"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                {t('challenge.useAuthenticator')}
              </Button>
            )}
          </div>

          {onCancel && (
            <>
              <Separator />
              <Button
                variant="ghost"
                onClick={onCancel}
                disabled={isLoading}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('challenge.cancel')}
              </Button>
            </>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            {mode === 'totp' 
              ? t('challenge.totpHelp')
              : t('challenge.backupCodeHelp')
            }
          </p>
          
          {mode === 'totp' && (
            <div className="text-xs text-muted-foreground">
              <p>{t('challenge.troubleshoot.title')}</p>
              <ul className="list-disc list-inside text-left space-y-1 mt-2 max-w-sm mx-auto">
                <li>{t('challenge.troubleshoot.tip1')}</li>
                <li>{t('challenge.troubleshoot.tip2')}</li>
                <li>{t('challenge.troubleshoot.tip3')}</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}