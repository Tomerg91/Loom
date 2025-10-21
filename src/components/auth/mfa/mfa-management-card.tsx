'use client';

import { 
  Shield,
  Smartphone,
  Key,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  History,
  Download,
  RefreshCw,
  Trash2,
  Plus,
  Monitor,
  MapPin,
  Calendar
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { formatDate } from '@/lib/utils';

import { MfaBackupCodes } from './mfa-backup-codes';
import { MfaSetupWizard } from './mfa-setup-wizard';

export interface MfaManagementCardProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
  onSetup: () => Promise<void>;
  backupCodes?: string[];
  usedBackupCodes?: string[];
  onRegenerateBackupCodes?: () => Promise<void>;
  securityEvents?: SecurityEvent[];
  trustedDevices?: TrustedDevice[];
  onRemoveTrustedDevice?: (deviceId: string) => Promise<void>;
  isLoading?: boolean;
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'backup_code_used' | 'device_trusted' | 'mfa_enabled' | 'mfa_disabled' | 'backup_codes_regenerated';
  timestamp: string;
  location?: string;
  device?: string;
  ipAddress?: string;
}

export interface TrustedDevice {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'browser';
  lastUsed: string;
  location?: string;
  ipAddress?: string;
  current?: boolean;
}

export function MfaManagementCard({
  isEnabled,
  onToggle,
  onSetup,
  backupCodes = [],
  usedBackupCodes = [],
  onRegenerateBackupCodes,
  securityEvents = [],
  trustedDevices = [],
  onRemoveTrustedDevice,
  isLoading = false
}: MfaManagementCardProps) {
  const t = useTranslations('mfa');
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showSecurityEvents, setShowSecurityEvents] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    if (enabled && !isEnabled) {
      setShowSetupWizard(true);
      return;
    }

    setIsToggling(true);
    try {
      await onToggle(enabled);
    } finally {
      setIsToggling(false);
    }
  };

  const handleSetupComplete = async () => {
    setShowSetupWizard(false);
    await onSetup();
  };

  const handleRegenerateBackupCodes = async () => {
    if (!onRegenerateBackupCodes) return;
    
    setIsRegenerating(true);
    try {
      await onRegenerateBackupCodes();
    } finally {
      setIsRegenerating(false);
    }
  };

  const getEventIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'login':
        return Shield;
      case 'backup_code_used':
        return Key;
      case 'device_trusted':
        return Monitor;
      case 'mfa_enabled':
        return CheckCircle;
      case 'mfa_disabled':
        return AlertTriangle;
      case 'backup_codes_regenerated':
        return RefreshCw;
      default:
        return Shield;
    }
  };

  const getDeviceIcon = (type: TrustedDevice['type']) => {
    switch (type) {
      case 'mobile':
        return Smartphone;
      case 'desktop':
        return Monitor;
      default:
        return Monitor;
    }
  };

  if (showSetupWizard) {
    return (
      <MfaSetupWizard
        onComplete={handleSetupComplete}
        onCancel={() => setShowSetupWizard(false)}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Main MFA Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{t('management.title')}</span>
            </div>
            <Badge variant={isEnabled ? 'default' : 'secondary'}>
              {isEnabled ? t('management.enabled') : t('management.disabled')}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t('management.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status and Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isEnabled ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {isEnabled ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Shield className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {isEnabled ? t('management.status.enabled') : t('management.status.disabled')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isEnabled 
                    ? t('management.status.enabledDescription')
                    : t('management.status.disabledDescription')
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="mfa-toggle" className="sr-only">
                {t('management.toggle')}
              </Label>
              <Switch
                id="mfa-toggle"
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={isToggling || isLoading}
              />
            </div>
          </div>

          {!isEnabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('management.recommendedAlert')}
              </AlertDescription>
            </Alert>
          )}

          {isEnabled && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {t('management.enabledAlert')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Backup Codes Management */}
      {isEnabled && backupCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5" />
                <span>{t('management.backupCodes.title')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={usedBackupCodes.length >= backupCodes.length * 0.7 ? 'destructive' : 'secondary'}>
                  {backupCodes.length - usedBackupCodes.length} {t('management.backupCodes.remaining')}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                >
                  {showBackupCodes ? t('common.hide') : t('common.show')}
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              {t('management.backupCodes.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showBackupCodes ? (
              <MfaBackupCodes
                codes={backupCodes}
                usedCodes={usedBackupCodes}
                onRegenerate={handleRegenerateBackupCodes}
                isRegenerating={isRegenerating}
                showTitle={false}
              />
            ) : (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{t('management.backupCodes.hidden.title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('management.backupCodes.hidden.description')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBackupCodes(true)}
                  >
                    {t('management.backupCodes.view')}
                  </Button>
                  {onRegenerateBackupCodes && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateBackupCodes}
                      disabled={isRegenerating}
                      className="text-destructive hover:text-destructive"
                    >
                      {isRegenerating ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      {t('management.backupCodes.regenerate')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trusted Devices */}
      {isEnabled && trustedDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="w-5 h-5" />
              <span>{t('management.trustedDevices.title')}</span>
            </CardTitle>
            <CardDescription>
              {t('management.trustedDevices.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trustedDevices.map((device) => {
              const DeviceIcon = getDeviceIcon(device.type);
              
              return (
                <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <DeviceIcon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{device.name}</p>
                        {device.current && (
                          <Badge variant="default" className="text-xs">
                            {t('management.trustedDevices.current')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(device.lastUsed)}</span>
                        </div>
                        {device.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{device.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {!device.current && onRemoveTrustedDevice && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveTrustedDevice(device.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('management.trustedDevices.remove')}
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Security Events */}
      {isEnabled && securityEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>{t('management.securityEvents.title')}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSecurityEvents(!showSecurityEvents)}
              >
                {showSecurityEvents ? t('common.hide') : t('common.show')}
              </Button>
            </CardTitle>
            <CardDescription>
              {t('management.securityEvents.description')}
            </CardDescription>
          </CardHeader>
          {showSecurityEvents && (
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {securityEvents.slice(0, 10).map((event) => {
                  const EventIcon = getEventIcon(event.type);
                  
                  return (
                    <div key={event.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                      <EventIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {t(`management.securityEvents.types.${event.type}`)}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(event.timestamp)}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.device && (
                            <span>{event.device}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {securityEvents.length > 10 && (
                <div className="pt-4 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    {t('management.securityEvents.viewAll')} ({securityEvents.length})
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Recovery Options */}
      {isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>{t('management.recovery.title')}</span>
            </CardTitle>
            <CardDescription>
              {t('management.recovery.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <Download className="h-5 w-5" />
                <span className="text-sm">{t('management.recovery.downloadCodes')}</span>
              </Button>
              
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <RefreshCw className="h-5 w-5" />
                <span className="text-sm">{t('management.recovery.regenerateCodes')}</span>
              </Button>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {t('management.recovery.warning')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}