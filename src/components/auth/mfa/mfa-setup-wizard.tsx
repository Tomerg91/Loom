'use client';

import { 
  Shield,
  Smartphone,
  Key,
  CheckCircle,
  AlertTriangle,
  Copy,
  Download,
  QrCode,
  ArrowLeft,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';


import { MfaBackupCodes } from './mfa-backup-codes';
import { MfaQrCode } from './mfa-qr-code';
import { MfaVerificationInput } from './mfa-verification-input';

export interface MfaSetupWizardProps {
  onComplete: (data: MfaSetupData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface MfaSetupData {
  secret: string;
  verificationCode: string;
  backupCodes: string[];
}

type SetupStep = 'intro' | 'qr-code' | 'manual-key' | 'verify' | 'backup-codes' | 'complete';

export function MfaSetupWizard({ onComplete, onCancel, isLoading = false }: MfaSetupWizardProps) {
  const t = useTranslations('mfa');
  const [currentStep, setCurrentStep] = useState<SetupStep>('intro');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showManualKey, setShowManualKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate secure secret and backup codes when component mounts
  useEffect(() => {
    const generateSecureMfaData = async () => {
      try {
        // Call the secure MFA service to generate real cryptographic data
        const response = await fetch('/api/auth/mfa/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate MFA data');
        }
        
        const { data, error } = await response.json();
        
        if (error) {
          throw new Error(error);
        }
        
        if (data?.secret && data?.backupCodes) {
          setSecret(data.secret);
          setBackupCodes(data.backupCodes);
        } else {
          throw new Error('Invalid MFA data received');
        }
      } catch (error) {
        console.error('Error generating secure MFA data:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate MFA data');
      }
    };
    
    generateSecureMfaData();
  }, []);

  const steps: Array<{ key: SetupStep; title: string; description: string }> = [
    { key: 'intro', title: t('setup.intro.title'), description: t('setup.intro.description') },
    { key: 'qr-code', title: t('setup.qrCode.title'), description: t('setup.qrCode.description') },
    { key: 'verify', title: t('setup.verify.title'), description: t('setup.verify.description') },
    { key: 'backup-codes', title: t('setup.backupCodes.title'), description: t('setup.backupCodes.description') },
    { key: 'complete', title: t('setup.complete.title'), description: t('setup.complete.description') }
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const canGoNext = () => {
    switch (currentStep) {
      case 'intro':
        return true;
      case 'qr-code':
        return true;
      case 'verify':
        return verificationCode.length === 6;
      case 'backup-codes':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    setError(null);
    
    switch (currentStep) {
      case 'intro':
        setCurrentStep('qr-code');
        break;
      case 'qr-code':
        setCurrentStep('verify');
        break;
      case 'verify':
        if (verificationCode.length === 6) {
          setCurrentStep('backup-codes');
        }
        break;
      case 'backup-codes':
        setCurrentStep('complete');
        break;
      case 'complete':
        onComplete({
          secret,
          verificationCode,
          backupCodes
        });
        break;
    }
  };

  const handleBack = () => {
    setError(null);
    
    switch (currentStep) {
      case 'qr-code':
        setCurrentStep('intro');
        break;
      case 'manual-key':
        setCurrentStep('qr-code');
        break;
      case 'verify':
        setCurrentStep(showManualKey ? 'manual-key' : 'qr-code');
        break;
      case 'backup-codes':
        setCurrentStep('verify');
        break;
      case 'complete':
        setCurrentStep('backup-codes');
        break;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'intro':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{t('setup.intro.heading')}</h3>
              <p className="text-muted-foreground">
                {t('setup.intro.description')}
              </p>
            </div>
            <div className="space-y-4 text-left">
              <div className="flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">{t('setup.intro.step1.title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('setup.intro.step1.description')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <QrCode className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">{t('setup.intro.step2.title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('setup.intro.step2.description')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Key className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">{t('setup.intro.step3.title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('setup.intro.step3.description')}
                  </p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('setup.intro.warning')}
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'qr-code':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">{t('setup.qrCode.heading')}</h3>
              <p className="text-muted-foreground">
                {t('setup.qrCode.instruction')}
              </p>
            </div>
            
            <div className="flex justify-center">
              <MfaQrCode 
                secret={secret}
                issuer="Loom"
                accountName="user@loom.app" // This would come from user context
              />
            </div>

            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowManualKey(true);
                  setCurrentStep('manual-key');
                }}
              >
                <Key className="w-4 h-4 mr-2" />
                {t('setup.qrCode.manualEntry')}
              </Button>
            </div>

            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                {t('setup.qrCode.appSuggestion')}
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'manual-key':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">{t('setup.manualKey.heading')}</h3>
              <p className="text-muted-foreground">
                {t('setup.manualKey.instruction')}
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium text-muted-foreground">
                {t('setup.manualKey.secretKey')}
              </Label>
              <div className="flex items-center justify-between mt-2 p-3 bg-background rounded border">
                <code className="text-sm font-mono break-all">{secret}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(secret);
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('setup.manualKey.accountInfo')}</Label>
                <div className="mt-2 p-3 bg-muted rounded text-sm">
                  <p><strong>{t('setup.manualKey.issuer')}:</strong> Loom</p>
                  <p><strong>{t('setup.manualKey.account')}:</strong> user@loom.app</p>
                </div>
              </div>
            </div>

            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                {t('setup.manualKey.warning')}
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'verify':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">{t('setup.verify.heading')}</h3>
              <p className="text-muted-foreground">
                {t('setup.verify.instruction')}
              </p>
            </div>

            <div className="max-w-sm mx-auto">
              <MfaVerificationInput
                value={verificationCode}
                onChange={setVerificationCode}
                onSubmit={handleNext}
                error={error}
                disabled={isLoading}
                autoFocus
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-center text-sm text-muted-foreground">
              {t('setup.verify.help')}
            </div>
          </div>
        );

      case 'backup-codes':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">{t('setup.backupCodes.heading')}</h3>
              <p className="text-muted-foreground">
                {t('setup.backupCodes.instruction')}
              </p>
            </div>

            <MfaBackupCodes codes={backupCodes} />

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('setup.backupCodes.warning')}
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-green-900">
                {t('setup.complete.heading')}
              </h3>
              <p className="text-muted-foreground">
                {t('setup.complete.instruction')}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-left space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">{t('setup.complete.feature1')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">{t('setup.complete.feature2')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">{t('setup.complete.feature3')}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{t('setup.title')}</span>
            </CardTitle>
            <CardDescription>
              {steps[currentStepIndex]?.description}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {currentStepIndex + 1} / {steps.length}
          </Badge>
        </div>
        
        {/* Progress indicator */}
        <div className="flex items-center space-x-2 mt-4">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  index <= currentStepIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <Separator className="w-8 mx-2" />
              )}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {renderStepContent()}
        
        <div className="flex items-center justify-between pt-6 border-t">
          <div>
            {currentStep !== 'intro' && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('setup.back')}
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              {t('setup.cancel')}
            </Button>
            
            {currentStep === 'complete' ? (
              <Button
                onClick={handleNext}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('setup.finish')}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canGoNext() || isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {currentStep === 'intro' ? t('setup.getStarted') : t('setup.next')}
                {currentStep !== 'intro' && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}