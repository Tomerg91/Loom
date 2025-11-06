'use client';

import { 
  Shield,
  Smartphone,
  Key,
  Eye,
  EyeOff,
  Monitor,
  Lock,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe
} from 'lucide-react';
import { useState, useMemo } from 'react';

import { MfaManagementCard } from '@/components/auth/mfa/mfa-management-card';
import type { SecurityEvent, TrustedDevice } from '@/components/auth/mfa/mfa-management-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatDate } from '@/lib/utils';
import { logger } from '@/lib/logger';

const connectedDevices = [
  {
    id: '1',
    name: 'MacBook Pro',
    type: 'desktop',
    location: 'New York, NY',
    lastActive: '2024-01-20T10:30:00Z',
    current: true,
  },
  {
    id: '2',
    name: 'iPhone 15',
    type: 'mobile',
    location: 'New York, NY',
    lastActive: '2024-01-19T18:45:00Z',
    current: false,
  },
  {
    id: '3',
    name: 'Chrome Browser',
    type: 'browser',
    location: 'Unknown Location',
    lastActive: '2024-01-18T14:20:00Z',
    current: false,
  },
];

export function SecuritySettingsCard() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // Mock MFA data
  const mockBackupCodes = [
    '12345678', '87654321', '11223344', '44332211',
    '55667788', '88776655', '99001122', '22110099'
  ];
  
  const mockUsedBackupCodes = ['12345678', '87654321']; // Two codes used
  
  const mockSecurityEvents: SecurityEvent[] = [
    {
      id: '1',
      type: 'login',
      timestamp: '2024-01-20T10:30:00Z',
      location: 'New York, NY',
      device: 'MacBook Pro',
      ipAddress: '192.168.1.1'
    },
    {
      id: '2',
      type: 'backup_code_used',
      timestamp: '2024-01-19T18:45:00Z',
      location: 'New York, NY',
      device: 'iPhone 15',
      ipAddress: '192.168.1.2'
    },
    {
      id: '3',
      type: 'device_trusted',
      timestamp: '2024-01-18T14:20:00Z',
      location: 'Unknown Location',
      device: 'Chrome Browser',
      ipAddress: '192.168.1.3'
    }
  ];
  
  const mockTrustedDevices: TrustedDevice[] = [
    {
      id: '1',
      name: 'MacBook Pro',
      type: 'desktop',
      lastUsed: '2024-01-20T10:30:00Z',
      location: 'New York, NY',
      ipAddress: '192.168.1.1',
      current: true
    },
    {
      id: '2',
      name: 'iPhone 15',
      type: 'mobile',
      lastUsed: '2024-01-19T18:45:00Z',
      location: 'New York, NY',
      ipAddress: '192.168.1.2'
    }
  ];

  // Memoize formatted dates for device activity
  const deviceActivityDates = useMemo(() => {
    return connectedDevices.reduce((acc, device) => {
      acc[device.id] = formatDate(device.lastActive);
      return acc;
    }, {} as Record<string, string>);
  }, []);

  // MFA handlers
  const handleMfaToggle = async (enabled: boolean) => {
    logger.debug('Toggling MFA:', enabled);
    // In a real app, this would call your API
    setMfaEnabled(enabled);
  };

  const handleMfaSetup = async () => {
    logger.debug('MFA setup completed');
    // In a real app, this would save the MFA configuration
    setMfaEnabled(true);
  };

  const handleRegenerateBackupCodes = async () => {
    logger.debug('Regenerating backup codes');
    // In a real app, this would call your API to regenerate codes
  };

  const handleRemoveTrustedDevice = async (deviceId: string) => {
    logger.debug('Removing trusted device:', deviceId);
    // In a real app, this would call your API to remove the device
  };

  const securityFeatures = [
    {
      id: 'passwordExpiry',
      title: 'Password Expiry',
      description: 'Require password changes every 90 days',
      icon: Clock,
      enabled: false,
      status: 'optional',
    },
    {
      id: 'loginAlerts',
      title: 'Login Alerts',
      description: 'Get notified of new login attempts',
      icon: Shield,
      enabled: true,
      status: 'enabled',
    },
    {
      id: 'sessionTimeout',
      title: 'Session Timeout',
      description: 'Automatically log out after 24 hours of inactivity',
      icon: Lock,
      enabled: true,
      status: 'enabled',
    },
  ];

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return Smartphone;
      case 'desktop':
        return Monitor;
      default:
        return Globe;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enabled':
        return 'bg-green-100 text-green-800';
      case 'recommended':
        return 'bg-yellow-100 text-yellow-800';
      case 'optional':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Password &amp; Authentication</span>
          </CardTitle>
          <CardDescription>
            Manage your password and authentication methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">
                Last changed 45 days ago
              </p>
            </div>
            <Button variant="outline">
              Change Password
            </Button>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your password meets all security requirements
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Multi-Factor Authentication */}
      <MfaManagementCard
        isEnabled={mfaEnabled}
        onToggle={handleMfaToggle}
        onSetup={handleMfaSetup}
        backupCodes={mfaEnabled ? mockBackupCodes : []}
        usedBackupCodes={mfaEnabled ? mockUsedBackupCodes : []}
        onRegenerateBackupCodes={handleRegenerateBackupCodes}
        securityEvents={mfaEnabled ? mockSecurityEvents : []}
        trustedDevices={mfaEnabled ? mockTrustedDevices : []}
        onRemoveTrustedDevice={handleRemoveTrustedDevice}
      />

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle>Security Features</CardTitle>
          <CardDescription>
            Configure additional security measures for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {securityFeatures.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{feature.title}</p>
                      <Badge className={getStatusColor(feature.status)}>
                        {feature.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {feature.enabled ? (
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  ) : (
                    <Button size="sm">
                      Enable
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Connected Devices */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Devices</CardTitle>
          <CardDescription>
            Manage devices that have access to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectedDevices.map((device) => {
            const IconComponent = getDeviceIcon(device.type);
            return (
              <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <IconComponent className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{device.name}</p>
                      {device.current && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {device.location} • Last active {deviceActivityDates[device.id]}
                    </p>
                  </div>
                </div>
                {!device.current && (
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    Remove
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>
            Control your privacy and data sharing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Profile Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Allow other users to find and view your profile
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Activity Status</Label>
              <p className="text-sm text-muted-foreground">
                Show when you&apos;re online and your last activity
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Analytics &amp; Cookies</Label>
              <p className="text-sm text-muted-foreground">
                Allow us to collect analytics data to improve the service
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Data Export</Label>
              <p className="text-sm text-muted-foreground">
                Download a copy of your data
              </p>
            </div>
            <Button variant="outline" size="sm">
              Request Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Advanced Security</CardTitle>
              <CardDescription>
                Advanced security options for power users
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Show
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                These settings are for advanced users only. Changing these settings may affect your account security.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>API Access</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow third-party applications to access your account via API
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Webhook Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send real-time notifications to external services
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Recording</Label>
                  <p className="text-sm text-muted-foreground">
                    Record sessions for quality assurance (with participant consent)
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Account Deletion */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that will affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
              <div>
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}