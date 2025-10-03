'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Clock,
  Loader2,
  Play,
  History,
  Settings
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

interface MaintenanceOperation {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  risk: 'none' | 'low' | 'medium' | 'high';
  estimatedTime: string;
  parameters?: string[];
  requiresConfirmation?: boolean;
}

interface OperationStatus {
  [key: string]: {
    isRunning: boolean;
    progress?: number;
    message?: string;
    error?: string;
  };
}

export function AdminSystemPage() {
  const t = useTranslations('admin.system');
  const [activeTab, setActiveTab] = useState('overview');
  const [operationStatus, setOperationStatus] = useState<OperationStatus>({});
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; operation?: MaintenanceOperation }>({ isOpen: false });
  const queryClient = useQueryClient();

  const { data: systemHealth, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await fetch('/api/admin/system');
      
      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }
      
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: systemSettings, isLoading: settingsLoading } = useQuery<SystemSettings>({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/system/settings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch system settings');
      }
      
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch available maintenance operations
  const { data: maintenanceInfo, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['maintenance-info'],
    queryFn: async () => {
      const response = await fetch('/api/admin/maintenance');
      
      if (!response.ok) {
        throw new Error('Failed to fetch maintenance info');
      }
      
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch maintenance history
  const { data: maintenanceHistoryData, isLoading: historyLoading } = useQuery({
    queryKey: ['maintenance-history'],
    queryFn: async () => {
      const response = await fetch('/api/admin/maintenance/history?limit=10');
      
      if (!response.ok) {
        throw new Error('Failed to fetch maintenance history');
      }
      
      const result = await response.json();
      return result.data;
    },
  });

  const maintenanceHistory = maintenanceHistoryData?.history || [];

  // Mutation for performing maintenance operations
  const performMaintenanceMutation = useMutation({
    mutationFn: async ({ action, params, requiresConfirmation }: { 
      action: string; 
      params?: any; 
      requiresConfirmation?: boolean;
    }) => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add confirmation header for destructive operations
      if (requiresConfirmation) {
        headers['x-confirm-destructive'] = 'true';
      }
      
      const response = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, params }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Maintenance operation failed');
      }
      
      return response.json();
    },
    onMutate: (variables) => {
      setOperationStatus(prev => ({
        ...prev,
        [variables.action]: {
          isRunning: true,
          progress: 0,
          message: 'Starting operation...'
        }
      }));
    },
    onSuccess: (data, variables) => {
      setOperationStatus(prev => ({
        ...prev,
        [variables.action]: {
          isRunning: false,
          progress: 100,
          message: data.data.message
        }
      }));
      
      // Refresh system health data and maintenance history
      queryClient.invalidateQueries({ queryKey: ['system-health'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-history'] });
    },
    onError: (error: Error, variables) => {
      setOperationStatus(prev => ({
        ...prev,
        [variables.action]: {
          isRunning: false,
          progress: 0,
          error: error.message
        }
      }));
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

  // Helper functions
  const getMaintenanceOperations = (): MaintenanceOperation[] => {
    if (!maintenanceInfo?.availableActions) return [];
    
    const actions = maintenanceInfo.availableActions;
    
    return [
      {
        id: 'backup_database',
        name: actions.backup_database?.name || 'Database Backup',
        description: actions.backup_database?.description || 'Create database backup',
        icon: <Database className="h-6 w-6" />,
        action: 'backup_database',
        risk: actions.backup_database?.risk || 'low',
        estimatedTime: actions.backup_database?.estimatedTime || '30-120s',
        parameters: actions.backup_database?.parameters || []
      },
      {
        id: 'clear_cache',
        name: actions.clear_cache?.name || 'Clear Cache',
        description: actions.clear_cache?.description || 'Clear application cache',
        icon: <RefreshCw className="h-6 w-6" />,
        action: 'clear_cache',
        risk: actions.clear_cache?.risk || 'low',
        estimatedTime: actions.clear_cache?.estimatedTime || '1-5s'
      },
      {
        id: 'export_logs',
        name: actions.export_logs?.name || 'Export Logs',
        description: actions.export_logs?.description || 'Export system logs',
        icon: <Download className="h-6 w-6" />,
        action: 'export_logs',
        risk: actions.export_logs?.risk || 'low',
        estimatedTime: actions.export_logs?.estimatedTime || '10-60s'
      },
      {
        id: 'clean_temp_files',
        name: actions.clean_temp_files?.name || 'Clean Temp Files',
        description: actions.clean_temp_files?.description || 'Clean temporary files',
        icon: <Trash2 className="h-6 w-6" />,
        action: 'clean_temp_files',
        risk: actions.clean_temp_files?.risk || 'low',
        estimatedTime: actions.clean_temp_files?.estimatedTime || '5-20s'
      },
      {
        id: 'system_cleanup',
        name: actions.system_cleanup?.name || 'System Cleanup',
        description: actions.system_cleanup?.description || 'Comprehensive system cleanup',
        icon: <Settings className="h-6 w-6" />,
        action: 'system_cleanup',
        risk: actions.system_cleanup?.risk || 'medium',
        estimatedTime: actions.system_cleanup?.estimatedTime || '30-90s',
        requiresConfirmation: true
      },
      {
        id: 'restart_services',
        name: actions.restart_services?.name || 'Restart Services',
        description: actions.restart_services?.description || 'Restart system services',
        icon: <Play className="h-6 w-6" />,
        action: 'restart_services',
        risk: actions.restart_services?.risk || 'high',
        estimatedTime: actions.restart_services?.estimatedTime || '10-30s',
        requiresConfirmation: true
      }
    ];
  };
  
  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'high':
      case 'critical':
        return 'destructive' as const;
      case 'medium':
        return 'secondary' as const;
      case 'low':
        return 'outline' as const;
      default:
        return 'default' as const;
    }
  };
  
  const handleMaintenanceOperation = (operation: MaintenanceOperation) => {
    if (operation.requiresConfirmation) {
      setConfirmDialog({ isOpen: true, operation });
    } else {
      performMaintenanceMutation.mutate({
        action: operation.action,
        requiresConfirmation: false
      });
    }
  };
  
  const handleConfirmedOperation = () => {
    if (confirmDialog.operation) {
      performMaintenanceMutation.mutate({
        action: confirmDialog.operation.action,
        requiresConfirmation: true
      });
    }
    setConfirmDialog({ isOpen: false });
  };

  if (healthLoading || settingsLoading || maintenanceLoading) {
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
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="maintenance" className="relative">
            Maintenance
            {Object.values(operationStatus).some(status => status.isRunning) && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </TabsTrigger>
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
              <div className="space-y-6">
                {/* Maintenance Operations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getMaintenanceOperations().map((operation) => {
                    const status = operationStatus[operation.action];
                    const isRunning = status?.isRunning || false;
                    
                    return (
                      <div key={operation.id} className="relative">
                        <Button 
                          variant="outline" 
                          className="h-32 flex-col p-4 w-full"
                          disabled={isRunning}
                          onClick={() => handleMaintenanceOperation(operation)}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            {isRunning ? (
                              <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                              operation.icon
                            )}
                            <Badge 
                              variant={getRiskBadgeVariant(operation.risk)}
                              className="text-xs"
                            >
                              {operation.risk}
                            </Badge>
                          </div>
                          
                          <div className="text-center">
                            <div className="font-medium mb-1">{operation.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {operation.estimatedTime}
                            </div>
                          </div>
                          
                          {/* Progress bar for running operations */}
                          {isRunning && status?.progress !== undefined && (
                            <div className="absolute bottom-2 left-2 right-2">
                              <Progress value={status.progress} className="h-1" />
                            </div>
                          )}
                        </Button>
                        
                        {/* Status message */}
                        {status && (status.message || status.error) && (
                          <div className="mt-2 text-xs text-center">
                            {status.error ? (
                              <span className="text-red-600">{status.error}</span>
                            ) : (
                              <span className="text-green-600">{status.message}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => performMaintenanceMutation.mutate({ action: 'database_health_check' })}
                    disabled={operationStatus.database_health_check?.isRunning}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Quick Health Check
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => performMaintenanceMutation.mutate({ action: 'get_cache_stats' })}
                    disabled={operationStatus.get_cache_stats?.isRunning}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Cache Stats
                  </Button>
                </div>
                
                {/* Recent Operations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Recent Maintenance Operations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : maintenanceHistory && maintenanceHistory.length > 0 ? (
                      <div className="space-y-2">
                        {maintenanceHistory.slice(0, 5).map((operation: any) => (
                          <div key={operation.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-3">
                              <Badge variant={operation.status === 'completed' ? 'default' : 'destructive'}>
                                {operation.status}
                              </Badge>
                              <span className="font-medium">{operation.action}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(operation.startedAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No maintenance operations recorded yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Confirmation Dialog */}
              <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => setConfirmDialog({ isOpen: open })}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Maintenance Operation</DialogTitle>
                    <DialogDescription>
                      {confirmDialog.operation && (
                        <div className="space-y-3">
                          <p>You are about to perform: <strong>{confirmDialog.operation.name}</strong></p>
                          <p className="text-sm text-muted-foreground">
                            {confirmDialog.operation.description}
                          </p>
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Risk Level: <strong>{confirmDialog.operation.risk}</strong>
                              {confirmDialog.operation.risk === 'high' && (
                                <span className="block mt-1">This operation may affect system availability.</span>
                              )}
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setConfirmDialog({ isOpen: false })}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleConfirmedOperation}
                      disabled={performMaintenanceMutation.isPending}
                    >
                      {performMaintenanceMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Confirm & Execute
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Export as default for dynamic imports
export default AdminSystemPage;