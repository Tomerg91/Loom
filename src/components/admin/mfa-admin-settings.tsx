'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield,
  Users,
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';

interface MfaAdminSettingsProps {
  onSaveSettings?: (settings: MfaEnforcementSettings) => Promise<void>;
}

interface MfaEnforcementSettings {
  globalRequirement: 'disabled' | 'optional' | 'required' | 'required_new_users';
  roleRequirements: {
    admin: 'optional' | 'required';
    coach: 'optional' | 'required';
    client: 'optional' | 'required';
  };
  gracePeriodDays: number;
  backupCodesRequired: boolean;
  trustedDeviceExpiry: number;
}

interface UserMfaStatus {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coach' | 'client';
  mfaEnabled: boolean;
  lastLogin: string;
  backupCodesUsed: number;
  trustedDevices: number;
}

export function MfaAdminSettings({ onSaveSettings }: MfaAdminSettingsProps) {
  const t = useTranslations('admin');
  const [activeTab, setActiveTab] = useState('enforcement');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - in real app, fetch from API
  const [settings, setSettings] = useState<MfaEnforcementSettings>({
    globalRequirement: 'optional',
    roleRequirements: {
      admin: 'required',
      coach: 'optional',
      client: 'optional'
    },
    gracePeriodDays: 30,
    backupCodesRequired: true,
    trustedDeviceExpiry: 30
  });

  const mockUserStatuses: UserMfaStatus[] = [
    {
      id: '1',
      name: 'John Admin',
      email: 'admin@loom.app',
      role: 'admin',
      mfaEnabled: true,
      lastLogin: '2024-01-20T10:30:00Z',
      backupCodesUsed: 2,
      trustedDevices: 3
    },
    {
      id: '2',
      name: 'Sarah Coach',
      email: 'coach@loom.app',
      role: 'coach',
      mfaEnabled: false,
      lastLogin: '2024-01-19T18:45:00Z',
      backupCodesUsed: 0,
      trustedDevices: 0
    },
    {
      id: '3',
      name: 'Mike Client',
      email: 'client@loom.app',
      role: 'client',
      mfaEnabled: true,
      lastLogin: '2024-01-18T14:20:00Z',
      backupCodesUsed: 1,
      trustedDevices: 2
    }
  ];

  const stats = {
    totalUsers: 150,
    mfaEnabled: 87,
    mfaEnabledPercentage: 58,
    adminMfaEnabled: 15,
    adminMfaEnabledPercentage: 88,
    coachMfaEnabled: 45,
    coachMfaEnabledPercentage: 62,
    clientMfaEnabled: 27,
    clientMfaEnabledPercentage: 35
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      if (onSaveSettings) {
        await onSaveSettings(settings);
      }
      console.log('MFA settings saved:', settings);
    } catch (error) {
      console.error('Failed to save MFA settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (key: keyof MfaEnforcementSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRoleRequirementChange = (role: keyof typeof settings.roleRequirements, value: 'optional' | 'required') => {
    setSettings(prev => ({
      ...prev,
      roleRequirements: {
        ...prev.roleRequirements,
        [role]: value
      }
    }));
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'coach': return 'Coach';
      case 'client': return 'Client';
      default: return role;
    }
  };

  const getRequirementBadge = (requirement: string) => {
    switch (requirement) {
      case 'required':
        return <Badge variant="destructive">Required</Badge>;
      case 'optional':
        return <Badge variant="secondary">Optional</Badge>;
      case 'disabled':
        return <Badge variant="outline">Disabled</Badge>;
      default:
        return <Badge variant="secondary">{requirement}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">MFA Administration</h1>
        <p className="text-muted-foreground">
          Manage multi-factor authentication policies and monitor user compliance
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Users</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">MFA Enabled</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.mfaEnabled} ({stats.mfaEnabledPercentage}%)
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Admins with MFA</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {stats.adminMfaEnabled} ({stats.adminMfaEnabledPercentage}%)
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Compliance</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((stats.adminMfaEnabledPercentage + stats.coachMfaEnabledPercentage) / 2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="enforcement">Enforcement Policies</TabsTrigger>
          <TabsTrigger value="users">User Status</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Enforcement Policies Tab */}
        <TabsContent value="enforcement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Global MFA Policy</span>
              </CardTitle>
              <CardDescription>
                Configure organization-wide MFA requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="global-requirement">Global Requirement</Label>
                  <Select
                    value={settings.globalRequirement}
                    onValueChange={(value: any) => handleSettingChange('globalRequirement', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                      <SelectItem value="required_new_users">Required for New Users</SelectItem>
                      <SelectItem value="required">Required for All Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grace-period">Grace Period (Days)</Label>
                  <Select
                    value={settings.gracePeriodDays.toString()}
                    onValueChange={(value) => handleSettingChange('gracePeriodDays', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No Grace Period</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="60">60 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Require Backup Codes</Label>
                  <p className="text-sm text-muted-foreground">
                    Force users to save backup codes during MFA setup
                  </p>
                </div>
                <Switch
                  checked={settings.backupCodesRequired}
                  onCheckedChange={(checked) => handleSettingChange('backupCodesRequired', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Trusted Device Expiry (Days)</Label>
                <Select
                  value={settings.trustedDeviceExpiry.toString()}
                  onValueChange={(value) => handleSettingChange('trustedDeviceExpiry', parseInt(value))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Role-Based Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Role-Based Requirements</CardTitle>
              <CardDescription>
                Set MFA requirements for different user roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(settings.roleRequirements).map(([role, requirement]) => (
                  <div key={role} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{getRoleLabel(role)}</p>
                      <p className="text-sm text-muted-foreground">
                        MFA requirement for {role} users
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getRequirementBadge(requirement)}
                      <Select
                        value={requirement}
                        onValueChange={(value: 'optional' | 'required') => 
                          handleRoleRequirementChange(role as keyof typeof settings.roleRequirements, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="optional">Optional</SelectItem>
                          <SelectItem value="required">Required</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Save Settings */}
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isLoading}>
              {isLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </TabsContent>

        {/* User Status Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>User MFA Status</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Monitor MFA adoption and compliance across all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUserStatuses.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline">{getRoleLabel(user.role)}</Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          {user.mfaEnabled ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-600">Enabled</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                              <span className="text-sm font-medium text-orange-600">Disabled</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {user.trustedDevices} trusted devices
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Last login</p>
                        <p className="text-sm">{new Date(user.lastLogin).toLocaleDateString()}</p>
                      </div>
                      
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>MFA Adoption by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Administrators</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${stats.adminMfaEnabledPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{stats.adminMfaEnabledPercentage}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Coaches</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${stats.coachMfaEnabledPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{stats.coachMfaEnabledPercentage}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Clients</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${stats.clientMfaEnabledPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{stats.clientMfaEnabledPercentage}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Average Backup Codes Used</span>
                    <span className="font-medium">1.2 / 8</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Trusted Devices per User</span>
                    <span className="font-medium">2.1</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>MFA Failures (30 days)</span>
                    <span className="font-medium text-orange-600">23</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Account Lockouts (30 days)</span>
                    <span className="font-medium text-red-600">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              MFA adoption has increased by 15% this month. Consider enforcing MFA for coach accounts to improve overall security posture.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}