'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Server,
  Database,
  Shield,
  Mail,
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Copy,
  Clock
} from 'lucide-react';

interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'error';
    connections: number;
    maxConnections: number;
    responseTime: number;
    lastBackup: string;
  };
  server: {
    status: 'healthy' | 'warning' | 'error';
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
    cpu: number;
    storage: {
      used: number;
      total: number;
    };
  };
  services: {
    auth: 'online' | 'offline' | 'degraded';
    email: 'online' | 'offline' | 'degraded';
    storage: 'online' | 'offline' | 'degraded';
    notifications: 'online' | 'offline' | 'degraded';
  };
}

interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    maintenanceMode: boolean;
    allowRegistration: boolean;
    maxUsersPerCoach: number;
    sessionDuration: number;
  };
  security: {
    twoFactorRequired: boolean;
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    ipWhitelist: string[];
  };
  email: {
    provider: string;
    fromAddress: string;
    replyToAddress: string;
    templatesEnabled: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    digestFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

export function AdminSystemPage() {
  const t = useTranslations('admin.system');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: systemHealth, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: async () => {
      // Mock API call
      return {
        database: {
          status: 'healthy',
          connections: 45,
          maxConnections: 100,
          responseTime: 12,
          lastBackup: '2024-01-20T02:00:00Z',
        },
        server: {
          status: 'healthy',
          uptime: 2592000, // 30 days in seconds
          memory: {
            used: 2.4,
            total: 8.0,
          },
          cpu: 34,
          storage: {
            used: 45.2,
            total: 100.0,
          },
        },
        services: {
          auth: 'online',
          email: 'online',
          storage: 'online',
          notifications: 'online',
        },
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: systemSettings, isLoading: settingsLoading } = useQuery<SystemSettings>({
    queryKey: ['system-settings'],
    queryFn: async () => {
      // Mock API call
      return {
        general: {
          siteName: 'Loom Coaching Platform',
          siteDescription: 'Professional coaching platform for personal and professional development',
          maintenanceMode: false,
          allowRegistration: true,
          maxUsersPerCoach: 50,
          sessionDuration: 60,
        },
        security: {
          twoFactorRequired: false,
          passwordMinLength: 8,
          sessionTimeout: 1440, // 24 hours
          maxLoginAttempts: 5,
          ipWhitelist: [],
        },
        email: {
          provider: 'SendGrid',
          fromAddress: 'noreply@loom.com',
          replyToAddress: 'support@loom.com',
          templatesEnabled: true,
        },
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          digestFrequency: 'daily',
        },
      };
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-600';
      case 'warning':
      case 'degraded':
        return 'text-yellow-600';
      case 'error':
      case 'offline':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    return `${bytes.toFixed(1)} GB`;
  };

  if (healthLoading || settingsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Logs
          </Button>
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemHealth?.database.status || 'unknown')}
                  <span className={`text-sm font-medium ${getStatusColor(systemHealth?.database.status || 'unknown')}`}>
                    {systemHealth?.database.status || 'Unknown'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {systemHealth?.database.connections || 0}/{systemHealth?.database.maxConnections || 0} connections
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Server</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemHealth?.server.status || 'unknown')}
                  <span className={`text-sm font-medium ${getStatusColor(systemHealth?.server.status || 'unknown')}`}>
                    {systemHealth?.server.status || 'Unknown'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Uptime: {formatUptime(systemHealth?.server.uptime || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(((systemHealth?.server.memory.used || 0) / (systemHealth?.server.memory.total || 1)) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(systemHealth?.server.memory.used || 0)} / {formatBytes(systemHealth?.server.memory.total || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(((systemHealth?.server.storage.used || 0) / (systemHealth?.server.storage.total || 1)) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(systemHealth?.server.storage.used || 0)} / {formatBytes(systemHealth?.server.storage.total || 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Service Status */}
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>Current status of all system services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Authentication</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(systemHealth?.services.auth || 'unknown')}
                    <span className={`text-sm ${getStatusColor(systemHealth?.services.auth || 'unknown')}`}>
                      {systemHealth?.services.auth || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Email</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(systemHealth?.services.email || 'unknown')}
                    <span className={`text-sm ${getStatusColor(systemHealth?.services.email || 'unknown')}`}>
                      {systemHealth?.services.email || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Storage</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(systemHealth?.services.storage || 'unknown')}
                    <span className={`text-sm ${getStatusColor(systemHealth?.services.storage || 'unknown')}`}>
                      {systemHealth?.services.storage || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Notifications</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(systemHealth?.services.notifications || 'unknown')}
                    <span className={`text-sm ${getStatusColor(systemHealth?.services.notifications || 'unknown')}`}>
                      {systemHealth?.services.notifications || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic site configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input id="siteName" defaultValue={systemSettings?.general.siteName} />
                </div>
                <div>
                  <Label htmlFor="sessionDuration">Default Session Duration (minutes)</Label>
                  <Input 
                    id="sessionDuration" 
                    type="number" 
                    defaultValue={systemSettings?.general.sessionDuration}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea 
                  id="siteDescription" 
                  defaultValue={systemSettings?.general.siteDescription}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="maintenanceMode" defaultChecked={systemSettings?.general.maintenanceMode} />
                <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="allowRegistration" defaultChecked={systemSettings?.general.allowRegistration} />
                <Label htmlFor="allowRegistration">Allow New Registration</Label>
              </div>

              <Button>Save General Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security and authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                  <Input 
                    id="passwordMinLength" 
                    type="number" 
                    defaultValue={systemSettings?.security.passwordMinLength}
                  />
                </div>
                <div>
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input 
                    id="maxLoginAttempts" 
                    type="number" 
                    defaultValue={systemSettings?.security.maxLoginAttempts}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input 
                  id="sessionTimeout" 
                  type="number" 
                  defaultValue={systemSettings?.security.sessionTimeout}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="twoFactorRequired" defaultChecked={systemSettings?.security.twoFactorRequired} />
                <Label htmlFor="twoFactorRequired">Require Two-Factor Authentication</Label>
              </div>

              <Button>Save Security Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          {/* Maintenance Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Actions</CardTitle>
              <CardDescription>System maintenance and administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button variant="outline" className="h-24 flex-col">
                  <Database className="h-8 w-8 mb-2" />
                  <span>Backup Database</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <RefreshCw className="h-8 w-8 mb-2" />
                  <span>Clear Cache</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <Download className="h-8 w-8 mb-2" />
                  <span>Export Logs</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <Upload className="h-8 w-8 mb-2" />
                  <span>Import Data</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <Trash2 className="h-8 w-8 mb-2" />
                  <span>Clean Temp Files</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <Copy className="h-8 w-8 mb-2" />
                  <span>Clone Environment</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}