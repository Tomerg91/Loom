'use client';

import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Download,
  Eye,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';

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
  activeMethodTypes: string[];
  lastLogin: string;
  backupCodesUsed: number;
  backupCodesRemaining: number;
  trustedDevices: number;
  mfaVerifiedAt?: string;
  mfaSetupCompleted: boolean;
  createdAt: string;
  lastMfaUsedAt: string | null;
  hasBackupCodes: boolean;
}

interface MfaStatistics {
  totalUsers: number;
  mfaEnabled: number;
  mfaEnabledPercentage: number;
  adminMfaEnabled: number;
  adminMfaEnabledPercentage: number;
  coachMfaEnabled: number;
  coachMfaEnabledPercentage: number;
  clientMfaEnabled: number;
  clientMfaEnabledPercentage: number;
  mfaFailures30Days: number;
  accountLockouts30Days: number;
  averageBackupCodesUsed: number;
  avgTrustedDevicesPerUser: number;
}

interface ApiResponse<T> {
  users?: UserMfaStatus[];
  statistics?: MfaStatistics;
  total?: number;
  page?: number;
  limit?: number;
  data?: T;
}

type MfaUsersApiPayload = {
  users: UserMfaStatus[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
  statistics: MfaStatistics | null;
};

type RoleKey = keyof MfaEnforcementSettings['roleRequirements'];
type RoleRequirement = MfaEnforcementSettings['roleRequirements'][RoleKey];

export function MfaAdminSettings({ onSaveSettings }: MfaAdminSettingsProps) {
  const [activeTab, setActiveTab] = useState('enforcement');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<UserMfaStatus[]>([]);
  const [statistics, setStatistics] = useState<MfaStatistics | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'coach' | 'client'>('all');
  const [mfaStatusFilter, setMfaStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const pageSize = 10;

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

  // Fetch MFA settings from API
  const fetchMfaSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/mfa/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch MFA settings');
      }
      const result = await response.json();
      if (result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      logger.error('Error fetching MFA settings:', error);
      setError('Failed to load MFA settings');
    }
  }, []);

  // Fetch user MFA statuses from API
  const fetchUserStatuses = useCallback(async (
    page = 1,
    search = '',
    role: 'all' | 'admin' | 'coach' | 'client' = 'all',
    mfaStatus: 'all' | 'enabled' | 'disabled' = 'all'
  ) => {
    setIsLoadingUsers(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        includeStatistics: activeTab === 'users' ? 'false' : 'true',
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      
      if (search) params.append('search', search);
      if (role !== 'all') params.append('role', role);
      if (mfaStatus !== 'all') params.append('mfaStatus', mfaStatus);

      const response = await fetch(`/api/admin/mfa/users?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user MFA statuses');
      }
      
      const result: ApiResponse<MfaUsersApiPayload> = await response.json();
      const payload = result.data;
      if (payload) {
        setUserStatuses(payload.users ?? []);
        setTotalUsers(payload.pagination?.total ?? 0);
        setStatistics(payload.statistics);
      }
    } catch (error) {
      logger.error('Error fetching user MFA statuses:', error);
      setError('Failed to load user MFA data');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [activeTab, pageSize]);

  // Fetch MFA statistics from API
  const fetchStatistics = useCallback(async () => {
    setIsLoadingStats(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/mfa/statistics');
      if (!response.ok) {
        throw new Error('Failed to fetch MFA statistics');
      }
      const result = await response.json();
      if (result.data) {
        setStatistics(result.data);
      }
    } catch (error) {
      logger.error('Error fetching MFA statistics:', error);
      setError('Failed to load MFA statistics');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Handle MFA actions for users
  const handleMfaAction = async (userId: string, action: 'enable' | 'disable' | 'reset', reason?: string) => {
    try {
      const response = await fetch(`/api/admin/mfa/users/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, reason }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} MFA for user`);
      }

      // Refresh user data after successful action
      await fetchUserStatuses(currentPage, searchQuery, roleFilter, mfaStatusFilter);
      
      // Also refresh statistics if they're displayed
      if (statistics || activeTab === 'analytics') {
        await fetchStatistics();
      }
    } catch (error) {
      logger.error(`Error ${action}ing MFA:`, error);
      setError(`Failed to ${action} MFA for user`);
    }
  };

  // Load data on component mount and tab changes
  useEffect(() => {
    fetchMfaSettings();
  }, [fetchMfaSettings]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUserStatuses(currentPage, searchQuery, roleFilter, mfaStatusFilter);
    } else if (activeTab === 'analytics') {
      fetchStatistics();
    }
  }, [activeTab, currentPage, fetchStatistics, fetchUserStatuses, mfaStatusFilter, roleFilter, searchQuery]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === 'users') {
        setCurrentPage(1); // Reset to first page on search
        fetchUserStatuses(1, searchQuery, roleFilter, mfaStatusFilter);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [activeTab, fetchUserStatuses, mfaStatusFilter, roleFilter, searchQuery]);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/mfa/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save MFA settings');
      }

      if (onSaveSettings) {
        await onSaveSettings(settings);
      }
    } catch (error) {
      logger.error('Failed to save MFA settings:', error);
      setError('Failed to save MFA settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = <K extends keyof MfaEnforcementSettings>(
    key: K,
    value: MfaEnforcementSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRoleRequirementChange = <R extends keyof MfaEnforcementSettings['roleRequirements']>(
    role: R,
    value: MfaEnforcementSettings['roleRequirements'][R]
  ) => {
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

      {/* Error Alert */}
      {error && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Users</span>
            </div>
            <div className="text-2xl font-bold">
              {isLoadingStats ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded" />
              ) : (
                statistics?.totalUsers || 0
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">MFA Enabled</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingStats ? (
                <div className="animate-pulse bg-gray-200 h-8 w-24 rounded" />
              ) : (
                `${statistics?.mfaEnabled || 0} (${statistics?.mfaEnabledPercentage || 0}%)`
              )}
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
              {isLoadingStats ? (
                <div className="animate-pulse bg-gray-200 h-8 w-24 rounded" />
              ) : (
                `${statistics?.adminMfaEnabled || 0} (${statistics?.adminMfaEnabledPercentage || 0}%)`
              )}
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
              {isLoadingStats ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded" />
              ) : (
                `${statistics ? Math.round((statistics.adminMfaEnabledPercentage + statistics.coachMfaEnabledPercentage) / 2) : 0}%`
              )}
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
                    onValueChange={value =>
                      handleSettingChange(
                        'globalRequirement',
                        value as MfaEnforcementSettings['globalRequirement']
                      )
                    }
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
                    onValueChange={value =>
                      handleSettingChange('gracePeriodDays', Number.parseInt(value, 10))
                    }
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
                    onValueChange={value =>
                      handleSettingChange('trustedDeviceExpiry', Number.parseInt(value, 10))
                    }
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
                {(Object.entries(settings.roleRequirements) as Array<[
                  RoleKey,
                  RoleRequirement
                ]>).map(([role, requirement]) => (
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
                        onValueChange={value =>
                          handleRoleRequirementChange(role, value as RoleRequirement)
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
                  <Button variant="outline" size="sm" disabled>
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fetchUserStatuses(currentPage, searchQuery, roleFilter, mfaStatusFilter)}
                    disabled={isLoadingUsers}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Monitor MFA adoption and compliance across all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={roleFilter}
                    onValueChange={value =>
                      setRoleFilter(value as 'all' | 'admin' | 'coach' | 'client')
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={mfaStatusFilter}
                    onValueChange={value =>
                      setMfaStatusFilter(value as 'all' | 'enabled' | 'disabled')
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="enabled">MFA Enabled</SelectItem>
                      <SelectItem value="disabled">MFA Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-4">
                {isLoadingUsers ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="space-y-2">
                          <div className="animate-pulse bg-gray-200 h-4 w-32 rounded" />
                          <div className="animate-pulse bg-gray-200 h-3 w-48 rounded" />
                        </div>
                        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded-full" />
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="animate-pulse bg-gray-200 h-8 w-24 rounded" />
                        <div className="animate-pulse bg-gray-200 h-8 w-20 rounded" />
                        <div className="animate-pulse bg-gray-200 h-8 w-8 rounded" />
                      </div>
                    </div>
                  ))
                ) : userStatuses.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No users found matching your criteria</p>
                  </div>
                ) : (
                  userStatuses.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
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
                          <p className="text-xs text-muted-foreground">
                            {user.backupCodesRemaining} backup codes left
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Last login</p>
                          <p className="text-sm">{new Date(user.lastLogin).toLocaleDateString()}</p>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleMfaAction(user.id, user.mfaEnabled ? 'disable' : 'enable')}
                            >
                              {user.mfaEnabled ? (
                                <>
                                  <UserX className="w-4 h-4 mr-2" />
                                  Disable MFA
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Enable MFA
                                </>
                              )}
                            </DropdownMenuItem>
                            {user.mfaEnabled && (
                              <DropdownMenuItem
                                onClick={() => handleMfaAction(user.id, 'reset')}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset MFA
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalUsers > pageSize && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1 || isLoadingUsers}
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-1 text-sm border rounded">
                      {currentPage} of {Math.ceil(totalUsers / pageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(Math.ceil(totalUsers / pageSize), currentPage + 1))}
                      disabled={currentPage >= Math.ceil(totalUsers / pageSize) || isLoadingUsers}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>MFA Adoption by Role</span>
                  {isLoadingStats && <RefreshCw className="w-4 h-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Administrators</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        {isLoadingStats ? (
                          <div className="animate-pulse bg-gray-300 h-2 rounded-full w-full" />
                        ) : (
                          <div 
                            className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${statistics?.adminMfaEnabledPercentage || 0}%` }}
                          />
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {isLoadingStats ? '...' : `${statistics?.adminMfaEnabledPercentage || 0}%`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Coaches</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        {isLoadingStats ? (
                          <div className="animate-pulse bg-gray-300 h-2 rounded-full w-full" />
                        ) : (
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${statistics?.coachMfaEnabledPercentage || 0}%` }}
                          />
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {isLoadingStats ? '...' : `${statistics?.coachMfaEnabledPercentage || 0}%`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Clients</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        {isLoadingStats ? (
                          <div className="animate-pulse bg-gray-300 h-2 rounded-full w-full" />
                        ) : (
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${statistics?.clientMfaEnabledPercentage || 0}%` }}
                          />
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {isLoadingStats ? '...' : `${statistics?.clientMfaEnabledPercentage || 0}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Security Metrics</span>
                  {isLoadingStats && <RefreshCw className="w-4 h-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Average Backup Codes Used</span>
                    <span className="font-medium">
                      {isLoadingStats ? '...' : `${statistics?.averageBackupCodesUsed || 0} / 8`}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Trusted Devices per User</span>
                    <span className="font-medium">
                      {isLoadingStats ? '...' : statistics?.avgTrustedDevicesPerUser || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>MFA Failures (30 days)</span>
                    <span className="font-medium text-orange-600">
                      {isLoadingStats ? '...' : statistics?.mfaFailures30Days || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Account Lockouts (30 days)</span>
                    <span className="font-medium text-red-600">
                      {isLoadingStats ? '...' : statistics?.accountLockouts30Days || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Users with MFA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {isLoadingStats ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded" />
                  ) : (
                    `${statistics?.mfaEnabled || 0} / ${statistics?.totalUsers || 0}`
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {isLoadingStats ? '...' : `${statistics?.mfaEnabledPercentage || 0}% of all users`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Admin Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {isLoadingStats ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded" />
                  ) : (
                    `${statistics?.adminMfaEnabledPercentage || 0}%`
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {isLoadingStats ? '...' : `${statistics?.adminMfaEnabled || 0} admins with MFA`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Security Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {isLoadingStats ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded" />
                  ) : (
                    statistics?.mfaFailures30Days || 0
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  MFA failures in 30 days
                </p>
              </CardContent>
            </Card>
          </div>

          {!isLoadingStats && statistics && (
            <Alert>
              <BarChart3 className="h-4 w-4" />
              <AlertDescription>
                {statistics.adminMfaEnabledPercentage < 90 ? (
                  `Admin MFA compliance is at ${statistics.adminMfaEnabledPercentage}%. Consider enforcing MFA for all administrator accounts to improve security.`
                ) : statistics.mfaEnabledPercentage < 50 ? (
                  `Overall MFA adoption is at ${statistics.mfaEnabledPercentage}%. Consider encouraging more users to enable MFA for better security posture.`
                ) : (
                  `MFA adoption is good at ${statistics.mfaEnabledPercentage}%. Continue monitoring and encouraging adoption across all user roles.`
                )}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
