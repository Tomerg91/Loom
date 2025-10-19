'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  TrendingUp,
  Activity,
  Shield,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Settings,
  Clock,
  UserCheck,
  DollarSign,
  Star,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { StatsCard, LoadingState, ErrorState } from '@/components/dashboard';

interface DashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    completedSessions: number;
    revenue: number;
    averageRating: number;
  };
  userAnalytics: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    newUsersThisWeek: number;
    usersByRole: {
      admin: number;
      coach: number;
      client: number;
    };
  };
  systemHealth: {
    database: {
      status: 'healthy' | 'warning' | 'error';
      connections: number;
      maxConnections: number;
    };
    server: {
      status: 'healthy' | 'warning' | 'error';
      uptime: number;
      memory: { used: number; total: number };
    };
  };
  recentActivity: Array<{
    id: string;
    type: 'user_created' | 'session_completed' | 'system_event';
    message: string;
    timestamp: string;
    user?: string;
  }>;
}

export function AdminDashboardPage() {
  const t = useTranslations('admin.dashboard');
  const router = useRouter();
  const locale = useLocale();
  const [timeRange] = useState('30d');

  const { data: dashboardData, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/dashboard?timeRange=${timeRange}`);

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      return result.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  if (isLoading) {
    return <LoadingState title={t('title')} description={t('description')} />;
  }

  if (error) {
    return <ErrorState title={t('title')} description={t('description')} message="Error loading dashboard" />;
  }

  const completionRate = dashboardData?.overview.totalSessions
    ? Math.round((dashboardData.overview.completedSessions / dashboardData.overview.totalSessions) * 100)
    : 0;

  const memoryUsage = dashboardData?.systemHealth.server.memory
    ? Math.round((dashboardData.systemHealth.server.memory.used / dashboardData.systemHealth.server.memory.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={dashboardData?.userAnalytics?.totalUsers || 0}
          icon={Users}
          trend={dashboardData?.userAnalytics?.newUsersThisMonth ? {
            value: `+${dashboardData.userAnalytics.newUsersThisMonth} this month`,
            isPositive: true,
          } : undefined}
        />
        <StatsCard
          title="Active Users"
          value={dashboardData?.userAnalytics?.activeUsers || 0}
          icon={UserCheck}
          trend={dashboardData?.userAnalytics?.newUsersThisWeek ? {
            value: `+${dashboardData.userAnalytics.newUsersThisWeek} this week`,
            isPositive: true,
          } : undefined}
        />
        <StatsCard
          title="Total Sessions"
          value={dashboardData?.overview?.totalSessions || 0}
          icon={Calendar}
        />
        <StatsCard
          title="Revenue"
          value={formatCurrency(dashboardData?.overview?.revenue || 0)}
          icon={DollarSign}
        />
      </div>

      {/* User Role Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.userAnalytics?.usersByRole?.admin || 0}</div>
            <p className="text-xs text-muted-foreground">Platform administrators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coaches</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.userAnalytics?.usersByRole?.coach || 0}</div>
            <p className="text-xs text-muted-foreground">Active coaches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.userAnalytics?.usersByRole?.client || 0}</div>
            <p className="text-xs text-muted-foreground">Registered clients</p>
          </CardContent>
        </Card>
      </div>

      {/* System Health & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>Current system status and performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Database Status */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div>{getStatusIcon(dashboardData?.systemHealth?.database?.status || 'unknown')}</div>
                <div>
                  <p className="font-medium">Database</p>
                  <p className="text-sm text-muted-foreground">
                    {dashboardData?.systemHealth?.database?.connections || 0}/{dashboardData?.systemHealth?.database?.maxConnections || 0} connections
                  </p>
                </div>
              </div>
              <Badge variant={dashboardData?.systemHealth?.database?.status === 'healthy' ? 'default' : 'destructive'}>
                {dashboardData?.systemHealth?.database?.status || 'Unknown'}
              </Badge>
            </div>

            {/* Server Status */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div>{getStatusIcon(dashboardData?.systemHealth?.server?.status || 'unknown')}</div>
                <div>
                  <p className="font-medium">Server</p>
                  <p className="text-sm text-muted-foreground">
                    Uptime: {formatUptime(dashboardData?.systemHealth?.server?.uptime || 0)}
                  </p>
                </div>
              </div>
              <Badge variant={dashboardData?.systemHealth?.server?.status === 'healthy' ? 'default' : 'destructive'}>
                Memory: {memoryUsage}%
              </Badge>
            </div>

            {/* Performance Metrics */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Session Completion</p>
                  <p className="text-sm text-muted-foreground">
                    {dashboardData?.overview?.completedSessions || 0} completed
                  </p>
                </div>
              </div>
              <Badge variant="outline">{completionRate}%</Badge>
            </div>

            {/* Platform Rating */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">Average Rating</p>
                  <p className="text-sm text-muted-foreground">Platform satisfaction</p>
                </div>
              </div>
              <Badge variant="outline">{dashboardData?.overview?.averageRating || 0}/5</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="justify-between h-auto p-4"
                onClick={() => router.push(`/${locale}/admin/users`)}
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Manage Users</p>
                    <p className="text-xs text-muted-foreground">View, edit, and manage all users</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="justify-between h-auto p-4"
                onClick={() => router.push(`/${locale}/admin/analytics`)}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">View Analytics</p>
                    <p className="text-xs text-muted-foreground">Platform metrics and insights</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="justify-between h-auto p-4"
                onClick={() => router.push(`/${locale}/admin/system`)}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">System Settings</p>
                    <p className="text-xs text-muted-foreground">Configure platform settings</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="justify-between h-auto p-4"
                onClick={() => router.push(`/${locale}/sessions`)}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">View Sessions</p>
                    <p className="text-xs text-muted-foreground">Monitor all platform sessions</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="justify-between h-auto p-4"
                onClick={() => router.push(`/${locale}/admin/mfa-health`)}
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">MFA Health Monitor</p>
                    <p className="text-xs text-muted-foreground">Track MFA source discrepancies</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform events and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="mt-0.5">
                    {activity.type === 'user_created' && <Users className="h-4 w-4 text-blue-600" />}
                    {activity.type === 'session_completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {activity.type === 'system_event' && <Activity className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.message}</p>
                    {activity.user && (
                      <p className="text-xs text-muted-foreground">{activity.user}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export as default for dynamic imports
export default AdminDashboardPage;
